import type { ArgumentNode, Debate } from '../types';
import { childrenOf, thesisOf } from '../types';

/**
 * A client-side mirror of the on-chain tally, computable at any time: an
 * argument's blended rating is half its own approval and half its descendants'
 * aggregate, and what it adds to its parent is that blend, signed by its stance
 * and weighted by its share of the sibling stake. Draft (unfinalized) arguments
 * carry weight but contribute nothing, exactly like the tally treats them.
 *
 * Values are fractions of a full approval, so they live in -1..1. During the
 * rating this is a live preview; after the tally it mirrors the final result.
 */
export function impactsOf(debate: Debate): Map<number, number> {
  const impacts = new Map<number, number>();

  const descendantsImpact = (node: ArgumentNode): number => {
    const children = [...childrenOf(debate, node.id, 'pro'), ...childrenOf(debate, node.id, 'con')];
    const siblingStake = children.reduce((sum, child) => sum + child.weight, 0);
    let aggregate = 0;
    for (const child of children) {
      const blended = 0.5 * child.approval + 0.5 * descendantsImpact(child);
      const contribution =
        child.state === 'created' || siblingStake === 0
          ? 0
          : (child.side === 'con' ? -blended : blended) * (child.weight / siblingStake);
      impacts.set(child.id, contribution);
      aggregate += contribution;
    }
    return aggregate;
  };

  const thesis = thesisOf(debate);
  impacts.set(thesis.id, descendantsImpact(thesis));
  return impacts;
}

/** The tooltip explaining an argument's impact figure, shared by every place it appears. */
export const IMPACT_HINT =
  "How much this argument sways its parent's rating in the tally: its own rating blended " +
  'with what its sub-arguments add, weighted by its share of the stake among its siblings. ' +
  'Green sways the parent up, red down.';

/** The tooltip explaining the thesis' net impact figure. */
export const NET_IMPACT_HINT =
  "The sum of the top-level arguments' sways: above zero the thesis is confirmed, below it is objected.";

/** Formats an impact fraction as a signed percentage, e.g. "+12%". */
export function formatImpact(impact: number): string {
  const percent = Math.round(impact * 100);
  return percent > 0 ? `+${percent}%` : percent < 0 ? `−${Math.abs(percent)}%` : '±0%';
}
