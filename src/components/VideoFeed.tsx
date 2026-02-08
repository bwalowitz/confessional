"use client";

import { useState } from "react";
import type { VideoPost } from "@/components/ConfessionalApp";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

export default function VideoFeed({
  items,
  onReportUpdate
}: {
  items: VideoPost[];
  onReportUpdate: (updater: (prev: VideoPost[]) => VideoPost[]) => void;
}) {
  const [reporting, setReporting] = useState<string | null>(null);

  const handleReport = async (postId: string) => {
    setReporting(postId);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPostId: postId })
      });

      if (!res.ok) {
        throw new Error("Failed to report");
      }

      onReportUpdate((prev) =>
        prev.map((item) =>
          item.id === postId ? { ...item, reportedCount: item.reportedCount + 1 } : item
        )
      );
    } catch {
      // ignore for MVP
    } finally {
      setReporting(null);
    }
  };

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-booth-700/60 bg-booth-800/40 px-6 py-10 text-center shadow-insetGlow">
        <p className="font-display text-xl text-booth-100">No confessions yet.</p>
        <p className="mt-2 text-sm text-booth-300">Be the first to record one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-booth-700/60 bg-booth-800/40 p-5 shadow-insetGlow"
        >
          <div className="flex items-center justify-between text-xs text-booth-300">
            <span>{formatTimestamp(item.createdAt)}</span>
            <span>{item.durationSeconds}s</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-booth-700 bg-black">
            <video
              src={item.videoUrl}
              controls
              preload="metadata"
              className="aspect-video w-full"
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-booth-300">
            <span>Reported {item.reportedCount}</span>
            <button
              className="rounded-full border border-booth-600 px-4 py-1 text-xs text-booth-100 transition hover:border-ember-300 hover:text-ember-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
              onClick={() => handleReport(item.id)}
              disabled={reporting === item.id}
            >
              {reporting === item.id ? "Reporting..." : "Report"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
