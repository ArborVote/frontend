import { describe, expect, test } from 'bun:test';
import { climateDebate } from '../data/climateDebate';
import { childrenOf } from '../types';
import { miniTreeEmphasis, miniTreeLayout } from './MiniTree';

describe('miniTreeLayout', () => {
  const placements = miniTreeLayout(climateDebate);
  const byId = new Map(placements.map((placement) => [placement.node.id, placement]));

  test('places every node exactly once, one level below its parent', () => {
    expect(placements).toHaveLength(climateDebate.nodes.length);
    for (const { node, depth } of placements) {
      if (node.parentId !== null) {
        expect(depth).toBe(byId.get(node.parentId)!.depth + 1);
      }
    }
  });

  test('gives each leaf its own consecutive slot', () => {
    const leafSlots = placements
      .filter(({ node }) => climateDebate.nodes.every((other) => other.parentId !== node.id))
      .map(({ slot }) => slot)
      .sort((a, b) => a - b);
    expect(leafSlots).toEqual(leafSlots.map((_, index) => index));
  });

  test('centers every parent over its children, pros before cons', () => {
    for (const { node, slot } of placements) {
      const pros = childrenOf(climateDebate, node.id, 'pro').map((child) => byId.get(child.id)!.slot);
      const cons = childrenOf(climateDebate, node.id, 'con').map((child) => byId.get(child.id)!.slot);
      const childSlots = [...pros, ...cons];
      if (childSlots.length === 0) continue;
      expect(slot).toBe((childSlots[0] + childSlots[childSlots.length - 1]) / 2);
      expect(Math.max(...pros, -Infinity)).toBeLessThan(Math.min(...cons, Infinity));
    }
  });
});

describe('miniTreeEmphasis', () => {
  test('fills the path, outlines its immediate context, fades all other subtrees', () => {
    // Focus con #7 ("innovation"): thesis and 7 are the path, the thesis's other
    // children and 7's children are context, deeper strangers like 9 (child of 1) fade.
    const emphasis = miniTreeEmphasis(climateDebate, 7);
    expect(emphasis.get(7)).toBe('focus');
    expect(emphasis.get(0)).toBe('path');
    expect(emphasis.get(1)).toBe('context');
    expect(emphasis.get(8)).toBe('context');
    expect(emphasis.get(19)).toBe('context'); // child of the focus
    expect(emphasis.get(9)).toBe('faded'); // child of sibling 1
    expect(emphasis.get(21)).toBe('faded'); // child of sibling 8
  });

  test('classifies every node of the debate', () => {
    const emphasis = miniTreeEmphasis(climateDebate, 0);
    expect(emphasis.size).toBe(climateDebate.nodes.length);
    expect(emphasis.get(0)).toBe('focus');
    for (const child of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(emphasis.get(child)).toBe('context');
    }
    expect(emphasis.get(12)).toBe('faded'); // grandchild of the thesis
  });
});
