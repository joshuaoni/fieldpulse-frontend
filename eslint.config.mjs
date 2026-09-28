import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Slices that own a domain. None of them may reach into another: if two need
 * the same thing, it belongs in `components/` or `lib/`.
 */
const SLICES = [
  "activity",
  "auth",
  "check-ins",

  "leads",
  "pairs",
  "plans",
  "reminders",
  "reports",
  "visits",
];

/**
 * Slices whose whole job is to compose the others — a dashboard is the sum of
 * what the domain slices already know. They read from the list above and are
 * read by nobody.
 */
const COMPOSITION = ["notifications", "overview"];

const ownSliceOnly = (slice) => ({
  files: [`src/features/${slice}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@/features/*",
              "@/features/*/**",
              `!@/features/${slice}`,
              `!@/features/${slice}/**`,
            ],
            message:
              "Features do not import each other (ARCHITECTURE.md §2). Move the shared thing to components/ or lib/.",
          },
        ],
      },
    ],
  },
});

const PALETTE =
  "(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)";

const COLOUR_LITERAL = `(bg|text|border|ring|divide|fill|stroke|from|via|to)-${PALETTE}-[0-9]{2,3}`;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  ...SLICES.map(ownSliceOnly),

  {
    files: [`src/features/{${COMPOSITION.join(",")}}/**`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [`@/features/{${COMPOSITION.join(",")}}/**`],
              message:
                "A composition slice reads the domain slices, never another composition slice (ARCHITECTURE.md §2).",
            },
          ],
        },
      ],
    },
  },

  {
    // The four owners named in ARCHITECTURE.md §1. Everything else goes
    // through them, so a rule about storage or configuration has one place to
    // live rather than a dozen.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/config.ts", "src/lib/local-storage.ts", "src/test/**", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Only lib/config.ts reads process.env (ARCHITECTURE.md §1).",
        },
        {
          object: "window",
          property: "localStorage",
          message: "Only lib/local-storage.ts touches localStorage (ARCHITECTURE.md §1).",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Only lib/local-storage.ts touches localStorage (ARCHITECTURE.md §1).",
        },
      ],
    },
  },

  {
    // Colours are decided once, in globals.css. A palette class here is a
    // decision made in a place nobody will think to look at again.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${COLOUR_LITERAL}/]`,
          message:
            "Use a token from globals.css, not a Tailwind palette class (ARCHITECTURE.md §6).",
        },
        {
          selector: `TemplateElement[value.raw=/${COLOUR_LITERAL}/]`,
          message:
            "Use a token from globals.css, not a Tailwind palette class (ARCHITECTURE.md §6).",
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
