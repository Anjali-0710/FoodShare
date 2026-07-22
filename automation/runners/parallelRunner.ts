import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * ParallelRunner — splits the test suite across multiple worker threads
 * to enable parallel execution across test modules.
 *
 * Each worker receives a slice of the full test case array and executes
 * independently, posting results back to the main thread via parentPort.
 */

export interface WorkerPayload {
  testCases: any[];
  workerId: number;
  simulate: boolean;
}

export async function runParallel(
  testCases: any[],
  workerCount: number = 4,
  simulate: boolean = true
): Promise<any[]> {
  if (!isMainThread) {
    throw new Error('runParallel must be called from the main thread');
  }

  const chunkSize = Math.ceil(testCases.length / workerCount);
  const chunks: any[][] = [];

  for (let i = 0; i < testCases.length; i += chunkSize) {
    chunks.push(testCases.slice(i, i + chunkSize));
  }

  logger.info(`Starting ${workerCount} parallel workers, ${testCases.length} total tests...`);

  const workerFile = path.resolve(__dirname, 'parallelWorker.js');
  const promises = chunks.map((chunk, idx) =>
    new Promise<any[]>((resolve, reject) => {
      const worker = new Worker(workerFile, {
        workerData: { testCases: chunk, workerId: idx + 1, simulate } as WorkerPayload
      });

      const results: any[] = [];

      worker.on('message', (result: any) => results.push(result));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${idx + 1} exited with code ${code}`));
        else resolve(results);
      });
    })
  );

  const allResultArrays = await Promise.all(promises);
  const merged = ([] as any[]).concat(...allResultArrays);
  logger.info(`Parallel execution complete. Total results: ${merged.length}`);
  return merged;
}
