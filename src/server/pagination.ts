export type Cursor = {
  createdAt: Date;
  id: string;
};

export const encodeCursor = (cursor: Cursor): string => {
  const payload = `${cursor.createdAt.toISOString()}|${cursor.id}`;
  return Buffer.from(payload, "utf8").toString("base64");
};

export const decodeCursor = (cursor: string): Cursor | null => {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const [createdAtRaw, id] = decoded.split("|");
    if (!createdAtRaw || !id) {
      return null;
    }
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
};

export const buildCursorFilter = (cursor: Cursor | null) => {
  if (!cursor) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } }
    ]
  };
};
