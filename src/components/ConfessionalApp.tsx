"use client";

import { useCallback, useEffect, useState } from "react";
import RecorderModal from "@/components/RecorderModal";
import VideoFeed from "@/components/VideoFeed";

export type VideoPost = {
  id: string;
  createdAt: string;
  videoUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: string;
  reportedCount: number;
};

type FeedResponse = {
  items: VideoPost[];
  nextCursor: string | null;
};

export default function ConfessionalApp() {
  const [items, setItems] = useState<VideoPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (initial?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (!initial && cursor) {
        params.set("cursor", cursor);
      }
      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load feed");
      }
      const data = (await res.json()) as FeedResponse;
      setItems((prev) => (initial ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    load(true);
  }, [load]);

  const handleUploaded = (post: VideoPost) => {
    setItems((prev) => [post, ...prev]);
    setOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-booth-700/40 bg-booth-900/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-ember-300/80">Confessional</p>
            <h1 className="font-display text-3xl text-booth-50">Confessional Booth</h1>
            <p className="mt-2 text-sm text-booth-200">
              Anonymous, pixelated video confessions. Share what you cannot say out loud.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-ember-400 px-6 py-2 text-sm font-semibold text-booth-900 shadow-booth transition hover:bg-ember-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
              onClick={() => setOpen(true)}
            >
              Record
            </button>
            <p className="text-xs text-booth-300">
              Press record, speak for up to 30 seconds, and your pixelated confession appears instantly.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <VideoFeed items={items} onReportUpdate={setItems} />

        <div className="mt-10 flex justify-center">
          {cursor ? (
            <button
              className="rounded-full border border-booth-600 px-6 py-2 text-sm text-booth-100 transition hover:border-ember-300 hover:text-ember-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : (
            <p className="text-xs text-booth-400">You have reached the end of the confessions.</p>
          )}
        </div>
      </main>

      <RecorderModal open={open} onClose={() => setOpen(false)} onUploaded={handleUploaded} />
    </div>
  );
}
