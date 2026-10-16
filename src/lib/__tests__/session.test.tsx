import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "../session";

const fetchMe = vi.fn();
const logout = vi.fn();

vi.mock("@/features/auth/api", () => ({
  fetchMe: () => fetchMe(),
  logout: () => logout(),
}));
vi.mock("../token", () => ({ getToken: () => "token" }));

const person = (id: string) => ({
  id,
  firstName: id,
  lastName: "Test",
  email: `${id}@meta4.test`,
  role: "STAFF" as const,
  isActive: true,
});

const ROLE_KEY = ["field-roles", "me"];
/** The live session, handed out after render rather than during it. */
const captured: { session: ReturnType<typeof useSession> | null } = { session: null };
const session = () => captured.session as ReturnType<typeof useSession>;

function Probe() {
  const value = useSession();
  useEffect(() => {
    captured.session = value;
  });
  return <p>{value.status === "loading" ? "loading" : (value.user?.id ?? "nobody")}</p>;
}

/** Signs in as `firstId`, with a manager's role already cached. */
async function signedInAs(firstId: string) {
  fetchMe.mockResolvedValue(person(firstId));
  const client = new QueryClient();
  client.setQueryData(ROLE_KEY, { fieldRole: "FIELD_MANAGER" });

  render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );

  await screen.findByText(firstId);
  return client;
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

/**
 * The cache is keyed by what was asked, not by who asked. Without this, a rep
 * signing in after a manager in the same tab landed on the manager's home,
 * because the manager's role was still cached as "my role".
 */
describe("what is cached across a change of person", () => {
  it("keeps the cache when the session first resolves", async () => {
    const client = await signedInAs("manager");

    expect(client.getQueryData(ROLE_KEY)).toEqual({ fieldRole: "FIELD_MANAGER" });
  });

  it("drops everything cached on signing out", async () => {
    const client = await signedInAs("manager");

    act(() => session().signOut());

    await screen.findByText("nobody");
    expect(client.getQueryData(ROLE_KEY)).toBeUndefined();
    expect(logout).toHaveBeenCalled();
  });

  it("drops it when someone else signs in", async () => {
    const client = await signedInAs("manager");

    fetchMe.mockResolvedValue(person("rep"));
    await act(() => session().refresh());

    await screen.findByText("rep");
    expect(client.getQueryData(ROLE_KEY)).toBeUndefined();
  });

  it("keeps it when the same person's session is refreshed", async () => {
    const client = await signedInAs("manager");

    await act(() => session().refresh());

    await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));
    expect(client.getQueryData(ROLE_KEY)).toEqual({ fieldRole: "FIELD_MANAGER" });
  });
});
