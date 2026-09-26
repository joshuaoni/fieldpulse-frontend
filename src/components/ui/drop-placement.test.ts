import { afterEach, describe, expect, it, vi } from "vitest";
import { placeDrop } from "./drop-placement";

/** A control whose bottom edge sits `fromTop + height` down the screen. */
function anchor(fromTop: number, height = 40): HTMLElement {
  const element = document.createElement("button");
  element.getBoundingClientRect = () =>
    ({ top: fromTop, bottom: fromTop + height }) as DOMRect;

  return element;
}

const viewport = (height: number) => vi.stubGlobal("innerHeight", height);

afterEach(() => vi.unstubAllGlobals());

describe("where a panel should open", () => {
  it("opens downward when there is room", () => {
    viewport(800);

    expect(placeDrop(anchor(100)).side).toBe("below");
  });

  // The case this exists for: the last stop of a day, at the foot of the
  // page, where a panel dropping downward is simply not on the screen.
  it("opens upward when the control is near the bottom", () => {
    viewport(800);

    expect(placeDrop(anchor(700)).side).toBe("above");
  });

  /**
   * A panel that changed sides on every open would be harder to use than one
   * that never did, so below has to be genuinely too tight — not merely
   * tighter than above.
   */
  it("stays below while below still fits", () => {
    viewport(800);

    expect(placeDrop(anchor(400, 40)).side).toBe("below");
  });

  it("gives back the height that is actually there, not the one asked for", () => {
    // 300 tall, control ending 100 down: 192 below, which beats the 52 above
    // but is short of the 240 wanted.
    viewport(300);

    const { maxHeight, side } = placeDrop(anchor(60, 40), 240);
    expect(side).toBe("below");
    expect(maxHeight).toBe(192);
  });

  // Cramped on both sides, it scrolls rather than shrinking to nothing.
  it("keeps a usable height when neither side has room", () => {
    viewport(200);

    expect(placeDrop(anchor(80, 40), 240).maxHeight).toBeGreaterThanOrEqual(120);
  });

  it("assumes downward when there is nothing to measure", () => {
    expect(placeDrop(null)).toEqual({ side: "below", maxHeight: 240 });
  });
});
