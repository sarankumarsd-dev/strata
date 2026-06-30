import { useRef, useState, useCallback } from "react";

export type RecordState = "idle" | "recording" | "paused" | "stopped";

export interface RecordOptions {
  mic: boolean;
  musicFile: File | null;
  quality: "720p" | "1080p";
}

export function useScreenRecorder() {
  const [state, setState] = useState<RecordState>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);

  const start = useCallback(async (opts: RecordOptions) => {
    chunksRef.current = [];
    setBlob(null);
    setDuration(0);

    const vConstraint = opts.quality === "1080p"
      ? { width: 1920, height: 1080, frameRate: 30 }
      : { width: 1280, height: 720, frameRate: 30 };

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: vConstraint as any,
      audio: false,
    });
    screenStreamRef.current = screenStream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const dest = audioCtx.createMediaStreamDestination();
    let hasAudio = false;

    if (opts.mic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtx.createMediaStreamSource(micStream).connect(dest);
        hasAudio = true;
      } catch {
        // mic denied — continue without
      }
    }

    if (opts.musicFile) {
      try {
        const url = URL.createObjectURL(opts.musicFile);
        const audio = new Audio(url);
        audio.loop = true;
        musicAudioRef.current = audio;
        await audio.play();
        const src = audioCtx.createMediaElementSource(audio);
        src.connect(dest);
        src.connect(audioCtx.destination);
        hasAudio = true;
      } catch {
        // music load failed — continue without
      }
    }

    const tracks = [
      ...screenStream.getVideoTracks(),
      ...(hasAudio ? dest.stream.getAudioTracks() : []),
    ];
    const combined = new MediaStream(tracks);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const mr = new MediaRecorder(combined, { mimeType });
    mrRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const b = new Blob(chunksRef.current, { type: "video/webm" });
      setBlob(b);
      setState("stopped");
      if (timerRef.current) clearInterval(timerRef.current);
      audioCtx.close();
      if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; }
    };

    // User stops via browser share bar
    screenStream.getVideoTracks()[0].onended = () => {
      if (mr.state === "recording") mr.stop();
    };

    mr.start(1000);
    startTimeRef.current = Date.now();
    setState("recording");
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    const mr = mrRef.current;
    if (mr && (mr.state === "recording" || mr.state === "paused")) mr.stop();
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const pause = useCallback(() => {
    const mr = mrRef.current;
    if (mr?.state === "recording") {
      mr.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const mr = mrRef.current;
    if (mr?.state === "paused") {
      mr.resume();
      const pausedAt = Date.now() - duration * 1000;
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - pausedAt) / 1000));
      }, 1000);
      setState("recording");
    }
  }, [duration]);

  const reset = useCallback(() => {
    setState("idle");
    setBlob(null);
    setDuration(0);
  }, []);

  return { state, blob, duration, start, stop, pause, resume, reset };
}
