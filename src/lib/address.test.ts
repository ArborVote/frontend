import { describe, expect, test } from 'bun:test';
import { IDENTICON_SIZE, identiconOf, shortAddress } from './address';

const ADDRESS = '0x41612A36e1eB8f74e041c4fEa382a26bd17b55a9';

describe('shortAddress', () => {
  test('truncates to the ecosystem-standard 0x1234…abcd form', () => {
    expect(shortAddress(ADDRESS)).toBe('0x4161…55a9');
  });
});

describe('identiconOf', () => {
  test('is deterministic and case-insensitive - one account, one icon, everywhere', () => {
    const icon = identiconOf(ADDRESS);
    expect(identiconOf(ADDRESS)).toEqual(icon);
    expect(identiconOf(ADDRESS.toLowerCase())).toEqual(icon);
  });

  test('differs between accounts', () => {
    const other = identiconOf('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(other.cells).not.toEqual(identiconOf(ADDRESS).cells);
  });

  test('is a full mirrored grid of background, color, and spot cells', () => {
    const { cells } = identiconOf(ADDRESS);
    expect(cells).toHaveLength(IDENTICON_SIZE * IDENTICON_SIZE);
    expect(cells.every((cell) => cell === 0 || cell === 1 || cell === 2)).toBe(true);
    for (let row = 0; row < IDENTICON_SIZE; row++) {
      const cellsOfRow = cells.slice(row * IDENTICON_SIZE, (row + 1) * IDENTICON_SIZE);
      expect(cellsOfRow).toEqual(cellsOfRow.slice().reverse());
    }
  });
});
