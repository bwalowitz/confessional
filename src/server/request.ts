export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  return "unknown";
};
