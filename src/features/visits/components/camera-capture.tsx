"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera } from "lucide-react";

function detectHandheld(): boolean {
  const uaMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
    ?.mobile;
  if (typeof uaMobile === "boolean") return uaMobile;

  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return coarse || mobileUA;
}

const noSubscription = () => () => {};

function useIsHandheld(): boolean | null {
  return useSyncExternalStore<boolean | null>(noSubscription, detectHandheld, () => null);
}

function CaptureFrame({
  label = "Tap to capture a photo",
  onClick,
  disabled,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex aspect-3/2 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-control-edge text-muted disabled:opacity-50"
    >
      <Camera size={108} strokeWidth={0.5} aria-hidden />
      <span className="text-sm">{label}</span>
    </button>
  );
}

function CameraAction({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className="mt-3 h-12 w-full rounded-xl bg-sidebar-active-bg text-sm font-medium text-sidebar-active-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (photo: Blob) => void;
  disabled?: boolean;
}) {
  const isHandheld = useIsHandheld();

  if (isHandheld === null) return <CaptureFrame label="Preparing camera…" onClick={() => {}} disabled />;

  return isHandheld ? (
    <DeviceCameraCapture onCapture={onCapture} disabled={disabled} />
  ) : (
    <InAppCameraCapture onCapture={onCapture} disabled={disabled} />
  );
}

const MAX_EDGE_PX = 1600;

async function toUploadableJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  return blob ?? file;
}

function DeviceCameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (photo: Blob) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPreparing(true);
    try {
      onCapture(await toUploadableJpeg(file));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileChosen}
      />
      <CaptureFrame
        label={preparing ? "Preparing photo…" : "Tap to capture a photo"}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || preparing}
      />
    </>
  );
}

function InAppCameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (photo: Blob) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [opening, setOpening] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!live || !video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [live]);

  async function open() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? "This device has no camera available"
          : "The camera needs a secure (https) connection",
      );
      return;
    }

    setError(null);
    setOpening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      setLive(true);
    } catch {
      setError("Camera permission is required to check in");
    } finally {
      setOpening(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );

    if (!blob) return;
    stop();
    setLive(false);
    onCapture(blob);
  }

  if (!live) {
    return (
      <>
        <CaptureFrame
          label={opening ? "Opening camera…" : "Tap to capture a photo"}
          onClick={open}
          disabled={disabled || opening}
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <div>
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-3/2 w-full rounded-2xl border border-border bg-background object-cover"
      />

      <CameraAction onClick={capture} disabled={disabled}>
        Take photo
      </CameraAction>

      <button
        type="button"
        onClick={() => {
          stop();
          setLive(false);
        }}
        className="mt-2 min-h-11 w-full text-sm font-medium text-muted"
      >
        Cancel
      </button>
    </div>
  );
}
