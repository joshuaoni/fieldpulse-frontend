# FieldPulse Frontend — Architecture & Rules

An installable PWA used one-handed, outdoors, on a mid-range Android phone,
often on a bad connection. Every rule below exists because of that sentence.

Next.js 16 (App Router) · React 19 · Tailwind 4 · TypeScript.

---

## 1. Non-negotiables

1. **No login of its own.** Sign-in posts to the **ERP**; the token it issues is carried to FieldPulse. Two base URLs, never one.
2. **Nothing calls `fetch` directly** except `lib/api-client.ts`.
3. **Nothing reads `localStorage` directly** except `lib/token.ts`.
4. **Nothing reads `process.env` directly** except `lib/config.ts`.
5. **No colour literal in a component.** Every colour is a token from `globals.css`.
6. **Offline is the default assumption**, not an error state.

---

## 2. Directory layout

```
src/
├── app/                     # routing ONLY — thin shells, no logic
│   ├── layout.tsx           # providers, metadata, viewport
│   ├── manifest.ts          # typed web app manifest
│   ├── page.tsx
│   ├── login/page.tsx
│   └── offline/page.tsx
├── features/                # one folder per domain slice
│   └── auth/
│       ├── api.ts           # every server call for this feature
│       ├── types.ts         # response shapes
│       ├── hooks.ts         # feature state (added when needed)
│       └── components/      # feature-owned UI
├── components/
│   ├── ui/                  # generic, domain-free primitives
│   ├── brand-mark.tsx
│   ├── require-session.tsx
│   └── service-worker-registrar.tsx
└── lib/                     # cross-cutting infrastructure
    ├── api-client.ts        # the only fetch wrapper
    ├── config.ts            # the only process.env reader
    ├── errors.ts            # ApiError
    ├── session.tsx          # session provider + useSession
    └── token.ts             # the only localStorage accessor
```

Planned feature slices: `visits`, `leads`, `plans`, `reminders`.

### Which folder does this go in?

| It is…                                                       | It goes in                |
| ------------------------------------------------------------ | ------------------------- |
| A URL                                                        | `app/` — and nothing else |
| Specific to visits, leads, plans                             | `features/<slice>/`       |
| Reusable and domain-free (Button, TextField)                 | `components/ui/`          |
| Reusable and FieldPulse-specific (BrandMark, RequireSession) | `components/`             |
| Infrastructure every feature needs                           | `lib/`                    |

**Features never import from each other.** If `visits` needs something from
`leads`, that shared thing belongs in `lib/` or `components/`. 

**No barrel files** (`index.ts` re-exports). They defeat tree-shaking and
create import cycles that only surface at build time.

---

## 3. Routes are thin

An `app/**/page.tsx` may lay out a screen and compose feature components. It
must not hold data-fetching, business rules, or a form's state.

```tsx
// app/login/page.tsx — the whole file
export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}
```

**Server Components by default; `"use client"` only where it earns its place** —
browser APIs (camera, geolocation, storage), event handlers, or hooks. The
session lives in `localStorage`, so most _interactive_ screens are client
components; static ones (`/offline`, the login shell) stay server components.

`/offline` must never read the session or call the API: it renders from the
service worker cache with no network and no token.

---

## 4. Data access

Everything goes through `lib/api-client.ts`, which exposes `api()` for
FieldPulse and `erp()` for the ERP. It sets `Accept`, attaches the bearer
token, clears the token on 401, and converts every non-2xx into an `ApiError`
carrying `status` and — for a 422 — the backend's stable `code`.

**Branch on `error.code`, never on the message.** The backend's `RefusedError`
codes (`NO_OPEN_CHECK_IN`, `CHECK_IN_ALREADY_RECORDED`) are the contract;
message text is for humans and will change.

Each feature owns `features/<slice>/api.ts`. Components call those functions —
they never build a URL or know a path. Response types live in
`features/<slice>/types.ts` and mirror the backend exactly.

### Server state

**TanStack Query** is the data layer, introduced with the first real endpoint.
It is not optional dressing here: it gives retry-on-reconnect, cache-while-
revalidate, and — through `persistQueryClient` and mutation resumption — the
durable offline mutation queue the check-in flow requires. Hand-rolling that
in `useEffect` is how this app would rot.

- Server state → TanStack Query. **Never** mirrored into `useState`.
- UI state (open menu, form draft) → local `useState`.
- Session → the `useSession` context.
- No Redux, no Zustand, no global store. If something feels like it needs one, it is server state wearing a disguise.

Query keys are arrays, namespaced by feature: `["visits", "list", filters]`.

---

## 5. Offline

**a check-in recorded offline must survive an app
kill, a reboot, and a week in a drawer.**

- Mutations made offline go to a durable IndexedDB queue and replay in recorded order on reconnect.
- The client records `clientLocalCheckInAt` for **ordering only**. The server assigns the authoritative timestamp. The UI must never present a client time as the verified one.
- Reads may render cached data, but anything stale must say so.
- The service worker **never caches `/api/*`** — a stale visit list or a replayed check-in response would undermine the verification guarantee the product rests on.
- `navigator.onLine` is a liar (it reports `true` on WiFi with no upstream). Treat a failed request as the real offline signal.

Queue state is visible to the user: how many actions are pending, and when
they last synced. Silent queues destroy trust in exactly the product whose
whole point is trust.

---

## 6. Styling

Tailwind 4 with design tokens defined once in `app/globals.css` and exposed
through `@theme inline` — `bg-surface`, `text-muted`, `border-border`,
`bg-brand`. Both light and dark are defined; a token defined in only one mode
is a bug.

- **Never** `#10543e`, `text-green-800`, or an inline `style` colour in a component.
- Tap targets are at least 44px (`min-h-11`). One-handed, outdoors, in a hurry.
- Inputs use `text-base` (16px) minimum, or iOS Safari zooms the viewport on focus.
- Respect `env(safe-area-inset-*)` — the app runs standalone, under the notch.
- Decorative SVG gets `aria-hidden`; every input gets a real `<label>`; every error gets `role="alert"`.

---

## 7. Conventions

- **Files** `kebab-case.tsx`. **Components** `PascalCase`. **Hooks** `useThing`. **Functions/variables** `camelCase`.
- Named exports everywhere except `app/**/page.tsx` and `layout.tsx`, which Next requires to be default.
- Imports use the `@/` alias, never `../../..`.
- Prettier + ESLint are the arbiters: `npm run format:check && npm run lint && npm run typecheck` must be green.
- Comments explain **why**, never what. A comment restating the code is deleted.

---

## 8. Environment

`NEXT_PUBLIC_*` values are **inlined at build time**, not read at runtime:

- Each environment needs its own build.
- Changing `.env` requires restarting `npm run dev` — a browser refresh will not do it.
- `lib/config.ts` throws on a missing variable, so a misconfigured build fails loudly rather than quietly pointing at the wrong server.

---

## 9. PWA

| Piece                                     | Rule                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `app/manifest.ts`                         | Typed manifest. `display: standalone`.                               |
| `public/sw.js`                            | Hand-written. Bump `CACHE_VERSION` when the precached shell changes. |
| `components/service-worker-registrar.tsx` | Production only — an active worker serves stale bundles in dev.      |
| `public/icons/`                           | All four files. Dropping one degrades installability.                |

The worker is hand-written rather than generated: the offline mutation queue, web push, and Android's
Notification Triggers.

---

## 10. Testing

- **Vitest + Testing Library** for units, added with the first real logic.
- **Playwright** for the check-in journey — the offline path cannot be trusted to manual testing.
- Test behaviour through the DOM, not implementation details. Mock at `lib/api-client.ts`, never deeper.
- The offline queue gets tests for: survives reload, replays in order, does not double-submit, and never presents a client timestamp as verified.

---

## 11. Definition of done

- [ ] Route file is thin; logic lives in a feature slice.
- [ ] Server calls go through `features/<slice>/api.ts` → `lib/api-client.ts`.
- [ ] Types mirror the backend response.
- [ ] Loading, empty, error **and offline** states all handled.
- [ ] Colours are tokens; tap targets ≥ 44px; inputs labelled.
- [ ] Works at 360px wide.
- [ ] `npm run format:check && npm run lint && npm run typecheck && npm run build` green.
