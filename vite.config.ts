// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from "vitest/config";

export default defineConfig(() => {
  return {
    build: {
      outDir: "./vite-out",
    },
    test: {
      include: [
        "test/test-*.ts",
        "test/token-types/test-*.ts",
        "test/strtok3/test.ts",
        "test/peek-readable/test-*.ts",
        "test/file-type/test.ts",
        "test/**/*.test.ts",
        "lib/**/*.test.ts",
        "packages/**/*.test.ts",
      ],
      exclude: ["test/test-*.d.ts"],
      environment: "jsdom",

      isolate: false,
      threads: false,
      reporters: ["verbose"],
    },
  };
});
