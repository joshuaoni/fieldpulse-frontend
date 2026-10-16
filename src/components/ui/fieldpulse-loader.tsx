import { useId } from "react";

const FRAME =
  "M77.2281 1.1813H9.74582C5.01579 1.1813 1.18134 5.01576 1.18134 9.74579V77.3757C1.18134 82.1057 5.01579 85.9402 9.74582 85.9402H77.2281C81.9581 85.9402 85.7926 82.1057 85.7926 77.3757V9.74579C85.7926 5.01576 81.9581 1.1813 77.2281 1.1813Z";
const GLYPH =
  "M17.3504 16.0957H69.6238C69.9956 16.0958 70.3521 16.243 70.6151 16.5058C70.8781 16.7689 71.0262 17.126 71.0262 17.498V49.0918C71.0262 52.0054 69.8626 54.7989 67.7938 56.8506L56.6922 67.8584C54.6459 69.8875 51.8807 71.0263 48.9988 71.0263H17.3504C16.9784 71.0263 16.6213 70.8783 16.3582 70.6152C16.0953 70.3521 15.9481 69.995 15.9481 69.623V55.1523C15.9481 54.7803 16.0952 54.4232 16.3582 54.1601C16.6213 53.8971 16.9784 53.75 17.3504 53.75H42.0106C42.3433 53.7499 42.6629 53.6171 42.8983 53.3818C43.1335 53.1464 43.2654 52.8269 43.2654 52.4941V44.373C43.2654 44.0402 43.1335 43.7207 42.8983 43.4853C42.6629 43.25 42.3433 43.1182 42.0106 43.1181H26.284C25.4618 43.1181 24.6731 42.7912 24.0916 42.2099C23.5101 41.6284 23.1834 40.839 23.1834 40.0166C23.1835 39.1942 23.5101 38.4057 24.0916 37.8242C24.6731 37.2427 25.4616 36.916 26.284 36.916H60.1727C60.5056 36.916 60.825 36.7832 61.0604 36.5478C61.2955 36.3125 61.4284 35.9938 61.4285 35.6611V26.3584C61.4285 26.0255 61.2957 25.706 61.0604 25.4707C60.825 25.2353 60.5056 25.1025 60.1727 25.1025H17.0555C16.7618 25.1025 16.48 24.9859 16.2723 24.7783C16.0646 24.5706 15.9481 24.2888 15.9481 23.9951V17.498C15.9481 17.126 16.0952 16.7689 16.3582 16.5058C16.6213 16.2428 16.9784 16.0957 17.3504 16.0957Z";
const CORNER = "M70.9197 53.7499L53.6023 70.9228V53.7499H70.9197Z";

const WAVE =
  "M0,3 Q10.875,-1 21.75,3 T43.5,3 T65.25,3 T87,3 T108.75,3 T130.5,3 T152.25,3 T174,3 V100 H0 Z";

const INK = "#102A3C";
const CORNER_INK = "#111723";

export function FieldPulseLoader({
  size = 48,
  label = "Loading…",
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glyphClip = `fp-glyph-${id}`;
  const cornerClip = `fp-corner-${id}`;

  return (
    <div className={`fp-loader flex items-center justify-center p-5 ${className}`}>
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 87 88"
        fill="none"
        aria-hidden
        width={size}
        height={(size * 88) / 87}
      >
        <defs>
          <clipPath id={glyphClip}>
            <path d={GLYPH} />
          </clipPath>
          <clipPath id={cornerClip}>
            <path d={CORNER} />
          </clipPath>
        </defs>

        <path d={FRAME} stroke={INK} strokeWidth="2.36262" />
        <path d={GLYPH} fill={INK} opacity={0.12} />
        <path d={CORNER} fill={CORNER_INK} opacity={0.12} />

        <g clipPath={`url(#${cornerClip})`}>
          <g
            className="fp-corner-liquid"
            style={{ animation: "fp-corner-rise 4s ease-in-out infinite" }}
          >
            <rect x="0" y="0" width="87" height="100" fill={CORNER_INK} />
          </g>
        </g>

        <g clipPath={`url(#${glyphClip})`}>
          <g
            className="fp-glyph-liquid"
            style={{ animation: "fp-glyph-rise 4s ease-in-out infinite" }}
          >
            <g style={{ animation: "fp-wave-b 4s linear infinite" }}>
              <path d={WAVE} fill={INK} opacity={0.35} transform="translate(0 -2)" />
            </g>
            <g style={{ animation: "fp-wave-a 2.6s linear infinite" }}>
              <path d={WAVE} fill={INK} />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
