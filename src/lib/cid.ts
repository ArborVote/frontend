const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** RFC 4648 base32 (lowercase, unpadded), as used by base32-encoded CIDs. */
export function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/**
 * The CIDv1 (raw codec, base32) wrapping a sha-256 multihash digest:
 * 'b' + base32(0x01 0x55 0x12 0x20 || digest). Content added to IPFS with
 * `raw-leaves` and `cid-version=1` carries exactly this CID, which is why the
 * contract can store just the 32-byte digest.
 */
export function cidFromSha256Digest(digest: Uint8Array): string {
  return 'b' + base32(new Uint8Array([0x01, 0x55, 0x12, 0x20, ...digest]));
}
