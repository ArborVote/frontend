import { useState, type FormEvent } from 'react';
import { actionErrorMessage } from '../data/actions';
import { formatDuration } from '../lib/time';
import type { DebateFilter, DebateSummary, Phase } from '../types';
import { filterDebates } from '../types';
import { AddressChip } from './AddressChip';

const PHASE_SHORT: Record<Phase, string> = {
  editing: 'Editing',
  rating: 'Rating',
  tallying: 'Tallying',
  finished: 'Finished',
};

const TIME_UNITS = [
  { seconds: 30, label: '30 seconds (quick demo)' },
  { seconds: 60, label: '1 minute' },
  { seconds: 600, label: '10 minutes' },
  { seconds: 3_600, label: '1 hour' },
  { seconds: 86_400, label: '1 day' },
];

/** The form starting a new debate; the whole schedule derives from one time unit. */
function CreatePanel({
  disabledHint,
  onCreate,
}: {
  /** Why creating is unavailable; null when it is possible. */
  disabledHint: string | null;
  onCreate: (thesis: string, timeUnitSeconds: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [thesis, setThesis] = useState('');
  const [unit, setUnit] = useState(600);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className="composer-open"
        onClick={() => setOpen(true)}
        disabled={disabledHint !== null}
        title={disabledHint ?? undefined}
      >
        + Start a debate
      </button>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate(thesis.trim(), unit);
      // Success navigates away to the new debate; no local state to reset.
    } catch (cause) {
      setError(actionErrorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        className="composer-text"
        value={thesis}
        onChange={(event) => setThesis(event.target.value)}
        placeholder="The thesis to debate…"
        rows={3}
        maxLength={2000}
        required
      />
      <label className="create-unit">
        Time unit
        <select value={unit} onChange={(event) => setUnit(Number(event.target.value))}>
          {TIME_UNITS.map(({ seconds, label }) => (
            <option key={seconds} value={seconds}>
              {label}
            </option>
          ))}
        </select>
        <span className="create-schedule">
          editing lasts {formatDuration(7 * unit)}, rating another {formatDuration(3 * unit)}
        </span>
      </label>
      <div className="action-row">
        <button type="submit" className="btn btn-solid" disabled={busy || thesis.trim().length === 0}>
          {busy ? 'Creating…' : 'Create debate'}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <p className="action-error">{error}</p>}
    </form>
  );
}

/** The home view: every debate on the contract, filterable, plus the create form. */
export function BrowseView({
  debates,
  account,
  createDisabledHint,
  onOpen,
  onCreate,
}: {
  debates: DebateSummary[];
  /** The connected account, enabling the "mine" author-filter shortcut. */
  account?: string;
  createDisabledHint: string | null;
  onOpen: (debateId: number) => void;
  onCreate: (thesis: string, timeUnitSeconds: number) => Promise<void>;
}) {
  const [filter, setFilter] = useState<DebateFilter>({ status: 'all', minStake: 0, author: '' });
  const filtered = filterDebates(debates, filter);

  return (
    <main className="browse">
      <CreatePanel disabledHint={createDisabledHint} onCreate={onCreate} />

      <div className="filters">
        <label className="filter">
          Status
          <select
            value={filter.status}
            onChange={(event) => setFilter({ ...filter, status: event.target.value as DebateFilter['status'] })}
          >
            <option value="all">All</option>
            {(Object.keys(PHASE_SHORT) as Phase[]).map((phase) => (
              <option key={phase} value={phase}>
                {PHASE_SHORT[phase]}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          Min stake ⬡
          <input
            type="number"
            min={0}
            value={filter.minStake}
            onChange={(event) => setFilter({ ...filter, minStake: Math.max(0, Number(event.target.value) || 0) })}
          />
        </label>
        <label className="filter filter-author">
          Author
          <input
            type="text"
            value={filter.author}
            placeholder="0x…"
            onChange={(event) => setFilter({ ...filter, author: event.target.value })}
          />
        </label>
        {account && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setFilter({ ...filter, author: filter.author === account ? '' : account })}
          >
            {filter.author === account ? 'All authors' : 'Mine'}
          </button>
        )}
      </div>

      {debates.length === 0 ? (
        <p className="column-empty">No debates yet - start the first one.</p>
      ) : filtered.length === 0 ? (
        <p className="column-empty">No debates match the filters.</p>
      ) : (
        <div className="debate-list">
          {filtered.map((debate) => (
            <div className="debate-row" key={debate.id}>
              <button type="button" className="debate-open" onClick={() => onOpen(debate.id)}>
                <span className="debate-thesis">{debate.thesis}</span>
                <span className="debate-meta">
                  {debate.argumentsCount} {debate.argumentsCount === 1 ? 'argument' : 'arguments'} ·{' '}
                  <span className="mono">{debate.stake} ⬡</span> staked
                </span>
              </button>
              <span className={`phase phase-${debate.phase}`}>{PHASE_SHORT[debate.phase]}</span>
              {debate.creator && <AddressChip address={debate.creator} />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
