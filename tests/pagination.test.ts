import { describe, expect, it, vi } from "vitest";
import { listVideos } from "@/server/videos";
import { prisma } from "@/server/db";

vi.mock("@/server/db", () => {
  return {
    prisma: {
      videoPost: {
        findMany: vi.fn()
      }
    }
  };
});

describe("videos pagination", () => {
  it("returns nextCursor when there are more rows", async () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    const rows = [
      {
        id: "a",
        createdAt: now,
        videoUrl: "x",
        durationSeconds: 10,
        width: 640,
        height: 480,
        mimeType: "video/webm",
        reportedCount: 0
      },
      {
        id: "b",
        createdAt: new Date("2024-12-31T00:00:00.000Z"),
        videoUrl: "y",
        durationSeconds: 12,
        width: 640,
        height: 480,
        mimeType: "video/webm",
        reportedCount: 0
      },
      {
        id: "c",
        createdAt: new Date("2024-12-30T00:00:00.000Z"),
        videoUrl: "z",
        durationSeconds: 8,
        width: 640,
        height: 480,
        mimeType: "video/webm",
        reportedCount: 0
      }
    ];

    (prisma.videoPost.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

    const result = await listVideos({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeTruthy();
  });
});
