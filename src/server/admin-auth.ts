import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export const ADMIN_COOKIE_NAME = "confessional_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const compareSecrets = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const sign = (payload: string) =>
  createHmac("sha256", env.adminSessionSecret).update(payload).digest("base64url");

export const isAdminPasswordValid = (password: string) => {
  if (!env.adminPassword) return false;
  return compareSecrets(password, env.adminPassword);
};

export const createAdminSessionToken = () => {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const nonce = randomBytes(12).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
};

export const verifyAdminSessionToken = (token: string | undefined | null) => {
  if (!token || !env.adminSessionSecret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [expiresAtRaw, nonce, signature] = parts;
  if (!expiresAtRaw || !nonce || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const payload = `${expiresAtRaw}.${nonce}`;
  const expected = sign(payload);
  return compareSecrets(signature, expected);
};

export const adminSessionCookie = (value: string) => ({
  name: ADMIN_COOKIE_NAME,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
});
