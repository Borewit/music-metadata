import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/test-*.ts",
      "test/token-types/test-*.ts",
      "test/strtok3/test.ts",
    ],
    exclude: ["test/test-*.d.ts"],

    isolate: false,
    threads: false,
  },
});
