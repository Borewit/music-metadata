import { test, expect } from "vitest";

import { supportedExtensions } from "../../lib/file-type/FileExtension";
import { supportedMimeTypes } from "../../lib/file-type/MimeType";

import type { FileExtension, MimeType } from "../../lib/file-type/type";

test("supportedExtensions.has", () => {
  expect(supportedExtensions.has("jpg")).toBe(true);
  expect(supportedExtensions.has("blah" as FileExtension)).toBe(false);
});

test("supportedMimeTypes.has", () => {
  expect(supportedMimeTypes.has("video/mpeg")).toBe(true);
  expect(supportedMimeTypes.has("video/blah" as MimeType)).toBe(false);
});
