import datetime
import math
import pathlib
import tempfile
import unittest
import zipfile

import route


class SummarizeItineraryTest(unittest.TestCase):
    def test_splits_walking_waiting_and_riding(self):
        legs = [
            {"transport_mode": "WALK", "travel_time": datetime.timedelta(minutes=3), "wait_time": None, "route_id": None},
            {"transport_mode": "TRAM", "travel_time": datetime.timedelta(minutes=9), "wait_time": datetime.timedelta(minutes=4), "route_id": "1"},
            {"transport_mode": "BUS", "travel_time": datetime.timedelta(minutes=5), "wait_time": datetime.timedelta(minutes=2), "route_id": "33"},
            {"transport_mode": "TransportMode.WALK", "travel_time": datetime.timedelta(minutes=2), "wait_time": None, "route_id": None},
        ]
        summary = route.summarize_itinerary(legs)
        self.assertEqual(summary["walk_minutes"], 5.0)
        self.assertEqual(summary["wait_minutes"], 6.0)
        self.assertEqual(summary["ride_minutes"], 14.0)
        self.assertEqual(summary["transfers"], 1)
        self.assertEqual(summary["route_id"], "1")

    def test_walking_only_has_no_route(self):
        summary = route.summarize_itinerary(
            [{"transport_mode": "WALK", "travel_time": datetime.timedelta(minutes=7), "wait_time": None, "route_id": None}]
        )
        self.assertEqual((summary["transfers"], summary["route_id"]), (0, ""))

    def test_best_itinerary_is_the_shortest_option(self):
        slow = [{"transport_mode": "WALK", "travel_time": datetime.timedelta(minutes=30), "wait_time": None, "route_id": None}]
        fast = [{"transport_mode": "TRAM", "travel_time": datetime.timedelta(minutes=10), "wait_time": datetime.timedelta(minutes=5), "route_id": "8"}]
        self.assertEqual(route.best_itinerary([slow, fast])["route_id"], "8")
        self.assertIsNone(route.best_itinerary([]))


class EncodeMatrixTest(unittest.TestCase):
    def test_writes_big_endian_minutes_in_origin_order(self):
        data = route.encode_matrix(
            ["a", "b"],
            [("a", "b", 17.4), ("b", "a", math.nan), ("a", "zzz", 3)],
        )
        values = [int.from_bytes(data[index : index + 2], "big") for index in range(0, len(data), 2)]
        self.assertEqual(values, [0, 17, route.UNREACHABLE, 0])

    def test_rejects_out_of_range_minutes(self):
        self.assertEqual(route.encode_minutes(None), route.UNREACHABLE)
        self.assertEqual(route.encode_minutes(-1), route.UNREACHABLE)
        self.assertEqual(route.encode_minutes(70000), route.UNREACHABLE)


class PrepareGtfsTest(unittest.TestCase):
    def test_bundles_a_directory_and_an_archive_without_empty_tables(self):
        with tempfile.TemporaryDirectory() as folder:
            base = pathlib.Path(folder)
            feed = base / "feed"
            feed.mkdir()
            (feed / "stops.txt").write_text("stop_id\ns1\n", encoding="utf-8")
            (feed / "frequencies.txt").write_text("trip_id,start_time\n", encoding="utf-8")
            official = base / "official.zip"
            with zipfile.ZipFile(official, "w") as source:
                source.writestr("routes.txt", "route_id\nr1\n")
                source.writestr("frequencies.txt", "trip_id,start_time\n\n")
            prepared = route.prepare_gtfs([str(feed), str(official)], base)
            self.assertEqual(prepared, [str(base / "gtfs-0.zip"), str(base / "gtfs-1.zip")])
            with zipfile.ZipFile(prepared[0]) as bundle:
                self.assertEqual(bundle.namelist(), ["stops.txt"])
            with zipfile.ZipFile(prepared[1]) as bundle:
                self.assertEqual(bundle.namelist(), ["routes.txt"])
                self.assertEqual(bundle.read("routes.txt"), b"route_id\nr1\n")


class DepartureTest(unittest.TestCase):
    def test_combines_the_reference_date_and_clock(self):
        self.assertEqual(route.departure_at("2026-11-03", "07:45"), datetime.datetime(2026, 11, 3, 7, 45))


if __name__ == "__main__":
    unittest.main()
