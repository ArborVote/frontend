import { useEffect, useState } from 'react';
import { actionErrorMessage } from '../data/actions';
import type { AccountPosition } from '../types';

/**
 * A finished-debate banner: one click redeems the account's shares across every
 * argument it still holds a position in. The argumentIds come from the indexer
 * (chain fallback), so the whole set is redeemed in a single transaction.
 *
 * Shown only when the account holds shares in more than one argument - with zero
 * or one, the per-argument PositionPanel already covers redeeming.
 */
export function RedeemAllPanel({
  loadPositions,
  onRedeemAll,
}: {
  loadPositions: () => Promise<AccountPosition[]>;
  onRedeemAll: (argumentIds: number[]) => Promise<void>;
}) {
  const [held, setHeld] = useState<AccountPosition[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHeld(null);
    loadPositions()
      .then((positions) => {
        if (!cancelled) {
          setHeld(positions.filter((position) => position.proShares > 0 || position.conShares > 0));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(actionErrorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [loadPositions]);

  if (!held || held.length < 2) {
    return null;
  }

  const redeemAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRedeemAll(held.map((position) => position.argumentId));
    } catch (cause) {
      setError(actionErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="redeem-all">
      <span className="action-hint">
        You hold shares in <strong className="mono">{held.length}</strong> arguments.
      </span>
      <button type="button" className="btn btn-solid" onClick={redeemAll} disabled={busy}>
        {busy ? 'Redeeming…' : 'Redeem all shares'}
      </button>
      {error && <p className="action-error">{error}</p>}
    </div>
  );
}
