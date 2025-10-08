import { initI18n } from '@/i18n';
import { beforeAll } from 'vitest';

// Initialize i18n before all tests
beforeAll(async () => {
  await initI18n();
});
