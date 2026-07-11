import type { ArgumentNode, Debate } from '../types';
import { ancestryOf, childrenOf } from '../types';

/**
 * The rows of the mini tree-view: the thesis, then one row per step of the
 * ancestry path holding all children of the ancestor above it (pros before
 * cons, like the columns), and finally the focused argument's own children.
 * Rows outside the ancestry path stay collapsed, so the map grows and shrinks
 * as the reader drills down or climbs back up.
 */
export function miniTreeRows(debate: Debate, focusedId: number): ArgumentNode[][] {
  const path = ancestryOf(debate, focusedId);
  const childrenRow = (parentId: number) => [
    ...childrenOf(debate, parentId, 'pro'),
    ...childrenOf(debate, parentId, 'con'),
  ];

  const rows = [[path[0]], ...path.slice(1).map((_, i) => childrenRow(path[i].id))];
  const focusChildren = childrenRow(focusedId);
  if (focusChildren.length > 0) rows.push(focusChildren);
  return rows;
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

/** A kialo-style overview map of the debate around the focused argument. */
export function MiniTree({
  debate,
  focusedId,
  onFocus,
}: {
  debate: Debate;
  focusedId: number;
  onFocus: (id: number) => void;
}) {
  const rows = miniTreeRows(debate, focusedId);
  if (rows.length < 2) return null;

  const onPath = new Set(ancestryOf(debate, focusedId).map((node) => node.id));
  const width = 2 * PAD + Math.max(...rows.map((row) => row.length * (NODE_W + H_GAP) - H_GAP));
  const height = 2 * PAD + rows.length * (NODE_H + V_GAP) - V_GAP;

  const positions = new Map<number, { x: number; y: number }>();
  rows.forEach((row, rowIndex) => {
    const rowWidth = row.length * (NODE_W + H_GAP) - H_GAP;
    row.forEach((node, columnIndex) => {
      positions.set(node.id, {
        x: (width - rowWidth) / 2 + columnIndex * (NODE_W + H_GAP),
        y: PAD + rowIndex * (NODE_H + V_GAP),
      });
    });
  });

  // Every node in a row is a child of the single path node in the row above.
  const connectors = rows.slice(1).flatMap((row, rowIndex) => {
    const parent = positions.get(rows[rowIndex].find((node) => onPath.has(node.id))!.id)!;
    const fromX = parent.x + NODE_W / 2;
    const fromY = parent.y + NODE_H;
    return row.map((node) => {
      const { x, y } = positions.get(node.id)!;
      const toX = x + NODE_W / 2;
      return {
        id: node.id,
        d: `M ${fromX} ${fromY} C ${fromX} ${fromY + V_GAP / 2}, ${toX} ${y - V_GAP / 2}, ${toX} ${y}`,
      };
    });
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
          <path key={connector.id} className="minitree-edge" d={connector.d} />
        ))}
        {rows.flat().map((node) => {
          const { x, y } = positions.get(node.id)!;
          return (
            <rect
              key={node.id}
              className={`minitree-node ${node.id === focusedId ? 'minitree-focus' : ''}`}
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx={3}
              style={
                onPath.has(node.id)
                  ? { fill: fillOf(node) }
                  : { fill: 'var(--card)', stroke: fillOf(node) }
              }
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
