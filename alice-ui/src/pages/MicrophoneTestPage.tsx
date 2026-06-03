import { useEffect, useRef, useState } from "react";

type MicStatus = "idle" | "checking" | "granted" | "failed";

function describeError(error: unknown) {
  if (error instanceof DOMException) {
    return `${error.name}${error.message ? ` - ${error.message}` : ""}`;
  }
  return error instanceof Error ? `${error.name} - ${error.message}` : String(error);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export default function MicrophoneTestPage() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  const log = (entry: string) => {
    setLogs((prev) => [`${new Date().toISOString()} - ${entry}`, ...prev].slice(0, 80));
  };

  const stop = () => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setLevel(0);
    log("Stopped microphone test.");
  };

  useEffect(() => stop, []);

  const refreshDevices = async () => {
    const nextDevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(nextDevices.filter((device) => device.kind === "audioinput"));
    log(`Audio input devices found: ${nextDevices.filter((device) => device.kind === "audioinput").length}.`);
  };

  const start = async () => {
    setStatus("checking");
    setMessage("Checking microphone...");
    setLogs([]);
    stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("failed");
      setMessage("getUserMedia is not available in this browser.");
      return;
    }

    try {
      log(`URL: ${window.location.href}`);
      log(`Secure context: ${String(window.isSecureContext)}`);
      try {
        const permission = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
        log(`Permission state: ${permission?.state ?? "unknown"}.`);
      } catch (error) {
        log(`Permission query unavailable: ${describeError(error)}.`);
      }
      await refreshDevices();

      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        15000,
        "Timed out waiting for microphone permission/device access."
      );
      streamRef.current = stream;
      log(`getUserMedia resolved. Tracks: ${stream.getAudioTracks().length}.`);
      await refreshDevices();

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        setStatus("granted");
        setMessage("Microphone works, but AudioContext is unavailable for the level meter.");
        return;
      }

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const sum = data.reduce((total, value) => total + Math.abs(value - 128), 0);
        setLevel(Math.min(100, Math.round((sum / data.length) * 6)));
        animationRef.current = window.requestAnimationFrame(tick);
      };
      tick();

      setStatus("granted");
      setMessage("Microphone access works. Speak and watch the level meter move.");
    } catch (error) {
      setStatus("failed");
      setMessage(`Microphone test failed: ${describeError(error)}`);
      log(`Failure: ${describeError(error)}.`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", padding: "32px 18px" }}>
      <div style={{ width: "100%", maxWidth: "760px", margin: "0 auto", display: "grid", gap: "18px" }}>
        <h1 style={{ margin: 0, color: "#f8fafc" }}>Microphone Test</h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(226,232,240,0.82)" }}>
          This page only tests browser microphone access. It does not call OpenAI or start Lighthouse Discovery.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => void start()} style={{ padding: "12px 16px", borderRadius: "12px", cursor: "pointer" }}>
            Start microphone test
          </button>
          <button onClick={stop} style={{ padding: "12px 16px", borderRadius: "12px", cursor: "pointer" }}>
            Stop
          </button>
          <a href="/" style={{ padding: "12px 16px", color: "#93c5fd" }}>
            Back to Lighthouse
          </a>
        </div>
        <div>Status: {status}</div>
        <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(15,23,42,0.95)" }}>{message || "Not started."}</div>
        <div style={{ height: "22px", borderRadius: "999px", background: "rgba(148,163,184,0.18)", overflow: "hidden" }}>
          <div style={{ width: `${level}%`, height: "100%", background: "#38bdf8" }} />
        </div>
        <div>
          <strong>Audio inputs</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "rgba(15,23,42,0.95)", padding: "14px", borderRadius: "12px" }}>
            {devices.length === 0
              ? "No audio input devices listed yet."
              : devices.map((device, index) => `${index + 1}. ${device.label || "label hidden"} (${device.deviceId})`).join("\n")}
          </pre>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", background: "rgba(15,23,42,0.95)", padding: "14px", borderRadius: "12px", maxHeight: "320px", overflow: "auto" }}>
          {logs.length === 0 ? "Logs will appear here." : logs.join("\n")}
        </pre>
      </div>
    </div>
  );
}
