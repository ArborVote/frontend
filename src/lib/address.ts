/** Address display helpers: the one truncation used everywhere, and the identicon pattern. */

/**
 * Shortens an address to the canonical `0x1234…abcd` form - one style across the whole app,
 * matching the ecosystem convention (Etherscan and the wallets print four hex either side).
 */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** A deterministic blockies-style identicon: an 8x8 mirrored pattern with three seeded colors. */
export interface Identicon {
  /** Cell values row by row: 0 background, 1 color, 2 spot color. */
  cells: number[];
  color: string;
  bgColor: string;
  spotColor: string;
}

export const IDENTICON_SIZE = 8;

/**
 * Derives the identicon from the address alone (case-insensitive), so the same account renders
 * the same icon everywhere and forever. The generator is the classic blockies scheme: a xorshift
 * PRNG seeded from the address drives three HSL colors and a horizontally mirrored cell pattern.
 */
export function identiconOf(address: string): Identicon {
  const seed = new Int32Array(4);
  const lower = address.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    seed[i % 4] = (seed[i % 4] << 5) - seed[i % 4] + lower.charCodeAt(i);
  }

  const rand = (): number => {
    const t = seed[0] ^ (seed[0] << 11);
    seed[0] = seed[1];
    seed[1] = seed[2];
    seed[2] = seed[3];
    seed[3] = seed[3] ^ (seed[3] >> 19) ^ t ^ (t >> 8);
    return (seed[3] >>> 0) / 0x80000000;
  };

  const color = (): string => {
    const hue = Math.floor(rand() * 360) % 360;
    const saturation = 45 + Math.floor(rand() * 25);
    const lightness = 35 + Math.floor(rand() * 35);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  };

  const mainColor = color();
  const bgColor = color();
  const spotColor = color();

  const cells: number[] = [];
  for (let row = 0; row < IDENTICON_SIZE; row++) {
    // The left half is random; the right half mirrors it - the symmetry is what makes it a face.
    const half = Array.from({ length: IDENTICON_SIZE / 2 }, () => Math.floor(rand() * 2.3));
    cells.push(...half, ...half.slice().reverse());
  }

  return { cells, color: mainColor, bgColor, spotColor };
}
