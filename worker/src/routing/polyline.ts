const POLYLINE_PRECISION = 1e6;

export function decodePolyline6(encoded: string): [number, number][] {
  const positions: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const readValue = (): number | null => {
    let result = 0;
    for (let shift = 0; shift <= 25 && index < encoded.length; shift += 5) {
      const byte = encoded.charCodeAt(index) - 63;
      index += 1;
      if (byte < 0 || byte > 63) return null;
      result |= (byte & 0x1f) << shift;
      if (byte < 0x20) return result & 1 ? ~(result >> 1) : result >> 1;
    }
    return null;
  };
  while (index < encoded.length) {
    const latDelta = readValue();
    const lngDelta = readValue();
    if (latDelta === null || lngDelta === null) return [];
    latitude += latDelta;
    longitude += lngDelta;
    const lng = longitude / POLYLINE_PRECISION;
    const lat = latitude / POLYLINE_PRECISION;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return [];
    positions.push([lng, lat]);
  }
  return positions;
}
