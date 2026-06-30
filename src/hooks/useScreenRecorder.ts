import { useRef, useState, useCallback } from "react";

export type RecordState = "idle" | "recording" | "paused" | "stopped";

export interface CropRegion { x: number; y: number; w: number; h: number }

export interface RecordOptions {
  mic: boolean;
  musicFile: File | null;
  quality: "720p" | "1080p";
  cropRegion?: CropRegion | null;
  canvasEl?: HTMLCanvasElement | null; // direct board recording (no getDisplayMedia)
}

export function useScreenRecorder() {
  const [state, setState] = useState<RecordState>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState("video/mp4");
  const [duration, setDuration] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cropVideoRef = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(async (opts: RecordOptions) => {
    chunksRef.current = [];
    setBlob(null);
    setDuration(0);

    const vConstraint = opts.quality === "1080p"
      ? { width: 1920, height: 1080, frameRate: 30 }
      : { width: 1280, height: 720, frameRate: 30 };

    // Direct mode: record from canvas element — no screen share dialog
    if (opts.canvasEl) {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;

      if (opts.mic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          audioCtx.createMediaStreamSource(micStream).connect(dest);
          hasAudio = true;
        } catch { /* mic denied */ }
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
        } catch { /* music failed */ }
      }

      const audioTracks = hasAudio ? dest.stream.getAudioTracks() : [];
      const videoTracks = opts.canvasEl.captureStream(60).getVideoTracks();
      const recordStream = new MediaStream([...videoTracks, ...audioTracks]);

      const mime =
        MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" :
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" :
        "video/webm";
      setMimeType(mime);
      const mr = new MediaRecorder(recordStream, { mimeType: mime });
      mrRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setState("stopped");
        if (timerRef.current) clearInterval(timerRef.current);
        audioCtx.close();
        if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; }
      };

      mr.start(100); // small chunks = smooth playback
      startTimeRef.current = Date.now();
      setState("recording");
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return;
    }

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
      } catch { /* mic denied */ }
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
      } catch { /* music failed */ }
    }

    const audioTracks = hasAudio ? dest.stream.getAudioTracks() : [];
    let recordStream: MediaStream;

    if (opts.cropRegion) {
      // Canvas-based crop: draw cropped region from screen video onto an offscreen canvas
      const { x, y, w, h } = opts.cropRegion;
      const outW = opts.quality === "1080p" ? 1920 : 1280;
      const outH = Math.round(outW * (h / w));

      const video = document.createElement("video");
      video.muted = true;
      video.srcObject = screenStream;
      cropVideoRef.current = video;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => { video.play().then(() => resolve()); };
      });

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;

      const draw = () => {
        if (video.readyState >= 2) {
          // Map viewport px → video px (accounts for device pixel ratio / tab scale)
          const scaleX = video.videoWidth / window.innerWidth;
          const scaleY = video.videoHeight / window.innerHeight;
          ctx.drawImage(video, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, outW, outH);
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();

      recordStream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioTracks]);
    } else {
      recordStream = new MediaStream([...screenStream.getVideoTracks(), ...audioTracks]);
    }

    const mime =
      MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" :
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" :
      "video/webm";
    setMimeType(mime);
    const mr = new MediaRecorder(recordStream, { mimeType: mime });
    mrRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (cropVideoRef.current) { cropVideoRef.current.pause(); cropVideoRef.current.srcObject = null; cropVideoRef.current = null; }
      const b = new Blob(chunksRef.current, { type: mime });
      setBlob(b);
      setState("stopped");
      if (timerRef.current) clearInterval(timerRef.current);
      audioCtx.close();
      if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; }
    };

    screenStream.getVideoTracks()[0].onended = () => {
      if (mr.state === "recording" || mr.state === "paused") mr.stop();
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

  return { state, blob, mimeType, duration, start, stop, pause, resume, reset };
}
