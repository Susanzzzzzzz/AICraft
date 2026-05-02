// DDA voxel raycast — Amanatides & Woo algorithm
// Returns { hit, position, normal }

export function raycast(origin, direction, getBlock, maxDist = 8) {
  const ox = origin[0], oy = origin[1], oz = origin[2];
  const dx = direction[0], dy = direction[1], dz = direction[2];

  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

  let tMaxX = dx !== 0 ? ((dx > 0 ? (x + 1 - ox) : (ox - x)) * tDeltaX) : Infinity;
  let tMaxY = dy !== 0 ? ((dy > 0 ? (y + 1 - oy) : (oy - y)) * tDeltaY) : Infinity;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? (z + 1 - oz) : (oz - z)) * tDeltaZ) : Infinity;

  let nx = 0, ny = 0, nz = 0;
  let t = 0;

  for (let i = 0; i < maxDist * 3; i++) {
    const block = getBlock(x, y, z);
    if (block !== 0) {
      return {
        hit: true,
        position: [x, y, z],
        normal: [nx, ny, nz],
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        t = tMaxX;
        if (t > maxDist) break;
        x += stepX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else {
        t = tMaxZ;
        if (t > maxDist) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        t = tMaxY;
        if (t > maxDist) break;
        y += stepY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        t = tMaxZ;
        if (t > maxDist) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }
  }

  return { hit: false, position: null, normal: null };
}
