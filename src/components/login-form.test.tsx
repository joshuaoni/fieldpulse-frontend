import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";
import { NO_FIELD_ACCESS_MESSAGE } from "@/lib/field-role";

const login = vi.fn();
const logout = vi.fn();
const refresh = vi.fn();
const replace = vi.fn();
const fetchMyFieldRole = vi.fn();

vi.mock("@/features/auth/api", () => ({
  login: (...args: unknown[]) => login(...args),
  logout: () => logout(),
}));
vi.mock("@/lib/api-client", () => ({ api: () => fetchMyFieldRole() }));
vi.mock("@/lib/session", () => ({ useSession: () => ({ refresh }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  vi.clearAllMocks();
  login.mockResolvedValue("token");
});
afterEach(cleanup);

function signIn() {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "someone@meta4.test" } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "secret" } });
  fireEvent.submit(screen.getByLabelText(/email/i).closest("form")!);
}

describe("signing in to FieldPulse", () => {
  it("turns away an ERP account with no FieldPulse role", async () => {
    fetchMyFieldRole.mockResolvedValue({ fieldRole: null });
    signIn();

    expect(await screen.findByText(NO_FIELD_ACCESS_MESSAGE)).toBeDefined();
    expect(logout).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("lets in an account with a FieldPulse role", async () => {
    fetchMyFieldRole.mockResolvedValue({ fieldRole: "FIELD_REP" });
    signIn();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(logout).not.toHaveBeenCalled();
  });
});
