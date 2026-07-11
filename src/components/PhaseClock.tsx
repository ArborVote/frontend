import { formatClockTime, formatDuration } from '../lib/time';
import type { Debate } from '../types';
import { liveChainTime } from '../types';

/**
 * The debate's phase clock: the running deadline as a live countdown, the full
 * schedule (editing and rating end, in local time) on hover.
 */
export function PhaseClock({ debate, now }: { debate: Debate; now: number }) {
  const { timing, phase } = debate;
  if (!timing || phase === 'finished') return null;

  const time = liveChainTime(timing, now);
  const schedule = `Editing until ${formatClockTime(timing.editingEndTime)} · rating until ${formatClockTime(timing.ratingEndTime)}`;

  const deadline =
    phase === 'editing' ? timing.editingEndTime : phase === 'rating' ? timing.ratingEndTime : null;
  const text =
    deadline === null
      ? 'awaiting the tally'
      : time < deadline
        ? `ends in ${formatDuration(deadline - time)}`
        : 'time is up';

  return (
    <span className="phase-clock" title={schedule}>
      {text}
    </span>
  );
}
