"use client";

import { useEffect, useState } from "react";

type VideoPost = {
  id: string;
  createdAt: string;
  videoUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: string;
  reportedCount: number;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("confessional_admin_token");
    if (stored) setToken(stored);
  }, []);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/videos", {
        headers: { "x-admin-token": token }
      });
      if (!res.ok) throw new Error("Unauthorized or failed to load");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    sessionStorage.setItem("confessional_admin_token", token);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    try {
      const res = await fetch("/api/admin/videos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token
        },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const filtered = items.filter((item) => {
    if (reportedOnly && item.reportedCount === 0) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.videoUrl.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-booth-900 bg-booth-radial bg-grain px-6 py-12 text-booth-50">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-display text-3xl">Admin</h1>
        <p className="mt-2 text-sm text-booth-300">Manage confessions and remove bad uploads.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin password"
            className="w-64 rounded-full border border-booth-700 bg-booth-900 px-4 py-2 text-sm"
          />
          <button
            className="rounded-full bg-ember-400 px-5 py-2 text-xs font-semibold text-booth-900"
            onClick={handleLogin}
          >
            Load posts
          </button>
          <button
            className="rounded-full border border-booth-600 px-5 py-2 text-xs text-booth-100"
            onClick={load}
            disabled={loading || !token}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-booth-300">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by id or URL"
            className="w-64 rounded-full border border-booth-700 bg-booth-900 px-4 py-2 text-xs"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reportedOnly}
              onChange={(event) => setReportedOnly(event.target.checked)}
            />
            Show reported only
          </label>
          <span>{filtered.length} posts</span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-booth-700/60 bg-booth-800/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-booth-300">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <span>{item.durationSeconds}s</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-booth-700 bg-black">
                <video src={item.videoUrl} controls className="aspect-video w-full" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-booth-300">
                <span>Reported {item.reportedCount}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-booth-600 px-3 py-1 text-xs text-booth-200"
                  >
                    Open
                  </a>
                  <button
                    className="rounded-full border border-red-400/60 px-4 py-1 text-xs text-red-200"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
