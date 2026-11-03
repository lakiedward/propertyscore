import array
import csv
import datetime
import json
import math
import pathlib
import sys
import zipfile

UNREACHABLE = 65535


def read_points(path):
    with open(path, newline="", encoding="utf-8") as handle:
        return [
            {"id": row["id"], "lng": float(row["lng"]), "lat": float(row["lat"])}
            for row in csv.DictReader(handle)
        ]


def departure_at(date, clock):
    hours, minutes = (int(part) for part in clock.split(":"))
    year, month, day = (int(part) for part in date.split("-"))
    return datetime.datetime(year, month, day, hours, minutes)


def minutes_of(value):
    if value is None:
        return 0.0
    if isinstance(value, datetime.timedelta):
        return value.total_seconds() / 60
    if hasattr(value, "total_seconds"):
        return value.total_seconds() / 60
    number = float(value)
    return 0.0 if math.isnan(number) else number


def is_walk(mode):
    return str(mode).upper().endswith("WALK")


def summarize_itinerary(legs):
    walk = sum(minutes_of(leg["travel_time"]) for leg in legs if is_walk(leg["transport_mode"]))
    transit = [leg for leg in legs if not is_walk(leg["transport_mode"])]
    wait = sum(minutes_of(leg["wait_time"]) for leg in transit)
    ride = sum(minutes_of(leg["travel_time"]) for leg in transit)
    main = max(transit, key=lambda leg: minutes_of(leg["travel_time"]), default=None)
    return {
        "walk_minutes": round(walk, 1),
        "wait_minutes": round(wait, 1),
        "ride_minutes": round(ride, 1),
        "transfers": max(0, len(transit) - 1),
        "route_id": "" if main is None or main.get("route_id") is None else str(main["route_id"]),
        "total": walk + wait + ride,
    }


def best_itinerary(options):
    summaries = [summarize_itinerary(legs) for legs in options if legs]
    return min(summaries, key=lambda summary: summary["total"], default=None)


def encode_minutes(value):
    if value is None:
        return UNREACHABLE
    number = float(value)
    if math.isnan(number) or number < 0 or number >= UNREACHABLE:
        return UNREACHABLE
    return int(round(number))


def encode_matrix(order, times):
    position = {identifier: index for index, identifier in enumerate(order)}
    size = len(order)
    cells = array.array("H", [UNREACHABLE]) * (size * size)
    for origin, destination, minutes in times:
        row = position.get(origin)
        column = position.get(destination)
        if row is None or column is None:
            continue
        cells[row * size + column] = encode_minutes(minutes)
    for index in range(size):
        cells[index * size + index] = 0
    if sys.byteorder == "little":
        cells.byteswap()
    return cells.tobytes()


def prepare_gtfs(paths, output_dir):
    prepared = []
    for index, path in enumerate(paths):
        source = pathlib.Path(path)
        if source.is_dir():
            archive = output_dir / f"gtfs-{index}.zip"
            with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
                for file in sorted(source.glob("*.txt")):
                    bundle.write(file, file.name)
            prepared.append(str(archive))
        else:
            prepared.append(str(source))
    return prepared


def write_rows(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def frame(points):
    import geopandas
    import shapely

    return geopandas.GeoDataFrame(
        {"id": [point["id"] for point in points]},
        geometry=[shapely.Point(point["lng"], point["lat"]) for point in points],
        crs="EPSG:4326",
    )


def run(job):
    import r5py

    output_dir = pathlib.Path(job["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    network = r5py.TransportNetwork(job["osm_pbf"], prepare_gtfs(job["gtfs"], output_dir))
    origins = read_points(job["origins"])
    stops = read_points(job["stops"])
    destinations = read_points(job["destinations"])
    speed = job["walk_speed_kmh"]
    window_start = departure_at(job["date"], job["window_start"])
    window = datetime.timedelta(minutes=job["window_minutes"])
    max_time = datetime.timedelta(minutes=job["max_minutes"])
    transit_modes = [getattr(r5py.TransportMode, mode) for mode in job["transport_modes"]]
    transit_options = {
        "departure": window_start,
        "departure_time_window": window,
        "transport_modes": [*transit_modes, r5py.TransportMode.WALK],
        "max_time": max_time,
        "speed_walking": speed,
        "max_public_transport_rides": job["max_rides"],
    }

    walk_rows = []
    if stops:
        walk = r5py.TravelTimeMatrix(
            network,
            origins=frame(origins),
            destinations=frame(stops),
            transport_modes=[r5py.TransportMode.WALK],
            departure=window_start,
            max_time=datetime.timedelta(minutes=job["stop_walk_max_minutes"]),
            speed_walking=speed,
        )
        walk_rows = [
            (row.from_id, row.to_id, round(float(row.travel_time), 1))
            for row in walk.itertuples()
            if not math.isnan(float(row.travel_time))
        ]
    write_rows(output_dir / "walk_stops.csv", ["origin_id", "stop_id", "minutes"], walk_rows)

    destination_rows = []
    itinerary_rows = []
    if destinations:
        transit = r5py.TravelTimeMatrix(
            network,
            origins=frame(origins),
            destinations=frame(destinations),
            **transit_options,
        )
        walking = r5py.TravelTimeMatrix(
            network,
            origins=frame(origins),
            destinations=frame(destinations),
            transport_modes=[r5py.TransportMode.WALK],
            departure=window_start,
            max_time=max_time,
            speed_walking=speed,
        )
        walk_minutes = {
            (row.from_id, row.to_id): float(row.travel_time) for row in walking.itertuples()
        }
        for row in transit.itertuples():
            walked = walk_minutes.get((row.from_id, row.to_id), math.nan)
            destination_rows.append(
                (
                    row.from_id,
                    row.to_id,
                    "" if math.isnan(float(row.travel_time)) else round(float(row.travel_time), 1),
                    "" if math.isnan(walked) else round(walked, 1),
                )
            )
        detailed = r5py.DetailedItineraries(
            network,
            origins=frame(origins),
            destinations=frame(destinations),
            departure=departure_at(job["date"], job["detail_departure"]),
            transport_modes=[*transit_modes, r5py.TransportMode.WALK],
            max_time=max_time,
            speed_walking=speed,
            max_public_transport_rides=job["max_rides"],
            force_all_to_all=True,
        )
        options = {}
        for row in detailed.itertuples():
            if row.transport_mode is None:
                continue
            key = (row.from_id, row.to_id)
            options.setdefault(key, {}).setdefault(row.option, []).append(
                {
                    "transport_mode": row.transport_mode,
                    "travel_time": row.travel_time,
                    "wait_time": row.wait_time,
                    "route_id": row.route_id,
                }
            )
        for (origin, destination), by_option in options.items():
            summary = best_itinerary(by_option.values())
            if summary is None:
                continue
            itinerary_rows.append(
                (
                    origin,
                    destination,
                    summary["walk_minutes"],
                    summary["wait_minutes"],
                    summary["ride_minutes"],
                    summary["transfers"],
                    summary["route_id"],
                )
            )
    write_rows(
        output_dir / "destinations.csv",
        ["origin_id", "destination_id", "transit_minutes", "walk_minutes"],
        destination_rows,
    )
    write_rows(
        output_dir / "itineraries.csv",
        [
            "origin_id",
            "destination_id",
            "walk_minutes",
            "wait_minutes",
            "ride_minutes",
            "transfers",
            "route_id",
        ],
        itinerary_rows,
    )

    if job["matrix"]:
        matrix = r5py.TravelTimeMatrix(network, origins=frame(origins), **transit_options)
        order = [point["id"] for point in origins]
        times = ((row.from_id, row.to_id, row.travel_time) for row in matrix.itertuples())
        (output_dir / "matrix.bin").write_bytes(encode_matrix(order, times))


def main(arguments):
    if len(arguments) != 2:
        print("usage: route.py <job.json>", file=sys.stderr)
        return 2
    with open(arguments[1], encoding="utf-8") as handle:
        job = json.load(handle)
    sys.argv = [arguments[0], *job.get("r5py_arguments", [])]
    run(job)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
