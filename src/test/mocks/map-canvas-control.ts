type StubTilePin = {
  id: string;
  position: [number, number];
  price: number;
  currency: string;
};

export const mapCanvasStubControl: { shouldFail: boolean; tilePins: StubTilePin[] } = {
  shouldFail: false,
  tilePins: [],
};
