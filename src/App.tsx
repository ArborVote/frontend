import { useEffect, useState } from 'react';
import { DebateView } from './components/DebateView';
import { WalletMenu } from './components/WalletMenu';
import { defaultSource } from './data/source';
import type { Debate } from './types';
import { PHASE_LABEL } from './types';
import { useWallet } from './wallet/useWallet';

const source = defaultSource();

export default function App() {
  const [debate, setDebate] = useState<Debate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wallet = useWallet();

  useEffect(() => {
    source
      .load(0)
      .then(setDebate)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <header className="topbar">
        <span className="wordmark">ArborVote</span>
        {debate && <span className={`phase phase-${debate.phase}`}>{PHASE_LABEL[debate.phase]}</span>}
        <span className="topbar-spacer" />
        <WalletMenu wallet={wallet} />
      </header>

      {error && (
        <p className="load-error">
          Could not load the debate: {error}. Check VITE_ARBORVOTE_ADDRESS and VITE_RPC_URL, or
          unset them to browse the sample debate.
        </p>
      )}
      {!error && !debate && <p className="load-note">Loading debate…</p>}
      {debate && <DebateView debate={debate} />}
    </>
  );
}
