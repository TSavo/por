/** New Phlan harbor, piers, pilings and city gates. Passed as per-area config. */
export const phlanHarborLayout: {
  id: "phlan";
  ground: { x0: number; z0: number; x1: number; z1: number; height: number; tile: number; shade: number };
  water: { x0: number; z0: number; x1: number; z1: number; y: number; tile: number; shade: number };
  seawall: { x: number; z0: number; z1: number; y0: number; y1: number; tile: number; shade: number };
  piers: { zs: number[]; x0: number; x1: number; height: number; tile: number; shade: number; edgeY: number; edgeTile: number };
  pilings: {
    xs: number[];
    radius: number;
    bottom: number;
    top: number;
    tile: number;
    nsShade: number;
    ewShade: number;
  };
  skipWall: { type: number; minX: number; maxZExclusive: number };
  gates: {
    type: number;
    axes: number[];
    height: number;
    openingHalf: number;
    openingTop: number;
    jambTile: number;
    recess: number;
  };
};
