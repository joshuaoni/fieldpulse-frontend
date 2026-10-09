import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";
import { Select } from "./select";

afterEach(cleanup);

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
];

function inModal(onChange = vi.fn()) {
  render(
    <Modal onClose={vi.fn()} label="Pick one" header={<h2>Pick one</h2>}>
      <Select value="" onChange={onChange} options={OPTIONS} placeholder="Choose" label="Choice" />
    </Modal>,
  );

  return { onChange };
}

const open = () => fireEvent.click(screen.getByRole("combobox"));

/** The positioned box around the list — and the search field, when there is one. */
const panel = () => screen.getByRole("listbox").closest("[data-side]") as HTMLElement;

/**
 * A modal body scrolls, and a panel left inside it is clipped by that box —
 * which is how a dropdown ended up cut off at the modal's edge, with the two
 * scrollbars running into each other.
 */
describe("a select opened inside a modal", () => {
  it("puts its panel outside the dialog, where nothing can clip it", () => {
    inModal();
    open();

    const panel = screen.getByRole("listbox");

    expect(screen.getByRole("dialog").contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });

  // Out at the body it has no positioned parent to hang from, so it is placed
  // against the viewport instead.
  it("pins the panel to the viewport", () => {
    inModal();
    open();

    expect(panel().style.position).toBe("fixed");
  });

  it("still reports which side it opened on", () => {
    inModal();
    open();

    expect(panel().dataset.side).toBe("below");
  });

  // The panel is no longer inside the control, so "did the click land outside
  // the control" has to account for it or every choice would close it first.
  it("still chooses the option that was clicked", () => {
    const { onChange } = inModal();
    open();

    fireEvent.click(screen.getByRole("option", { name: "Bravo" }));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on a pointer press outside it", () => {
    inModal();
    open();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

const MANY = Array.from({ length: 12 }, (_, index) => ({
  value: `v${index}`,
  label: `Option ${index}`,
}));

function bare(props: Partial<Parameters<typeof Select>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <Select
      value=""
      onChange={onChange}
      options={MANY}
      placeholder="Choose"
      label="Choice"
      {...props}
    />,
  );

  return { onChange };
}

const field = () => screen.getByLabelText("Search Choice");

/**
 * Past a certain length, finding a name by scrolling stops being reasonable.
 */
describe("searching a long list", () => {
  it("leaves a short list alone", () => {
    bare({ options: OPTIONS });
    open();

    expect(screen.queryByLabelText("Search Choice")).toBeNull();
  });

  it("offers a field once the list is long", () => {
    bare();
    open();

    expect(field()).toBeDefined();
    expect(screen.getAllByRole("option")).toHaveLength(12);
  });

  it("narrows the list to what was typed", () => {
    bare();
    open();

    fireEvent.change(field(), { target: { value: "ion 1" } });

    // Option 1, and 10 and 11.
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  // The address beside a lead is as good a thing to search by as its name.
  it("matches on the hint beside the label", () => {
    bare({
      options: [
        { value: "a", label: "Classic Corporate Images", hint: "120 Cemetery St, Adekunle" },
        { value: "b", label: "TouchB Empire", hint: "Ebute Ero, Lagos" },
      ],
      searchable: true,
    });
    open();

    fireEvent.change(field(), { target: { value: "cemetery" } });

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option").textContent).toContain("Classic Corporate Images");
  });

  it("says when nothing matches rather than showing an empty box", () => {
    bare();
    open();

    fireEvent.change(field(), { target: { value: "nothing like this" } });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("listbox").textContent).toContain("No matches.");
  });

  // A list that lives on the server is narrowed by asking it again, so the
  // term goes back to the caller and the options arrive already filtered.
  it("hands the term back instead of filtering, when asked to", () => {
    const onSearch = vi.fn();
    bare({ onSearch });
    open();

    fireEvent.change(field(), { target: { value: "touchb" } });

    expect(onSearch).toHaveBeenCalledWith("touchb");
    expect(screen.getAllByRole("option")).toHaveLength(12);
  });

  it("steps from the field into the list", () => {
    bare();
    open();

    fireEvent.keyDown(field(), { key: "ArrowDown" });

    expect(document.activeElement?.textContent).toBe("Option 0");
  });

  it("starts from nothing each time it opens", () => {
    bare();
    open();
    fireEvent.change(field(), { target: { value: "Option 3" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);

    fireEvent.click(screen.getByRole("combobox"));
    open();

    expect(screen.getAllByRole("option")).toHaveLength(12);
  });
});
