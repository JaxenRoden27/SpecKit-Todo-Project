/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/setup.js"],
  setupFilesAfterEnv: ["./tests/jest.afterEnv.js"],
  modulePathIgnorePatterns: ["<rootDir>/deploy/"],
  maxWorkers: 1,
  verbose: true,
};
