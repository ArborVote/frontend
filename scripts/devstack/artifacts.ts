/** Builds the contracts with foundry and loads the compiled artifacts. */

import { join } from 'node:path';
import type { Abi, Hex } from 'viem';

export interface Artifact {
  abi: Abi;
  bytecode: Hex;
}

export async function forgeBuild(contractsDir: string): Promise<void> {
  const build = Bun.spawn(['forge', 'build'], { cwd: contractsDir, stdout: 'inherit', stderr: 'inherit' });
  if ((await build.exited) !== 0) {
    throw new Error('forge build failed');
  }
}

export async function loadArtifact(contractsDir: string, sourceFile: string, contractName: string): Promise<Artifact> {
  const path = join(contractsDir, 'out', sourceFile, `${contractName}.json`);
  const artifact = (await Bun.file(path).json()) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}
