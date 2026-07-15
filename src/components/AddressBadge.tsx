import { identiconOf, IDENTICON_SIZE, shortAddress } from '../lib/address';

/** The deterministic identicon of an account, sized in em so it rides with its text. */
function IdenticonIcon({ address }: { address: string }) {
  const { cells, color, bgColor, spotColor } = identiconOf(address);
  const palette = [bgColor, color, spotColor];
  return (
    <svg
      className="identicon"
      viewBox={`0 0 ${IDENTICON_SIZE} ${IDENTICON_SIZE}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect width={IDENTICON_SIZE} height={IDENTICON_SIZE} fill={bgColor} />
      {cells.map((cell, i) =>
        cell === 0 ? null : (
          <rect
            key={i}
            x={i % IDENTICON_SIZE}
            y={Math.floor(i / IDENTICON_SIZE)}
            width="1"
            height="1"
            fill={palette[cell]}
          />
        ),
      )}
    </svg>
  );
}

/**
 * The one way an account renders anywhere in the app: its identicon plus the canonical
 * `0x1234…abcd` truncation. Presentational - interactive wrappers (the copy chip, the wallet
 * button) compose it.
 */
export function AddressBadge({ address, label }: { address: string; label?: string }) {
  return (
    <span className="address-badge">
      <IdenticonIcon address={address} />
      <span className="mono">{label ?? shortAddress(address)}</span>
    </span>
  );
}
