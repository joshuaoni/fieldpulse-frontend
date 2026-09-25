import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequireFieldManager } from "./require-field-manager";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const sessionState = { status: "authenticated" as "loading" | "authenticated" | "anonymous" };
vi.mock("@/lib/session", () => ({
  useSession: () => ({ status: sessionState.status }),
}));

const fieldRoleState: {
  data?: { fieldRole: "FIELD_MANAGER" | "FIELD_REP" | null };
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
} = {
  data: undefined,
  isPending: true,
  isSuccess: false,
  isError: false,
  refetch: vi.fn(),
};
vi.mock("@/features/field-roles/hooks", () => ({
  useMyFieldRole: () => fieldRoleState,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionState.status = "authenticated";
  fieldRoleState.data = undefined;
  fieldRoleState.isPending = true;
  fieldRoleState.isSuccess = false;
  fieldRoleState.isError = false;
});

describe("RequireFieldManager", () => {
  it("redirects to login when there is no session", () => {
    sessionState.status = "anonymous";

    render(
      <RequireFieldManager>
        <p>Manager content</p>
      </RequireFieldManager>,
    );

    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Manager content")).toBeNull();
  });

  it("shows nothing sensitive while the role check is pending", () => {
    render(
      <RequireFieldManager>
        <p>Manager content</p>
      </RequireFieldManager>,
    );

    expect(screen.queryByText("Manager content")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  // The gate this component exists for: a signed-in rep must never see the
  // manager shell just by knowing the URL.
  it("redirects a signed-in rep away rather than rendering manager content", () => {
    fieldRoleState.data = { fieldRole: "FIELD_REP" };
    fieldRoleState.isPending = false;
    fieldRoleState.isSuccess = true;

    render(
      <RequireFieldManager>
        <p>Manager content</p>
      </RequireFieldManager>,
    );

    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Manager content")).toBeNull();
  });

  it("renders the protected content for a field manager", () => {
    fieldRoleState.data = { fieldRole: "FIELD_MANAGER" };
    fieldRoleState.isPending = false;
    fieldRoleState.isSuccess = true;

    render(
      <RequireFieldManager>
        <p>Manager content</p>
      </RequireFieldManager>,
    );

    expect(screen.getByText("Manager content")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("offers a retry rather than blocking or silently granting access on error", () => {
    fieldRoleState.isPending = false;
    fieldRoleState.isError = true;

    render(
      <RequireFieldManager>
        <p>Manager content</p>
      </RequireFieldManager>,
    );

    expect(screen.queryByText("Manager content")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
