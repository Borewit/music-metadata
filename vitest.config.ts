import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 40000,
    hookTimeout: 40000,
    maxWorkers: 4,
    environment: 'node',
    include: ['test/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Coverage runs after build:test; imports resolve to the emitted JavaScript.
      include: ['lib/**/*.js'],
      exclude: [
        'lib/**/*.d.ts',
        'lib/index.js',
        'lib/**/types.js',
        'lib/common/Base64.js',
        'lib/ogg/vorbis/index.js',
        'lib/write/flac/picture.js',
        'lib/write/core/writer.browser.js',
        'lib/write/core/source.browser.js',
        'lib/write/browser.js'
      ],
      reporter: ['lcov', 'text'],
      reportsDirectory: 'coverage'
    }
  }
});
