import { describe, expect, it } from "vitest";
import { sniffVideoMimeType, validateUpload } from "@/lib/validation";

const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
const mp4Header = Buffer.from([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x00, 0x00
]);

describe("upload validation", () => {
  it("detects webm container", () => {
    expect(sniffVideoMimeType(Buffer.concat([webmHeader, Buffer.alloc(2048)]))).toBe("video/webm");
  });

  it("detects mp4 container", () => {
    expect(sniffVideoMimeType(Buffer.concat([mp4Header, Buffer.alloc(2048)]))).toBe("video/mp4");
  });

  it("rejects non-video mime types", () => {
    const result = validateUpload({
      declaredMimeType: "image/png",
      fileBuffer: Buffer.concat([webmHeader, Buffer.alloc(2048)]),
      sizeBytes: 5000,
      maxBytes: 15000,
      durationSeconds: 10,
      width: 640,
      height: 480
    });

    expect(result.ok).toBe(false);
  });

  it("rejects container mismatches", () => {
    const result = validateUpload({
      declaredMimeType: "video/mp4",
      fileBuffer: Buffer.concat([webmHeader, Buffer.alloc(2048)]),
      sizeBytes: 5000,
      maxBytes: 15000,
      durationSeconds: 10,
      width: 640,
      height: 480
    });

    expect(result.ok).toBe(false);
  });

  it("enforces max size", () => {
    const result = validateUpload({
      declaredMimeType: "video/webm",
      fileBuffer: Buffer.concat([webmHeader, Buffer.alloc(2048)]),
      sizeBytes: 20000,
      maxBytes: 15000,
      durationSeconds: 10,
      width: 640,
      height: 480
    });

    expect(result.ok).toBe(false);
  });
});
