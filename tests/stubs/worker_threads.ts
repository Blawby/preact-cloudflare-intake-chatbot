// Minimal stub for environments without node:worker_threads (workerd)
export const isMainThread = true;
export class Worker {
  constructor() {
    throw new Error('worker_threads.Worker is not available in this environment');
  }
}
export const parentPort = null;
export const workerData = undefined as unknown as any;
