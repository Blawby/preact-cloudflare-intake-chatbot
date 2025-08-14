module.exports = new Proxy({}, {
  get() {
    throw new Error('node:worker_threads is not available in workerd test environment');
  }
});