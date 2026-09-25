import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitActions } from "./visit-actions";
import { flush } from "@/lib/offline-queue";
import type { Visit, VisitAttendance } from "../types";

const checkIn = vi.fn();
const checkOut = vi.fn();
const submitReport = vi.fn();
const onSubmitted = vi.fn();
const getCurrentPosition = vi.fn();

vi.mock("../api", () => ({
  checkIn: (...args: unknown[]) => checkIn(...args),
  checkOut: (...args: unknown[]) => checkOut(...args),
  submitReport: (...args: unknown[]) => submitReport(...args),
  fetchVisit: vi.fn(),
  fetchMyVisits: vi.fn(),
  fetchTeamVisits: vi.fn(),
}));

vi.mock("@/lib/geolocation", () => ({
  getCurrentPosition: (...args: unknown[]) => getCurrentPosition(...args),
  isCancelled: () => false,
}));

// The camera is a device; here it is a button that hands back a photo.
vi.mock("./camera-capture", () => ({
  CameraCapture: ({ onCapture }: { onCapture: (photo: Blob) => void }) => (
    <button type="button" onClick={() => onCapture(new Blob(["x"], { type: "image/jpeg" }))}>
      Tap to capture a photo
    </button>
  ),
}));

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  getCurrentPosition.mockResolvedValue({ lat: 6.6, lng: 3.35, accuracyM: 8 });
});

afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  // The queue is a real IndexedDB and outlives a test, and the screens now
  // read it: anything left behind would check the next test's rep in.
  await flush(async () => "done");
});

const attendance = (overrides: Partial<VisitAttendance> = {}): VisitAttendance =>
  ({
    id: "att-1",
    repId: "me",
    checkInLat: null,
    checkInLng: null,
    checkInPhotoUrl: null,
    checkInAt: null,
    checkOutLat: null,
    checkOutLng: null,
    checkOutAt: null,
    clientLocalCheckInAt: null,
    clientLocalCheckOutAt: null,
    ...overrides,
  }) as VisitAttendance;

const visit = (attendances: VisitAttendance[]): Visit =>
  ({
    id: "visit-1",
    leadId: "lead-1",
    lead: { id: "lead-1", companyName: "Capital Partners", address: "VI, Lekki" },
    pairId: "pair-1",
    status: "PLANNED",
    scheduledFor: null,
    planId: null,
    stopOrder: 0,
    legMinutes: null,
    returnMinutes: null,
    createdAt: "",
    updatedAt: "",
    attendances,
  }) as Visit;

function show(v: Visit) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <VisitActions visit={v} repId="me" onSubmitted={onSubmitted} />
    </QueryClientProvider>,
  );
}

/**
 * A check-in is evidence: a photo at the door and a position good enough to
 * place it. Neither alone is worth recording, so the action stays shut until
 * both are in hand.
 */
describe("checking in", () => {
  it("will not check in with a photo but no position yet", async () => {
    let settle: (fix: unknown) => void = () => {};
    getCurrentPosition.mockReturnValue(new Promise((resolve) => (settle = resolve)));

    show(visit([attendance()]));
    fireEvent.click(screen.getByText("Tap to capture a photo"));

    expect(screen.getByText("Check in").closest("button")).toHaveProperty("disabled", true);
    expect(await screen.findByText(/Capturing location…/)).toBeDefined();

    settle({ lat: 6.6, lng: 3.35, accuracyM: 8 });
  });

  it("will not check in with a position but no photo", async () => {
    show(visit([attendance()]));

    await screen.findByText("GPS Ready");
    expect(screen.getByText("Check in").closest("button")).toHaveProperty("disabled", true);
  });

  it("opens the action once both are in hand", async () => {
    show(visit([attendance()]));

    await screen.findByText("GPS Ready");
    fireEvent.click(screen.getByText("Tap to capture a photo"));

    await waitFor(() =>
      expect(screen.getByText("Check in").closest("button")).toHaveProperty("disabled", false),
    );
  });

  // Shows no time at all: the server stamps arrival, so any clock here would
  // be the phone's and might not be what is recorded.
  it("shows no arrival time before checking in", async () => {
    show(visit([attendance()]));

    await screen.findByText("GPS Ready");
    expect(screen.queryByText(/Check in Time/)).toBeNull();
  });

  /**
   * The accuracy the phone reports is what the server judges a fix on — a
   * position good to half a kilometre cannot place a rep at a shop front. It
   * was never sent before, so the flag it feeds could never fire.
   */
  it("sends the accuracy the phone reported", async () => {
    checkIn.mockResolvedValue(visit([attendance()]));
    show(visit([attendance()]));

    await screen.findByText("GPS Ready");
    fireEvent.click(screen.getByText("Tap to capture a photo"));
    await waitFor(() =>
      expect(screen.getByText("Check in").closest("button")).toHaveProperty("disabled", false),
    );
    fireEvent.click(screen.getByText("Check in"));

    await waitFor(() => expect(checkIn).toHaveBeenCalled());
    expect(checkIn.mock.calls[0][0]).toMatchObject({ accuracyM: 8, lat: 6.6, lng: 3.35 });
  });

  it("shows the accuracy it has, so a rep can wait for a better one", async () => {
    getCurrentPosition.mockResolvedValue({ lat: 6.6, lng: 3.35, accuracyM: 42 });
    show(visit([attendance()]));

    expect(await screen.findByText("Accuracy: 42m")).toBeDefined();
  });
});

describe("checking out", () => {
  const arrived = attendance({
    checkInAt: "2026-09-25T15:16:00.000Z",
    checkInPhotoUrl: "https://signed.test/arrival.jpg",
  });

  it("shows the arrival photo back rather than asking for another", async () => {
    show(visit([arrived]));

    expect(await screen.findByAltText("The photo taken when you arrived")).toBeDefined();
    expect(screen.queryByText("Tap to capture a photo")).toBeNull();
  });

  // The recorded arrival, not a device clock: this one is the server's.
  it("shows the arrival time the server recorded", async () => {
    show(visit([arrived]));

    expect(await screen.findByText(/Check in Time/)).toBeDefined();
  });

  it("waits for a position before letting the rep leave", async () => {
    let settle: (fix: unknown) => void = () => {};
    getCurrentPosition.mockReturnValue(new Promise((resolve) => (settle = resolve)));

    show(visit([arrived]));

    expect(screen.getByText("Check Out").closest("button")).toHaveProperty("disabled", true);
    settle({ lat: 6.6, lng: 3.35, accuracyM: 8 });

    await waitFor(() =>
      expect(screen.getByText("Check Out").closest("button")).toHaveProperty("disabled", false),
    );
  });

  it("sends the departure accuracy too", async () => {
    checkOut.mockResolvedValue(visit([arrived]));
    show(visit([arrived]));

    await screen.findByText("GPS Ready");
    fireEvent.click(screen.getByText("Check Out"));

    await waitFor(() => expect(checkOut).toHaveBeenCalled());
    expect(checkOut.mock.calls[0][0]).toMatchObject({ accuracyM: 8 });
  });
});

/**
 * A rep indoors may never get a fix. The search runs to a budget and then
 * fails, so the screen must offer a way out of the wait and a way back into
 * it — otherwise the only recovery is closing the app.
 */
describe("when the location will not come", () => {
  it("lets the rep stop a search that is going nowhere", async () => {
    getCurrentPosition.mockReturnValue(new Promise(() => {}));
    show(visit([attendance()]));

    expect(await screen.findByText("Stop searching")).toBeDefined();
  });

  it("offers another go once a search has failed", async () => {
    getCurrentPosition.mockRejectedValue(new Error("Location unavailable"));
    show(visit([attendance()]));

    expect(await screen.findByText("Search again")).toBeDefined();
    expect(screen.getByText(/Location unavailable/)).toBeDefined();
  });

  it("searches again when asked, and succeeds", async () => {
    getCurrentPosition.mockRejectedValueOnce(new Error("Location unavailable"));
    show(visit([attendance()]));

    fireEvent.click(await screen.findByText("Search again"));

    expect(await screen.findByText("GPS Ready")).toBeDefined();
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("counts the seconds so a rep can judge whether to wait", async () => {
    getCurrentPosition.mockReturnValue(new Promise(() => {}));
    show(visit([attendance()]));

    expect(await screen.findByText(/Capturing location…/)).toBeDefined();
  });
});

/**
 * An action stored offline counts as done, but the visit will not move until
 * the queue drains — so the screen has to say why it still looks the same.
 */
describe("with no connection", () => {
  const checkInOffline = async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    show(visit([attendance()]));

    await screen.findByText("GPS Ready");
    fireEvent.click(screen.getByText("Tap to capture a photo"));
    await waitFor(() =>
      expect(screen.getByText("Check in").closest("button")).toHaveProperty("disabled", false),
    );
    fireEvent.click(screen.getByText("Check in"));
  };

  it("says a check-in is saved on the phone", async () => {
    await checkInOffline();

    expect(await screen.findByText(/saved on this phone/)).toBeDefined();
  });

  /**
   * The bug this covers: a queued check-in comes back with no visit, so the
   * screen stayed on the check-in step with a live button. Reps tapped it
   * again, and again — one arrival, twelve queued check-ins, each carrying
   * its own photo.
   */
  it("moves on to the check-out rather than offering the check-in again", async () => {
    await checkInOffline();

    expect(await screen.findByText("Check Out")).toBeDefined();
    expect(screen.queryByText("Check in")).toBeNull();
  });

  // The queue outlives the screen, so the answer has to come from the queue
  // rather than from what the component happens to remember.
  it("still knows the rep has arrived when the screen is opened again", async () => {
    await checkInOffline();
    await screen.findByText("Check Out");

    cleanup();
    show(visit([attendance()]));

    expect(await screen.findByText("Check Out")).toBeDefined();
    expect(screen.queryByText("Tap to capture a photo")).toBeNull();
  });
});


/**
 * Submitting ends the visit. The step no longer renders the confirmation
 * itself — it says so upward, and the screen above replaces the whole view.
 */
describe("after the report goes in", () => {
  const visited = attendance({
    checkInAt: "2026-09-25T15:16:00.000Z",
    checkOutAt: "2026-09-25T16:02:00.000Z",
  });

  const fillAndSubmit = async () => {
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Keen on the line." } });
    fireEvent.click(screen.getByText("Submit Report"));
  };

  it("reports that the visit has been written up", async () => {
    submitReport.mockResolvedValue(visit([visited]));
    show(visit([visited]));

    await fillAndSubmit();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith({ queued: false }));
  });

  // Nothing has reached anyone yet, and the screen above says so differently.
  it("says so when the report was only queued", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    show(visit([visited]));

    await fillAndSubmit();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith({ queued: true }));
  });
});
