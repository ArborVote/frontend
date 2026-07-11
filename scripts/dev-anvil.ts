/**
 * The local dev stack as one typed tool (ADR-0004): ensures anvil and the dockerized kubo
 * node are running, builds and deploys the contracts, replays the seed debate script as
 * its participants, pins the argument texts to IPFS, writes .env.local, and starts the
 * dev server.
 *
 * anvil runs as a host binary on purpose - it ships with the foundry toolchain that
 * builds the contracts, so both are always the same version; kubo stays dockerized
 * (pinned in docker-compose.yml) because nothing else needs IPFS on the host.
 */

import { toHex, type Hex } from 'viem';

import { cidFromSha256Digest } from '../src/lib/cid';
import { ensureAnvil } from './devstack/anvil';
import { forgeBuild, loadArtifact, type Artifact } from './devstack/artifacts';
import { anvilAccount, devChainClient, runDebateScript } from './devstack/debate';
import { ensureKubo, pinText, IPFS_GATEWAY } from './devstack/ipfs';
import { climateDebate } from './seed/climateDebate';

const RPC_URL = 'http://127.0.0.1:8545';

const frontendDir = new URL('..', import.meta.url).pathname;
const contractsDir = new URL('../../contracts', import.meta.url).pathname;

const log = (line: string) => console.log(`[dev-anvil] ${line}`);

const anvil = await ensureAnvil(RPC_URL);
log(anvil.selfStarted ? 'anvil started' : `reusing the anvil already running at ${RPC_URL}`);

try {
  await forgeBuild(contractsDir);

  const client = devChainClient(RPC_URL);
  const deployer = anvilAccount(0);

  const deploy = async (artifact: Artifact, args: unknown[]): Promise<`0x${string}`> => {
    const hash = await client.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      args,
      account: deployer,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error('deployment produced no contract address');
    }
    return receipt.contractAddress;
  };

  const mockPoh = await deploy(await loadArtifact(contractsDir, 'MockProofOfHumanity.m.sol', 'MockProofOfHumanity'), []);
  const arborVoteArtifact = await loadArtifact(contractsDir, 'ArborVote.sol', 'ArborVote');
  const arborVote = await deploy(arborVoteArtifact, [mockPoh]);
  log(`ArborVote deployed at ${arborVote} (mock Proof of Humanity at ${mockPoh})`);

  const ipfsAvailable = await ensureKubo(frontendDir);
  if (!ipfsAvailable) {
    log('docker/kubo unavailable - argument content will show as raw digests');
  }

  /** Hashes a text into its on-chain contentURI; pins it and asserts the CID matches the digest. */
  const contentURI = async (text: string): Promise<Hex> => {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
    if (ipfsAvailable) {
      const cid = await pinText(text);
      const expected = cidFromSha256Digest(digest);
      if (cid !== expected) {
        throw new Error(`pinned CID ${cid} does not match the digest CID ${expected} for "${text}"`);
      }
    }
    return toHex(digest);
  };

  const { debateId, personas } = await runDebateScript(climateDebate, {
    client,
    arborVote,
    abi: arborVoteArtifact.abi,
    contentURI,
    log,
  });

  const env = [
    `VITE_ARBORVOTE_ADDRESS=${arborVote}`,
    `VITE_RPC_URL=${RPC_URL}`,
    ...(ipfsAvailable ? [`VITE_IPFS_GATEWAY=${IPFS_GATEWAY}`] : []),
  ];
  await Bun.write(`${frontendDir}.env.local`, env.join('\n') + '\n');
  log(`.env.local written for debate ${debateId}`);

  log('personas (accounts from the anvil dev mnemonic, in derivation order):');
  for (const [name, account] of personas) {
    log(`  ${name}: ${account.address}`);
  }
  log(`wallet setup: add network ${RPC_URL} (chain id 31337) and import an account above`);

  const vite = Bun.spawn(['bun', 'run', 'dev'], {
    cwd: frontendDir,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  process.on('SIGINT', () => vite.kill());
  process.on('SIGTERM', () => vite.kill());
  await vite.exited;
} finally {
  anvil.stop();
}
