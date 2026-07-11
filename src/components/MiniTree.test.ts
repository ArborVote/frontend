import { describe, expect, test } from 'bun:test';
import { climateDebate } from '../data/climateDebate';
import { miniTreeRows } from './MiniTree';

const ids = (rows: ReturnType<typeof miniTreeRows>) => rows.map((row) => row.map((node) => node.id));

describe('miniTreeRows', () => {
  test('focused thesis shows the thesis and its children, pros before cons', () => {
    expect(ids(miniTreeRows(climateDebate, 0))).toEqual([[0], [1, 2, 3, 4, 5, 6, 7, 8]]);
  });

  test('drilling down expands the focused branch by one row', () => {
    expect(ids(miniTreeRows(climateDebate, 7))).toEqual([
      [0],
      [1, 2, 3, 4, 5, 6, 7, 8],
      [19, 20],
    ]);
  });

  test('a leaf ends the map - climbing back up collapses its row again', () => {
    expect(ids(miniTreeRows(climateDebate, 19))).toEqual([
      [0],
      [1, 2, 3, 4, 5, 6, 7, 8],
      [19, 20],
    ]);
    expect(ids(miniTreeRows(climateDebate, 0))).toHaveLength(2);
  });
});
