import { hexToBytes, type Hex } from 'viem';
import { cidFromSha256Digest } from '../lib/cid';
import { shortDigest } from '../types';

/**
 * An argument or thesis body: the resolved text, or - when the content could not be resolved
 * from IPFS - the on-chain content digest shortened to `0x2a3a…0683` (shown in full on hover),
 * linking to the content's `ipfs://` URI in a new tab so an IPFS-enabled browser or extension
 * can try providers beyond the app's gateway.
 */
export function ContentText({ text, digest }: { text: string; digest?: string }) {
  if (!digest) {
    return <>{text}</>;
  }
  const cid = cidFromSha256Digest(hexToBytes(digest as Hex));
  return (
    <a
      className="content-missing"
      href={`ipfs://${cid}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${digest} - content unavailable · opens ipfs://${cid} in a new tab`}
    >
      {shortDigest(digest)}
    </a>
  );
}
