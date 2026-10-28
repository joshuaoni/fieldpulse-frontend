import { describe, expect, it, vi } from "vitest";
import { fetchPlans } from "./api";

const api = vi.fn();
vi.mock("@/lib/api-client", () => ({ api: (...args: unknown[]) => api(...args) }));

describe("fetchPlans", () => {
  // The week grid greys out Regenerate off this count; dropping it here left
  // the button live over a fully published week.
  it("keeps how many pairs are still to plan", async () => {
    api.mockResolvedValue({ count: 1, office: { lat: 1, lng: 2 }, pairsToPlan: 0, plans: [] });

    expect(await fetchPlans("2026-10-26")).toEqual({
      office: { lat: 1, lng: 2 },
      pairsToPlan: 0,
      plans: [],
    });
  });
});
