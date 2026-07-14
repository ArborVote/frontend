import { MAX_CONTENT_CHARS } from '../lib/ipfs';

/** The character budget for authored texts, always visible while composing. */
export function CharBudget({ length }: { length: number }) {
  return (
    <span className="char-budget mono">
      {length}/{MAX_CONTENT_CHARS}
    </span>
  );
}
