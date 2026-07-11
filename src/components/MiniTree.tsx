import type { ArgumentNode, Debate } from '../types';
import { ancestryOf, childrenOf, thesisOf } from '../types';

/**
 * Emphasis tiers of the mini tree-view: the focused argument and its ancestry are
 * filled, the focus's own children (the ones shown in the columns) are outlined at
 * full strength, and everything else fades - the same rule at every level.
 */
export type MiniTreeEmphasis = 'focus' | 'path' | 'context' | 'faded';

export function miniTreeEmphasis(debate: Debate, focusedId: number): Map<number, MiniTreeEmphasis> {
  const emphasis = new Map<number, MiniTreeEmphasis>(debate.nodes.map((node) => [node.id, 'faded']));
  for (const child of allChildrenOf(debate, focusedId)) {
    emphasis.set(child.id, 'context');
  }
  for (const pathNode of ancestryOf(debate, focusedId)) {
    emphasis.set(pathNode.id, 'path');
  }
  emphasis.set(focusedId, 'focus');
  return emphasis;
}

export interface MiniTreePlacement {
  node: ArgumentNode;
  depth: number;
  /** Horizontal position in slot units; leaves take whole slots, parents sit between. */
  slot: number;
}

/** Children in column order: pros before cons. */
function allChildrenOf(debate: Debate, id: number): ArgumentNode[] {
  return [...childrenOf(debate, id, 'pro'), ...childrenOf(debate, id, 'con')];
}

/**
 * A tidy layout of the whole debate tree: leaves occupy consecutive slots,
 * every parent is centered over its children's span.
 */
export function miniTreeLayout(debate: Debate): MiniTreePlacement[] {
  const placements: MiniTreePlacement[] = [];
  let nextLeafSlot = 0;

  const place = (node: ArgumentNode, depth: number): number => {
    const children = allChildrenOf(debate, node.id);
    let slot: number;
    if (children.length === 0) {
      slot = nextLeafSlot++;
    } else {
      const childSlots = children.map((child) => place(child, depth + 1));
      slot = (childSlots[0] + childSlots[childSlots.length - 1]) / 2;
    }
    placements.push({ node, depth, slot });
    return slot;
  };

  place(thesisOf(debate), 0);
  return placements;
}

const NODE_W = 22;
const NODE_H = 12;
const H_GAP = 6;
const V_GAP = 16;
const PAD = 2;

function fillOf(node: ArgumentNode): string {
  if (node.side === null) return 'var(--ink)';
  return node.side === 'pro' ? 'var(--pro)' : 'var(--con)';
}

/** A kialo-style overview map of the whole debate, emphasized around the focused argument. */
export function MiniTree({
  debate,
  focusedId,
  onFocus,
}: {
  debate: Debate;
  focusedId: number;
  onFocus: (id: number) => void;
}) {
  if (debate.nodes.length < 2) return null;

  const placements = miniTreeLayout(debate);
  const emphasis = miniTreeEmphasis(debate, focusedId);

  const maxSlot = Math.max(...placements.map(({ slot }) => slot));
  const maxDepth = Math.max(...placements.map(({ depth }) => depth));
  const width = 2 * PAD + maxSlot * (NODE_W + H_GAP) + NODE_W;
  const height = 2 * PAD + (maxDepth + 1) * (NODE_H + V_GAP) - V_GAP;

  const positions = new Map(
    placements.map(({ node, depth, slot }) => [
      node.id,
      { x: PAD + slot * (NODE_W + H_GAP), y: PAD + depth * (NODE_H + V_GAP) },
    ]),
  );

  // An edge inherits its child's tier; along the ancestry path it darkens and
  // thickens in the step's polarity color, mirroring the ancestry rail.
  const connectors = placements
    .filter(({ node }) => node.parentId !== null)
    .map(({ node }) => {
      const from = positions.get(node.parentId as number)!;
      const to = positions.get(node.id)!;
      const fromX = from.x + NODE_W / 2;
      const fromY = from.y + NODE_H;
      const toX = to.x + NODE_W / 2;
      const tier = emphasis.get(node.id)!;
      return {
        id: node.id,
        onPath: tier === 'focus' || tier === 'path',
        faded: tier === 'faded',
        color: fillOf(node),
        d: `M ${fromX} ${fromY} C ${fromX} ${fromY + V_GAP / 2}, ${toX} ${to.y - V_GAP / 2}, ${toX} ${to.y}`,
      };
    });

  return (
    <div className="minitree-wrap">
      <svg
        className="minitree"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="navigation"
        aria-label="Debate overview map"
      >
        {connectors.map((connector) => (
          <path
            key={connector.id}
            className={`minitree-edge ${connector.onPath ? 'minitree-edge-path' : ''} ${
              connector.faded ? 'minitree-faded' : ''
            }`}
            style={connector.onPath ? { stroke: connector.color } : undefined}
            d={connector.d}
          />
        ))}
        {placements.map(({ node }) => {
          const { x, y } = positions.get(node.id)!;
          const tier = emphasis.get(node.id)!;
          const onPath = tier === 'focus' || tier === 'path';
          return (
            <rect
              key={node.id}
              className={`minitree-node ${tier === 'focus' ? 'minitree-focus' : ''} ${
                tier === 'faded' ? 'minitree-faded' : ''
              }`}
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx={3}
              style={onPath ? { fill: fillOf(node) } : { fill: 'var(--card)', stroke: fillOf(node) }}
              role="link"
              tabIndex={0}
              aria-label={node.text}
              onClick={() => onFocus(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onFocus(node.id);
              }}
            >
              <title>{node.text}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
