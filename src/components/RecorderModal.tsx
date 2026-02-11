"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoPost } from "@/components/ConfessionalApp";

const MAX_DURATION = 30;

const pickMimeType = () => {
  const options = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4"
  ];

  for (const option of options) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(option)) {
      return option;
    }
  }

  return "";
};

export default function RecorderModal({
  open,
  onClose,
  onUploaded
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (post: VideoPost) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const pixelSizeRef = useRef<number>(24);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number | null>(null);

  const [pixelSize, setPixelSize] = useState(24);
  const [voiceMix, setVoiceMix] = useState(82);
  const [recording, setRecording] = useState(false);
  const [readyBlob, setReadyBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(MAX_DURATION);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mimeType, setMimeType] = useState<string>("");

  const clearAudioGraph = () => {
    audioNodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    });
    audioNodesRef.current = [];

    try {
      audioSourceRef.current?.disconnect();
    } catch {
      // ignore
    }
  };

  const rebuildAudioGraph = () => {
    const ctx = audioContextRef.current;
    const source = audioSourceRef.current;
    const destination = audioDestinationRef.current;

    if (!ctx || !source || !destination) {
      return;
    }

    clearAudioGraph();

    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const normalizedStrength = Math.min(1, Math.max(0, voiceMix / 100));
    dryGain.gain.value = Math.max(0.02, 0.22 - normalizedStrength * 0.2);
    wetGain.gain.value = Math.min(1, 0.78 + normalizedStrength * 0.22);

    source.connect(dryGain);
    dryGain.connect(destination);

    const deepHighpass = ctx.createBiquadFilter();
    deepHighpass.type = "highpass";
    deepHighpass.frequency.value = 90;

    const deepLowshelf = ctx.createBiquadFilter();
    deepLowshelf.type = "lowshelf";
    deepLowshelf.frequency.value = 180;
    deepLowshelf.gain.value = 10;

    const deepPeaking = ctx.createBiquadFilter();
    deepPeaking.type = "peaking";
    deepPeaking.frequency.value = 520;
    deepPeaking.Q.value = 0.7;
    deepPeaking.gain.value = 6;

    const deepLowpass = ctx.createBiquadFilter();
    deepLowpass.type = "lowpass";
    deepLowpass.frequency.value = 1900;

    const deepCompressor = ctx.createDynamicsCompressor();
    deepCompressor.threshold.value = -24;
    deepCompressor.knee.value = 10;
    deepCompressor.ratio.value = 6;
    deepCompressor.attack.value = 0.004;
    deepCompressor.release.value = 0.22;

    const deepGain = ctx.createGain();
    deepGain.gain.value = 0.75;

    const octaveInputHighpass = ctx.createBiquadFilter();
    octaveInputHighpass.type = "highpass";
    octaveInputHighpass.frequency.value = 380;

    // Full-wave rectify to synthesize an octave-up component.
    const octaveShaper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.abs(x);
    }
    octaveShaper.curve = curve;
    octaveShaper.oversample = "4x";

    const octaveBandpass = ctx.createBiquadFilter();
    octaveBandpass.type = "bandpass";
    octaveBandpass.frequency.value = 1400;
    octaveBandpass.Q.value = 0.8;

    const octaveCompressor = ctx.createDynamicsCompressor();
    octaveCompressor.threshold.value = -34;
    octaveCompressor.ratio.value = 5;
    octaveCompressor.attack.value = 0.003;
    octaveCompressor.release.value = 0.16;

    const octaveGain = ctx.createGain();
    octaveGain.gain.value = 0.25 + normalizedStrength * 0.2;

    source.connect(deepHighpass);
    deepHighpass.connect(deepLowshelf);
    deepLowshelf.connect(deepPeaking);
    deepPeaking.connect(deepLowpass);
    deepLowpass.connect(deepCompressor);
    deepCompressor.connect(deepGain);
    deepGain.connect(wetGain);

    source.connect(octaveInputHighpass);
    octaveInputHighpass.connect(octaveShaper);
    octaveShaper.connect(octaveBandpass);
    octaveBandpass.connect(octaveCompressor);
    octaveCompressor.connect(octaveGain);
    octaveGain.connect(wetGain);

    audioNodesRef.current = [
      dryGain,
      wetGain,
      deepHighpass,
      deepLowshelf,
      deepPeaking,
      deepLowpass,
      deepCompressor,
      deepGain,
      octaveInputHighpass,
      octaveShaper,
      octaveBandpass,
      octaveCompressor,
      octaveGain
    ];

    wetGain.connect(destination);
  };

  const setupAudioDisguiser = (stream: MediaStream) => {
    if (!stream.getAudioTracks().length) {
      return null;
    }

    const AudioCtor =
      window.AudioContext ||
      ((window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        null);

    if (!AudioCtor) {
      return null;
    }

    const ctx = new AudioCtor();
    const source = ctx.createMediaStreamSource(stream);
    const destination = ctx.createMediaStreamDestination();

    audioContextRef.current = ctx;
    audioSourceRef.current = source;
    audioDestinationRef.current = destination;

    rebuildAudioGraph();
    return destination.stream.getAudioTracks()[0] ?? null;
  };

  useEffect(() => {
    pixelSizeRef.current = pixelSize;
  }, [pixelSize]);

  useEffect(() => {
    rebuildAudioGraph();
  }, [voiceMix]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        setError(null);
        setReadyBlob(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true
        });
        if (cancelled) return;
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        const scratch = scratchRef.current ?? document.createElement("canvas");
        scratchRef.current = scratch;
        if (!canvas) return;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        scratch.width = Math.max(1, Math.floor(width / pixelSizeRef.current));
        scratch.height = Math.max(1, Math.floor(height / pixelSizeRef.current));

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });
        if (!ctx || !scratchCtx) return;

        const render = () => {
          if (!videoRef.current) return;
          const block = Math.max(8, Math.min(64, pixelSizeRef.current));
          scratch.width = Math.max(1, Math.floor(width / block));
          scratch.height = Math.max(1, Math.floor(height / block));

          scratchCtx.imageSmoothingEnabled = false;
          scratchCtx.drawImage(videoRef.current, 0, 0, scratch.width, scratch.height);

          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, 0, 0, width, height);

          animationRef.current = requestAnimationFrame(render);
        };

        render();

        const canvasStream = canvas.captureStream(30);
        const processedAudioTrack = setupAudioDisguiser(stream);
        if (processedAudioTrack) {
          canvasStream.addTrack(processedAudioTrack);
        }

        const chosenMime = pickMimeType();
        setMimeType(chosenMime);
        if (!chosenMime) {
          setError("Your browser does not support recording on this device.");
          return;
        }

        recorderRef.current = new MediaRecorder(canvasStream, {
          mimeType: chosenMime
        });

        recorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: chosenMime });
          chunksRef.current = [];
          const elapsed = recordStartRef.current
            ? Math.min(MAX_DURATION, Math.ceil((Date.now() - recordStartRef.current) / 1000))
            : 0;
          setRecordedDuration(elapsed);
          recordStartRef.current = null;
          setReadyBlob(blob);
          setRecording(false);
          setCountdown(MAX_DURATION);
          clearTimers();
        };
      } catch {
        setError("Camera/microphone access is required to record.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        cleanup();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const clearTimers = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      window.clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  };

  const cleanup = () => {
    clearTimers();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;

    clearAudioGraph();
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    audioSourceRef.current = null;
    audioDestinationRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    setReadyBlob(null);
    setRecordedDuration(0);
  };

  const startRecording = async () => {
    if (!recorderRef.current || recording) return;

    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    chunksRef.current = [];
    setReadyBlob(null);
    setRecordedDuration(0);
    setRecording(true);
    setCountdown(MAX_DURATION);

    recorderRef.current.start(250);

    const start = Date.now();
    recordStartRef.current = start;
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, Math.ceil(MAX_DURATION - elapsed));
      setCountdown(remaining);
    }, 200);

    maxTimeoutRef.current = window.setTimeout(() => {
      stopRecording();
    }, MAX_DURATION * 1000);
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
  };

  const submitRecording = async () => {
    if (!readyBlob || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      const width = canvas?.width ?? 0;
      const height = canvas?.height ?? 0;
      const durationSeconds = recordedDuration || MAX_DURATION - countdown;

      const formData = new FormData();
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      formData.append("video", readyBlob, `confession.${extension}`);
      formData.append("durationSeconds", String(Math.min(Math.max(durationSeconds, 1), MAX_DURATION)));
      formData.append("width", String(width));
      formData.append("height", String(height));

      const res = await fetch("/api/videos", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload failed");
      }

      const payload = await res.json();
      onUploaded(payload.item as VideoPost);
      cleanup();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
          cleanup();
        }
      }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-booth-700 bg-booth-900 p-6 shadow-booth">
        <button
          className="absolute right-5 top-5 text-xs text-booth-400 hover:text-booth-100"
          onClick={() => {
            onClose();
            cleanup();
          }}
        >
          Close
        </button>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1">
            <div className="overflow-hidden rounded-xl border border-booth-700 bg-black">
              <canvas ref={canvasRef} className="aspect-video w-full" />
            </div>
            <video ref={videoRef} className="hidden" playsInline muted />
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ember-300">Record</p>
              <h2 className="font-display text-2xl text-booth-50">Speak freely</h2>
              <p className="mt-2 text-sm text-booth-300">
                Only the pixelated video and processed audio are recorded and uploaded.
              </p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-booth-300">Pixelation</label>
              <input
                type="range"
                min={8}
                max={64}
                value={pixelSize}
                onChange={(event) => setPixelSize(Number(event.target.value))}
                className="mt-2 w-full accent-ember-300"
              />
              <div className="mt-1 text-xs text-booth-400">Block size: {pixelSize}px</div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-booth-300">Voice Disguise</label>
              <input
                type="range"
                min={60}
                max={100}
                value={voiceMix}
                onChange={(event) => setVoiceMix(Number(event.target.value))}
                className="mt-2 w-full accent-ember-300"
                disabled={recording}
              />
              <div className="mt-1 text-xs text-booth-400">Disguise intensity: {voiceMix}%</div>
            </div>

            <div className="rounded-xl border border-booth-700/70 bg-booth-800/50 px-4 py-3 text-xs text-booth-300">
              Terms: Do not include identifying info. Illegal content will be removed.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-ember-400 px-5 py-2 text-xs font-semibold text-booth-900 shadow-booth transition hover:bg-ember-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed disabled:bg-booth-600"
                onClick={startRecording}
                disabled={recording || !!readyBlob || !!error}
              >
                Start
              </button>
              <button
                className="rounded-full border border-booth-600 px-5 py-2 text-xs text-booth-100 transition hover:border-ember-300 hover:text-ember-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed"
                onClick={stopRecording}
                disabled={!recording}
              >
                Stop
              </button>
              <button
                className="rounded-full bg-booth-100 px-5 py-2 text-xs font-semibold text-booth-900 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300 disabled:cursor-not-allowed disabled:bg-booth-600"
                onClick={submitRecording}
                disabled={!readyBlob || submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button
                className="rounded-full border border-booth-600 px-5 py-2 text-xs text-booth-100 transition hover:border-ember-300 hover:text-ember-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-300"
                onClick={() => {
                  onClose();
                  cleanup();
                }}
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-booth-400">
              {recording ? `Recording... ${countdown}s left` : "Ready when you are."}
            </div>

            {mimeType.includes("mp4") ? (
              <div className="text-xs text-amber-200">
                Your browser is recording MP4. Some browsers may not support MP4 playback for others.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
