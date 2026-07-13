import { useEffect, useRef, useState } from 'react';
import { shortDigest } from '../types';

/**
 * An argument or thesis body: the resolved text, or - when the content could not be resolved from
 * IPFS - the on-chain content digest shortened to `0x2a3a…0683`, shown in full on hover and copied
 * on click, mirroring the creator address chip.
 */
export function ContentText({ text, digest }: { text: string; digest?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!digest) {
    return <>{text}</>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Clipboard access denied - the full digest is still on the tooltip.
    }
  };

  return (
    <button
      type="button"
      className="content-missing"
      title={copied ? 'Copied!' : `${digest} - content unavailable · click to copy the digest`}
      onClick={copy}
    >
      {copied ? 'copied ✓' : shortDigest(digest)}
    </button>
  );
}
