/** Ensures a local anvil chain is running, spawning the host binary when needed. */

export interface AnvilHandle {
  /** Whether this process started anvil (and therefore owns its lifecycle). */
  selfStarted: boolean;
  stop(): void;
}

export async function rpcUp(rpcUrl: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureAnvil(rpcUrl: string): Promise<AnvilHandle> {
  if (await rpcUp(rpcUrl)) {
    return { selfStarted: false, stop: () => {} };
  }
  if (!Bun.which('anvil')) {
    throw new Error('anvil not found - install foundry (it also builds the contracts)');
  }
  const anvil = Bun.spawn(['anvil', '--silent'], { stdout: 'ignore', stderr: 'inherit' });
  const deadline = Date.now() + 15_000;
  while (!(await rpcUp(rpcUrl))) {
    if (Date.now() > deadline) {
      anvil.kill();
      throw new Error('anvil did not come up within 15s');
    }
    await Bun.sleep(200);
  }
  return { selfStarted: true, stop: () => anvil.kill() };
}
