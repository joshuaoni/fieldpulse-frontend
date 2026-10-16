import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { erp } from "../api-client";

const getToken = vi.fn();
const clearToken = vi.fn();

vi.mock("../token", () => ({ getToken: () => getToken(), clearToken: () => clearToken() }));
vi.mock("../config", () => ({
  config: { apiBaseUrl: "https://fieldpulse.test", erpBaseUrl: "https://erp.test" },
}));

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

/**
 * A 401 means two different things. With a token, the session ran out. Without
 * one — signing in — it is the server turning down the password, and telling
 * the person their session expired would only confuse them.
 */
describe("a 401", () => {
  it("passes on the server's reason when no token was sent", async () => {
    getToken.mockReturnValue("stale-token");
    vi.stubGlobal("fetch", respond(401, { message: "Invalid credentials" }));

    await expect(erp("/api/auth/login", { method: "POST", auth: false })).rejects.toThrow(
      "Invalid credentials",
    );
    expect(clearToken).not.toHaveBeenCalled();
  });

  it("ends the session when the token was turned down", async () => {
    getToken.mockReturnValue("expired-token");
    vi.stubGlobal("fetch", respond(401, { message: "jwt expired" }));

    await expect(erp("/api/auth/me")).rejects.toThrow("Session expired — sign in again");
    expect(clearToken).toHaveBeenCalled();
  });
});
