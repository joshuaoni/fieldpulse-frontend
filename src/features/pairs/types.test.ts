import { describe, expect, it } from "vitest";
import { matchesRep, openMembers, type PairMembership, type SalesPair } from "./types";

const member = (
  id: string,
  firstName: string,
  lastName: string,
  endedAt: string | null = null,
): PairMembership => ({
  id: `m-${id}`,
  userId: id,
  startedAt: "2026-09-01T00:00:00.000Z",
  endedAt,
  user: { id, firstName, lastName, email: `${id}@meta4.test`, profileImageUrl: null },
});

const pair = (members = [member("u1", "Chisom", "Ifechukwu"), member("u2", "Ademola", "Lekan")]) =>
  ({
    id: "pair-1",
    name: null,
    isActive: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    members,
  day: {
    date: "2026-09-23T00:00:00.000Z",
    current: null,
    progress: { done: 0, total: 0 },
    week: { done: 0, total: 0 },
  },
  }) as SalesPair;

describe("who is on a pair", () => {
  // Memberships are closed rather than deleted, so the roster has to filter.
  it("leaves out a rep who has left the pair", () => {
    const left = member("u3", "Bukola", "Ade", "2026-09-10T00:00:00.000Z");

    expect(openMembers(pair([...pair().members, left]))).toHaveLength(2);
  });
});

/**
 * A manager searching this screen is looking for a person, not a pair: they
 * know the rep's name, and the pair is usually unnamed anyway.
 */
describe("searching by rep name", () => {
  it("matches on a first name", () => {
    expect(matchesRep(pair(), "chisom")).toBe(true);
  });

  it("matches on a last name", () => {
    expect(matchesRep(pair(), "Lekan")).toBe(true);
  });

  it("matches either member of the pair", () => {
    expect(matchesRep(pair(), "ademola")).toBe(true);
  });

  it("matches on a full name across the space", () => {
    expect(matchesRep(pair(), "Chisom Ife")).toBe(true);
  });

  it("does not match a rep who has left", () => {
    const left = member("u3", "Bukola", "Ade", "2026-09-10T00:00:00.000Z");

    expect(matchesRep(pair([...pair().members, left]), "Bukola")).toBe(false);
  });

  it("keeps every pair while the box is empty", () => {
    expect(matchesRep(pair(), "   ")).toBe(true);
  });

  it("does not match someone who is not on the pair", () => {
    expect(matchesRep(pair(), "Zainab")).toBe(false);
  });
});
