import type { TrustKind } from '@/components/trust/trust.utils';
import type { ListingVerification } from './listing.types';

export function toTrustKind(verification: ListingVerification): TrustKind {
  if (verification === 'smartcheck') {
    return 'online';
  }
  return verification;
}

const EWKB_SRID_FLAG = 0x20000000;
const EWKB_POINT_TYPE = 1;

export function parseEwkbPoint(hex: string): [number, number] | null {
  if (!/^[0-9a-fA-F]+$/u.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  if (bytes.length < 21) {
    return null;
  }
  const isLittleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, isLittleEndian);
  if ((type & 0xff) !== EWKB_POINT_TYPE) {
    return null;
  }
  const offset = type & EWKB_SRID_FLAG ? 9 : 5;
  if (bytes.length < offset + 16) {
    return null;
  }
  return [view.getFloat64(offset, isLittleEndian), view.getFloat64(offset + 8, isLittleEndian)];
}
