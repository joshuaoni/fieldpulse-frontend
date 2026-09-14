"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

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

export function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (photo: Blob) => void;
  disabled?: boolean;
}) {
  const isHandheld = useIsHandheld();

  if (isHandheld === null) {
    return <p className="text-sm text-muted">Preparing camera…</p>;
  }

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
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileChosen}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || preparing}
        className="w-full"
      >
        {preparing ? "Preparing photo…" : "Take photo"}
      </Button>
      <p className="mt-2 text-xs text-muted">Opens your camera. Take the photo at the location.</p>
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? "This device has no camera available"
            : "The camera needs a secure (https) connection",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError("Camera permission is required to check in");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

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

    if (blob) {
      stop();
      onCapture(blob);
    }
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }

  return (
    <div>
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-[3/4] w-full rounded-lg border border-border bg-background object-cover"
      />
      <Button onClick={capture} disabled={!ready || disabled} className="mt-3 w-full">
        {ready ? "Take photo" : "Starting camera…"}
      </Button>
    </div>
  );
}
