import { describe, expect, it } from "vitest";
import { validateUpload } from "@/lib/validation";

describe("upload validation", () => {
  it("rejects non-video mime types", () => {
    const result = validateUpload({
      mimeType: "image/png",
      sizeBytes: 1000,
      maxBytes: 5000,
      durationSeconds: 10
    });

    expect(result.ok).toBe(false);
  });

  it("enforces max size", () => {
    const result = validateUpload({
      mimeType: "video/webm",
      sizeBytes: 9000,
      maxBytes: 5000,
      durationSeconds: 10
    });

    expect(result.ok).toBe(false);
  });
});
