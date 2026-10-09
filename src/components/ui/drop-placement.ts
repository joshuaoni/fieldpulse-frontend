export interface DropPlacement {
  side: "below" | "above";
  maxHeight: number;
}

const FLOOR = 120;

/**
 * Which side of a control its panel should open on, and how tall it may be.
 */
export function placeDrop(anchor: HTMLElement | null, wanted = 240, gap = 8): DropPlacement {
  if (!anchor || typeof window === "undefined") return { side: "below", maxHeight: wanted };

  const rect = anchor.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - gap;
  const above = rect.top - gap;

  const side = below >= wanted || below >= above ? "below" : "above";
  const room = side === "below" ? below : above;

  return { side, maxHeight: Math.max(FLOOR, Math.min(wanted, room)) };
}

export interface DropAnchor extends DropPlacement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

export function anchorDrop(anchor: HTMLElement | null, wanted = 240, gap = 8): DropAnchor {
  const placement = placeDrop(anchor, wanted, gap);
  if (!anchor || typeof window === "undefined") return { ...placement, left: 0, width: 0, top: 0 };

  const rect = anchor.getBoundingClientRect();
  const box = { ...placement, left: rect.left, width: rect.width };

  return placement.side === "below"
    ? { ...box, top: rect.bottom + gap }
    : { ...box, bottom: window.innerHeight - rect.top + gap };
}
