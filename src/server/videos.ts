import { prisma } from "@/server/db";
import { buildCursorFilter, decodeCursor, encodeCursor } from "@/server/pagination";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

export const listVideos = async ({
  cursor,
  limit
}: {
  cursor?: string | null;
  limit?: number;
}) => {
  const parsedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const decoded = cursor ? decodeCursor(cursor) : null;

  const rows = await prisma.videoPost.findMany({
    where: buildCursorFilter(decoded),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: parsedLimit + 1
  });

  const hasMore = rows.length > parsedLimit;
  const items = rows.slice(0, parsedLimit);
  const nextCursor = hasMore
    ? encodeCursor({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id })
    : null;

  return { items, nextCursor };
};
