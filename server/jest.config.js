/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        // Override for tests: relax some strict settings
        // that don't apply to test files
        esModuleInterop: true,
        module: "commonjs",
      },
    }],
  },
  // Clear mocks between tests
  clearMocks: true,
  // Don't collect coverage on test files themselves
  collectCoverageFrom: [
    "lib/**/*.ts",
    "evaluation/**/*.ts",
    "routes/**/*.ts",
    "!lib/supabase.ts",   // no coverage on DB client
    "!**/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },
};
