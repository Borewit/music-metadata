import { defineConfig } from "vitest/config";

export default defineConfig({
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
    ],
    exclude: ["test/test-*.d.ts"],

    isolate: false,
  },
});
