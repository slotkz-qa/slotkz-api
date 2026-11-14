import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    tags: [
      { name: 'unit', description: 'Fast isolated tests without I/O' },
      { name: 'tdd', description: 'Tests written in the red-green-refactor cycle' },
      { name: 'mock', description: 'Tests that verify interaction with stubs and mocks' },
    ],
  },
});
