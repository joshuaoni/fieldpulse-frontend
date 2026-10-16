import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pager, usePagedItems } from "./pager";

afterEach(cleanup);

describe("Pager", () => {
  it("says which slice is showing and steps forward", () => {
    const onPageChange = vi.fn();
    render(<Pager page={2} totalItems={45} onPageChange={onPageChange} />);

    expect(screen.getByText("Showing 21–40 of 45")).toBeDefined();
    expect(screen.getByText("Page 2 of 3")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("cannot step past either end", () => {
    render(<Pager page={3} totalItems={45} onPageChange={vi.fn()} />);

    expect((screen.getByLabelText("Next page") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Previous page") as HTMLButtonElement).disabled).toBe(false);
  });

  it("stays out of the way when everything fits on one page", () => {
    render(<Pager page={1} totalItems={20} onPageChange={vi.fn()} />);

    expect(screen.queryByLabelText("Pagination")).toBeNull();
  });
});

describe("usePagedItems", () => {
  const items = Array.from({ length: 45 }, (_, index) => index);

  it("hands back one page at a time", () => {
    const { result } = renderHook(() => usePagedItems(items));

    expect(result.current.pageItems).toHaveLength(20);
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([40, 41, 42, 43, 44]);
  });

  // A new filter is a new list: it must not open on page 3 of the old one.
  it("goes back to page 1 when the filter changes", () => {
    const { result, rerender } = renderHook(({ key }) => usePagedItems(items, key), {
      initialProps: { key: "ALL" },
    });

    act(() => result.current.setPage(2));
    rerender({ key: "VISITED" });

    expect(result.current.page).toBe(1);
  });

  // The list can shrink under it — a visit checked out, a pair archived.
  it("never points past the last page", () => {
    const { result, rerender } = renderHook(({ list }) => usePagedItems(list), {
      initialProps: { list: items },
    });

    act(() => result.current.setPage(3));
    rerender({ list: items.slice(0, 25) });

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([20, 21, 22, 23, 24]);
  });
});
