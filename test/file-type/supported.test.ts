import { test, expect } from "vitest";

import { supportedExtensions, supportedMimeTypes, FileExtension, MimeType } from "../../lib/file-type";

test("supportedExtensions.has", () => {
  expect(supportedExtensions.has("jpg")).toBe(true);
  expect(supportedExtensions.has("blah" as FileExtension)).toBe(false);
});

test("supportedMimeTypes.has", () => {
  expect(supportedMimeTypes.has("video/mpeg")).toBe(true);
  expect(supportedMimeTypes.has("video/blah" as MimeType)).toBe(false);
});
