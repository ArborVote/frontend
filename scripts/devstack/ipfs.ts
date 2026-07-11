/** Runs the dockerized kubo node and pins argument texts via its HTTP RPC API. */

const KUBO_API = 'http://127.0.0.1:5001/api/v0';

export const IPFS_GATEWAY = 'http://127.0.0.1:8080';

async function kuboUp(): Promise<boolean> {
  try {
    return (await fetch(`${KUBO_API}/id`, { method: 'POST' })).ok;
  } catch {
    return false;
  }
}

/** Starts the compose ipfs service; returns false when docker is unavailable or kubo never gets ready. */
export async function ensureKubo(composeDir: string): Promise<boolean> {
  if (!Bun.which('docker')) {
    return false;
  }
  const up = Bun.spawn(['docker', 'compose', 'up', '-d', 'ipfs'], {
    cwd: composeDir,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await up.exited) !== 0) {
    return false;
  }
  const deadline = Date.now() + 60_000;
  while (!(await kuboUp())) {
    if (Date.now() > deadline) {
      return false;
    }
    await Bun.sleep(500);
  }
  return true;
}

/**
 * Adds and pins the text exactly the way the contract addresses it: as a raw-leaves
 * CIDv1 block whose multihash digest is the on-chain bytes32 contentURI.
 */
export async function pinText(text: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([text]));
  const response = await fetch(`${KUBO_API}/add?quiet=true&raw-leaves=true&cid-version=1&pin=true`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    throw new Error(`kubo add failed with status ${response.status}`);
  }
  const { Hash } = (await response.json()) as { Hash: string };
  return Hash;
}
