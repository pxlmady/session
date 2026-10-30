// Jest для інтеграційних тестів API (ТЗ, розділ 15). Код у форматі ESM, тому без трансформації.
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
};
