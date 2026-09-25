import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraCapture } from "./camera-capture";

const getUserMedia = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function asDesktop() {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  });
}

/**
 * The camera is a lens and a battery, not a decoration. It stays shut until
 * the rep asks for it — opening a visit to read the address should not turn
 * the camera on, which is what a stream started on mount did.
 */
describe("asking for the camera", () => {
  it("offers a frame to tap rather than opening itself", () => {
    asDesktop();

    render(<CameraCapture onCapture={vi.fn()} />);

    expect(screen.getByText("Tap to capture a photo")).toBeDefined();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("only reaches for the lens once the frame is pressed", async () => {
    asDesktop();
    getUserMedia.mockResolvedValue({ getTracks: () => [] });

    render(<CameraCapture onCapture={vi.fn()} />);
    screen.getByText("Tap to capture a photo").click();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});

/**
 * On a phone the frame must hand over to the camera app rather than open a
 * preview in the page — that is the capture reps actually use.
 */
describe("on a handheld", () => {
  const asPhone = (userAgent: string) => {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    window.matchMedia = ((query: string) => ({
      matches: query.includes("coarse"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  };

  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
  const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile";

  it.each([
    ["iPhone", IPHONE],
    ["Android", ANDROID],
  ])("hands %s the native camera rather than a page preview", (_name, userAgent) => {
    asPhone(userAgent);

    const { container } = render(<CameraCapture onCapture={vi.fn()} />);
    const input = container.querySelector("input[type=file]");

    expect(input?.getAttribute("accept")).toBe("image/*");
    expect(input?.getAttribute("capture")).toBe("environment");
    expect(container.querySelector("video")).toBeNull();
  });

  it("still asks before doing anything", () => {
    asPhone(IPHONE);

    render(<CameraCapture onCapture={vi.fn()} />);

    expect(screen.getByText("Tap to capture a photo")).toBeDefined();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
