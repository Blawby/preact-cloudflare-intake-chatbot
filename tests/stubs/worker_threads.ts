// Minimal stub for environments without node:worker_threads (workerd)
// biome-disable-line noExportsInTest
export const isMainThread = true;
// biome-disable-line noExportsInTest
export class Worker {
  constructor() {
    throw new Error('worker_threads.Worker is not available in this environment');
  }
}
// biome-disable-line noExportsInTest
export const parentPort = null;
// biome-disable-line noExportsInTest
export const workerData = undefined as unknown as any;
