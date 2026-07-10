export type Side = 'pro' | 'con';

export type Phase = 'editing' | 'rating' | 'tallying' | 'tallied';

/** A node of the debate tree. The thesis is the node with `parentId: null`. */
export interface ArgumentNode {
  id: number;
  parentId: number | null;
  /** Whether this argument supports or attacks its parent. `null` for the thesis. */
  side: Side | null;
  text: string;
  /** The argument market's current pro share, 0..1. */
  approval: number;
  /** Vote tokens invested in this argument's market. */
  weight: number;
}

export interface Debate {
  id: number;
  phase: Phase;
  nodes: ArgumentNode[];
}

export function thesisOf(debate: Debate): ArgumentNode {
  const thesis = debate.nodes.find((n) => n.parentId === null);
  if (!thesis) throw new Error(`Debate ${debate.id} has no thesis`);
  return thesis;
}

export function childrenOf(debate: Debate, id: number, side: Side): ArgumentNode[] {
  return debate.nodes.filter((n) => n.parentId === id && n.side === side);
}

/** Path from the thesis down to (and including) the given node. */
export function ancestryOf(debate: Debate, id: number): ArgumentNode[] {
  const byId = new Map(debate.nodes.map((n) => [n.id, n]));
  const path: ArgumentNode[] = [];
  let current = byId.get(id);
  while (current) {
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}

export const PHASE_LABEL: Record<Phase, string> = {
  editing: 'Editing phase',
  rating: 'Rating phase',
  tallying: 'Tallying phase',
  tallied: 'Tallied',
};
