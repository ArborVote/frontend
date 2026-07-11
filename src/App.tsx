import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowseView } from './components/BrowseView';
import { DebateView, type DebateTx } from './components/DebateView';
import { PhaseClock } from './components/PhaseClock';
import { WalletMenu } from './components/WalletMenu';
import {
  actionErrorMessage,
  connectDebateActions,
  type DebateActions,
  type UserState,
} from './data/actions';
import { contractConfig } from './data/config';
import { defaultSource } from './data/source';
import { useNow } from './lib/time';
import type { Debate, DebateSummary, Phase } from './types';
import { availablePhasePoke, PHASE_LABEL } from './types';
import { useWallet } from './wallet/useWallet';

const source = defaultSource();
const config = contractConfig();

const POKE_LABEL: Record<Phase, string> = {
  editing: 'Start editing',
  rating: 'Start rating',
  tallying: 'Start tallying',
  finished: 'Tally the debate',
};

/** `#/debate/N` opens a debate; anything else is the browse home. */
function routeFromHash(): number | null {
  const match = /^#\/debate\/(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

export default function App() {
  const [debateId, setDebateId] = useState<number | null>(routeFromHash);
  const [debate, setDebate] = useState<Debate | null>(null);
  const [debates, setDebates] = useState<DebateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const wallet = useWallet();
  const now = useNow();

  useEffect(() => {
    const onHashChange = () => setDebateId(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const openDebate = (id: number) => {
    window.location.hash = `#/debate/${id}`;
  };

  // The action layer exists once a wallet is connected against an on-chain deployment.
  const [actions, setActions] = useState<DebateActions | null>(null);
  useEffect(() => {
    if (!config || !wallet.account || !wallet.provider) {
      setActions(null);
      return;
    }
    let cancelled = false;
    connectDebateActions(config, wallet.provider, wallet.account)
      .then((connected) => {
        if (!cancelled) setActions(connected);
      })
      .catch(() => setActions(null));
    return () => {
      cancelled = true;
    };
  }, [wallet.account, wallet.provider]);

  // Reloads are awaited by the actions, so their buttons stay busy until the
  // view is fresh - releasing on the transaction receipt alone would leave a
  // window where a stale gate invites a doomed second submission. They are
  // also sequenced: a slow response must never overwrite a newer one.
  const actionsRef = useRef<DebateActions | null>(null);
  const loadSeq = useRef(0);
  const refresh = useCallback(async () => {
    const seq = ++loadSeq.current;

    if (debateId === null) {
      try {
        const list = await source.list();
        if (seq !== loadSeq.current) return;
        setDebates(list);
        setError(null);
      } catch (cause) {
        if (seq !== loadSeq.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
      return;
    }

    const connected = actionsRef.current;
    const [debateResult, stateResult] = await Promise.allSettled([
      source.load(debateId),
      connected ? connected.userState(debateId) : Promise.resolve(null),
    ]);
    if (seq !== loadSeq.current) return;
    if (debateResult.status === 'fulfilled') {
      setDebate(debateResult.value);
      setError(null);
    } else {
      const cause = debateResult.reason as unknown;
      setError(cause instanceof Error ? cause.message : String(cause));
    }
    setUserState(stateResult.status === 'fulfilled' ? stateResult.value : null);
  }, [debateId]);

  // Route changes drop the previous view's data before the fresh load lands.
  useEffect(() => {
    setDebate(null);
    setUserState(null);
    setError(null);
  }, [debateId]);

  useEffect(() => {
    actionsRef.current = actions;
    void refresh();
  }, [actions, refresh]);

  // Poll on-chain state so other participants' moves and newly opened
  // time gates (phase pokes, finalizable drafts) show up on their own.
  useEffect(() => {
    if (!config) return;
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const join = async () => {
    if (!actions || debateId === null) return;
    setJoining(true);
    setJoinError(null);
    try {
      await actions.join(debateId);
      await refresh();
    } catch (cause) {
      setJoinError(actionErrorMessage(cause));
    } finally {
      setJoining(false);
    }
  };

  const joinable =
    actions !== null &&
    userState !== null &&
    !userState.joined &&
    (debate?.phase === 'editing' || debate?.phase === 'rating');

  // The phase poke is permissionless - any connected account can push the debate along.
  // The ticking clock opens the gate live, without waiting for the next poll.
  const poke = actions !== null && debate ? availablePhasePoke(debate, now) : null;
  const [poking, setPoking] = useState(false);
  const [pokeError, setPokeError] = useState<string | null>(null);
  const runPoke = async () => {
    if (!actions || !poke || debateId === null) return;
    setPoking(true);
    setPokeError(null);
    try {
      await (poke.kind === 'tally' ? actions.tallyTree(debateId) : actions.advancePhase(debateId));
      await refresh();
    } catch (cause) {
      setPokeError(actionErrorMessage(cause));
    } finally {
      setPoking(false);
    }
  };

  // A failed poke's message is obsolete once the debate moved on regardless -
  // typically because another keeper won the race it lost.
  const phase = debate?.phase;
  useEffect(() => {
    setPokeError(null);
  }, [phase]);

  const tx: DebateTx | null = useMemo(() => {
    if (!actions || !userState || debateId === null) return null;
    return {
      joined: userState.joined,
      tokens: userState.tokens,
      addArgument: async (parentArgumentId, side, initialApproval, text) => {
        await actions.addArgument(debateId, parentArgumentId, side, initialApproval, text);
        await refresh();
      },
      stake: async (argumentId, side, amount) => {
        await actions.stake(debateId, argumentId, side, amount);
        await refresh();
      },
      position: (argumentId) => actions.position(debateId, argumentId),
      redeem: async (argumentId) => {
        await actions.redeemShares(debateId, argumentId);
        await refresh();
      },
      claimFees: async (argumentId) => {
        await actions.claimFees(debateId, argumentId);
        await refresh();
      },
      finalize: async (argumentId) => {
        await actions.finalizeArgument(debateId, argumentId);
        await refresh();
      },
    };
  }, [actions, userState, debateId, refresh]);

  const createDebate = async (thesis: string, timeUnitSeconds: number) => {
    if (!actions) throw new Error('Connect a wallet first.');
    openDebate(await actions.createDebate(thesis, timeUnitSeconds));
  };
  const createDisabledHint = !config
    ? 'Browsing the bundled sample debate - configure a deployment to create debates.'
    : !actions
      ? 'Connect a wallet to create a debate.'
      : null;

  const browsing = debateId === null;

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="#/">
          ArborVote
        </a>
        {!browsing && (
          <a className="back" href="#/">
            ‹ All debates
          </a>
        )}
        {!browsing && debate && (
          <span className={`phase phase-${debate.phase}`}>{PHASE_LABEL[debate.phase]}</span>
        )}
        {!browsing && debate && <PhaseClock debate={debate} now={now} />}
        {!browsing && poke && (
          <button type="button" className="btn" onClick={runPoke} disabled={poking}>
            {poking ? 'Poking…' : POKE_LABEL[poke.target]}
          </button>
        )}
        <span className="topbar-spacer" />
        {!browsing && userState?.joined && (
          <span className="tokens" title="Your vote token balance in this debate">
            <strong className="mono">{userState.tokens}</strong> ⬡
          </span>
        )}
        {!browsing && joinable && (
          <button type="button" className="btn btn-solid" onClick={join} disabled={joining}>
            {joining ? 'Joining…' : 'Join debate'}
          </button>
        )}
        <WalletMenu wallet={wallet} />
      </header>

      {joinError && <p className="load-error">Could not join: {joinError}</p>}
      {pokeError && <p className="load-error">Could not advance the debate: {pokeError}</p>}
      {error && (
        <p className="load-error">
          Could not load {browsing ? 'the debates' : 'the debate'}: {error}. Check
          VITE_ARBORVOTE_ADDRESS and VITE_RPC_URL, or unset them to browse the sample debate.
        </p>
      )}

      {browsing ? (
        debates === null ? (
          !error && <p className="load-note">Loading debates…</p>
        ) : (
          <BrowseView
            debates={debates}
            account={actions?.account}
            createDisabledHint={createDisabledHint}
            onOpen={openDebate}
            onCreate={createDebate}
          />
        )
      ) : debate ? (
        <DebateView key={debate.id} debate={debate} tx={tx} />
      ) : (
        !error && <p className="load-note">Loading debate…</p>
      )}
    </>
  );
}
