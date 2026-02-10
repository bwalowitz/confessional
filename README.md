# Confessional

Anonymous, pixelated video confessions. Only the pixelated canvas stream is recorded and uploaded.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- S3-compatible storage (AWS S3 default)

## Local Development
1. Install deps:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

If you use Neon pooler for runtime, set:
- `DATABASE_URL` to the `-pooler` endpoint
- `DIRECT_URL` to the non-pooler endpoint
This ensures Prisma migration commands can connect directly.

3. Run Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the app:

```bash
npm run dev
```

## API
- `GET /api/videos` - cursor pagination, newest first. Optional `?cursor=...&limit=...`.
- `POST /api/videos` - multipart upload (field `video`) plus `durationSeconds`, `width`, `height`.
- `POST /api/report` - JSON `{ "videoPostId": "..." }`.

## Upload + Privacy Model
- Camera stream is used only to draw into a `<canvas>` with pixelation.
- Only the canvas stream is recorded via `canvas.captureStream()` + `MediaRecorder`.
- The raw camera stream is never recorded or uploaded.

## Browser Notes
- Preferred format is WebM (VP8/VP9). If WebM is unsupported, the recorder falls back to MP4 when available.
- If no supported `MediaRecorder` mime type is found (older Safari), the UI surfaces an error.

## Rate Limiting & Size Limits
- Uploads and reports are limited per IP.
- Durable mode: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- Fallback mode: in-memory limiter (dev or when Redis env vars are missing).
- `MAX_UPLOAD_BYTES`, `RATE_LIMIT_MAX`, and `RATE_LIMIT_WINDOW_SECONDS` control caps.

## Storage
- Server-side upload proxy: the API route receives the file and uploads to S3.
- `S3_PUBLIC_BASE_URL` should point to a public bucket or CDN base URL so the feed can stream videos.

## Tests
```bash
npm test
```

## Admin Panel
- Set `ADMIN_PASSWORD` in `.env`.
- Set `ADMIN_SESSION_SECRET` in `.env` (32+ chars) for signed HTTP-only admin sessions.
- Visit `/admin`, sign in, then list/delete uploads.

## Abuse Controls
- Duplicate reports from the same `ipHash` for a post are deduplicated.
- Uploaded files are validated by declared MIME and container signature (`webm`/`mp4`) before storage.

## Deployment Notes (Vercel)
- Provision Postgres (Neon/Supabase/etc) and set `DATABASE_URL`.
- Ensure S3 bucket is reachable and public for reads (or use a CDN and set `S3_PUBLIC_BASE_URL`).
- Set all env vars from `.env.example` in Vercel project settings.
