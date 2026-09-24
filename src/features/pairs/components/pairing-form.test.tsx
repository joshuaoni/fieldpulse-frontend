import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PairingForm } from "./pairing-form";
import type { AssignableRep, SalesPair } from "../types";

const createPair = vi.fn();
const addPairMember = vi.fn();
const removePairMember = vi.fn();
const fetchAssignableReps = vi.fn();

vi.mock("../api", () => ({
  fetchPairs: vi.fn(),
  fetchAssignableReps: () => fetchAssignableReps(),
  createPair: (...args: unknown[]) => createPair(...args),
  addPairMember: (...args: unknown[]) => addPairMember(...args),
  removePairMember: (...args: unknown[]) => removePairMember(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const rep = (id: string, firstName: string, pairId: string | null = null): AssignableRep => ({
  id,
  firstName,
  lastName: "Rep",
  email: `${id}@meta4.test`,
  profileImageUrl: null,
  fieldRole: "FIELD_REP",
  pairId,
});

const REPS = [rep("u1", "Chisom", "pair-1"), rep("u2", "Ademola", "pair-1"), rep("u3", "Zainab")];

const PAIR = {
  id: "pair-1",
  name: null,
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  members: [
    {
      id: "m1",
      userId: "u1",
      startedAt: "2026-09-01T00:00:00.000Z",
      endedAt: null,
      user: { id: "u1", firstName: "Chisom", lastName: "Rep", email: "", profileImageUrl: null },
    },
    {
      id: "m2",
      userId: "u2",
      startedAt: "2026-09-01T00:00:00.000Z",
      endedAt: null,
      user: { id: "u2", firstName: "Ademola", lastName: "Rep", email: "", profileImageUrl: null },
    },
  ],
  day: {
    date: "2026-09-23T00:00:00.000Z",
    current: null,
    progress: { done: 0, total: 0 },
    week: { done: 0, total: 0 },
  },
} as SalesPair;

function show(pair?: SalesPair) {
  fetchAssignableReps.mockResolvedValue(REPS);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();

  render(
    <QueryClientProvider client={client}>
      <PairingForm pair={pair} onClose={onClose} />
    </QueryClientProvider>,
  );

  return { onClose };
}

describe("assigning the reps in a pairing", () => {
  it("opens with one seat on a new pairing and names it Member 1", async () => {
    show();

    expect(await screen.findByLabelText("Member 1")).toBeDefined();
    expect(screen.queryByLabelText("Member 2")).toBeNull();
  });

  // The pair is two, so the second seat is opened rather than assumed.
  it("opens the second seat on Add member, then offers no more", async () => {
    show();
    await screen.findByLabelText("Member 1");

    fireEvent.click(screen.getByText("Add member"));

    expect(screen.getByLabelText("Member 2")).toBeDefined();
    expect(screen.queryByText("Add member")).toBeNull();
  });

  it("opens an existing pairing with a seat filled per member", async () => {
    show(PAIR);

    const first = (await screen.findByLabelText("Member 1")) as HTMLSelectElement;
    const second = screen.getByLabelText("Member 2") as HTMLSelectElement;

    expect(first.value).toBe("u1");
    expect(second.value).toBe("u2");
  });

  /**
   * The API moves one rep at a time, so the form states the members it wants
   * and the difference is worked out for it. The departure has to go first —
   * a pair holds two, and the seat must be free before the arrival takes it.
   */
  it("swaps a rep by removing the one leaving before adding the one joining", async () => {
    removePairMember.mockResolvedValue(PAIR);
    addPairMember.mockResolvedValue(PAIR);
    const { onClose } = show(PAIR);

    await screen.findAllByRole("option", { name: /Zainab/ });
    const second = screen.getByLabelText("Member 2") as HTMLSelectElement;
    fireEvent.change(second, { target: { value: "u3" } });
    fireEvent.click(screen.getByText("Save Pairing"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(removePairMember).toHaveBeenCalledWith("pair-1", "u2");
    expect(addPairMember).toHaveBeenCalledWith("pair-1", "u3");
    expect(removePairMember.mock.invocationCallOrder[0]).toBeLessThan(
      addPairMember.mock.invocationCallOrder[0],
    );
  });

  it("creates a pairing from the seats when there is no pair yet", async () => {
    createPair.mockResolvedValue(PAIR);
    const { onClose } = show();

    await screen.findAllByRole("option", { name: /Zainab/ });
    fireEvent.change(screen.getByLabelText("Member 1"), { target: { value: "u3" } });
    fireEvent.click(screen.getByText("Save Pairing"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createPair).toHaveBeenCalledWith({ userIds: ["u3"] });
  });

  it("refuses the same rep in both seats rather than letting the API do it", async () => {
    show(PAIR);

    await screen.findAllByRole("option", { name: /Zainab/ });
    const second = screen.getByLabelText("Member 2") as HTMLSelectElement;
    fireEvent.change(second, { target: { value: "u1" } });
    fireEvent.click(screen.getByText("Save Pairing"));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(removePairMember).not.toHaveBeenCalled();
    expect(addPairMember).not.toHaveBeenCalled();
  });

  // Hiding them would leave a manager wondering where someone went.
  it("lists a rep who is already paired elsewhere, and says so", async () => {
    show();

    const taken = await screen.findByRole("option", { name: /Chisom/ });

    expect(taken.textContent).toContain("already paired");
  });
});
