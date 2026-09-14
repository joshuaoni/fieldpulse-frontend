import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceTimeNote } from "./device-time-note";

afterEach(cleanup);

const VERIFIED = "2026-09-12T17:00:00.000Z";

describe("DeviceTimeNote", () => {
  // The common case: recorded in a dead zone, delivered hours later. Without
  // this line the rep looks like they arrived at 17:00.
  it("explains an offline gap when the device recorded the action earlier", () => {
    render(<DeviceTimeNote verifiedAt={VERIFIED} deviceAt="2026-09-12T09:05:00.000Z" />);

    expect(screen.getByText(/7h 55m before it reached the server/)).toBeTruthy();
  });

  // A phone whose clock is ahead is the one case where the device time is not
  // merely late but actively misleading, so it reads differently.
  it("flags a device clock that is ahead of the verified time", () => {
    render(<DeviceTimeNote verifiedAt={VERIFIED} deviceAt="2026-09-12T18:30:00.000Z" />);

    expect(screen.getByText(/out of sync/)).toBeTruthy();
    expect(screen.getByText(/1h 30m ahead/)).toBeTruthy();
  });

  // Ordinary latency is not worth a line of explanation.
  it("says nothing when the difference is within a couple of minutes", () => {
    const { container } = render(
      <DeviceTimeNote verifiedAt={VERIFIED} deviceAt="2026-09-12T16:59:10.000Z" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("says nothing when either time is missing", () => {
    const { container } = render(<DeviceTimeNote verifiedAt={null} deviceAt={VERIFIED} />);
    expect(container.innerHTML).toBe("");

    const second = render(<DeviceTimeNote verifiedAt={VERIFIED} deviceAt={null} />);
    expect(second.container.innerHTML).toBe("");
  });

  it("formats long gaps in days and hours", () => {
    render(<DeviceTimeNote verifiedAt={VERIFIED} deviceAt="2026-09-10T14:00:00.000Z" />);

    expect(screen.getByText(/2d 3h before it reached the server/)).toBeTruthy();
  });
});
