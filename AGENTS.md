<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Current Build Status
- Listings API: Done and tested
- Orders API: Done and tested
- Frontend: All pages functional and styled
- Backend: Python/FastAPI on port 8000
- Frontend: Next.js on port 3000

## Design System (Styling Pass — July 2026)

### Color Palette
All colors are defined as CSS custom properties in `app/globals.css` under `@theme inline` and available as Tailwind utilities.

| Token            | Hex       | Usage                                     |
|------------------|-----------|-----------------------------------------|
| `primary`        | `#2D6A4F` | Main brand green — buttons, links, accents |
| `primary-light`  | `#40916C` | Hover states for primary                  |
| `primary-dark`   | `#1B4332` | Gradient start, deep contrast             |
| `accent`         | `#D4A373` | Warm earthy accent — tags, highlights     |
| `accent-light`   | `#E9C99E` | Lighter accent for hero text              |
| `cream`          | `#FEFAE0` | Page background                           |
| `charcoal`       | `#2B2D42` | Headings, primary text                    |
| `muted`          | `#6B7280` | Secondary text, labels                    |
| `border`         | `#E5E7EB` | Subtle borders                            |
| `surface`        | `#FFFFFF` | Cards, modals                             |
| `error`          | `#DC2626` | Error states                              |
| `success`        | `#16A34A` | Success states                            |
| `emergency`      | `#B91C1C` | Emergency badges, alerts                  |
| `chat-user`      | `#EDF6F0` | Chat bubble tint (user)                   |
| `chat-agent`     | `#F3F4F6` | Chat bubble tint (agent)                  |

### Typography
- Font: Geist Sans (loaded via `next/font/google`)
- Headings: `font-bold`, charcoal color, tight letter-spacing
- Body: `text-sm` / `text-base`, muted color for secondary text

### Component Patterns
- **Cards**: `bg-white rounded-xl border border-border shadow-sm p-6` with gradient top accent bar (`h-1.5` or `h-2`)
- **Buttons (primary)**: `bg-primary text-white rounded-lg hover:bg-primary-light`
- **Buttons (danger)**: `bg-emergency text-white` for emergency actions
- **Buttons (success)**: `bg-success text-white` for verification/fulfill
- **Inputs**: Full-width, `border-border rounded-lg`, focus ring in primary green (defined globally in CSS)
- **Error banners**: `bg-error/10 border border-error/20 text-error rounded-lg`
- **Success banners**: `bg-success/10 border border-success/20 text-success rounded-lg`
- **Back links**: Arrow icon + text, `text-muted hover:text-primary`
- **Status badges**: `text-xs font-semibold px-2.5 py-1 rounded-full` with semantic color bg

### Layout
- `max-w-7xl mx-auto px-4 md:px-8` for wide pages (listings, emergency)
- `max-w-3xl` for detail pages, `max-w-lg` for forms
- Navbar: sticky, glassmorphism (`bg-white/80 backdrop-blur-md`), responsive hamburger
- Footer: simple with logo, quick links, copyright

### Key Decisions
- **React Three Fiber**: Used for subtle, professional 3D accents across key pages (see 3D Integration below)
- **No Framer Motion**: CSS transitions sufficient for current scope
- **Tailwind v4**: Using `@theme inline` directive for custom colors

### 3D Integration (React Three Fiber — July 2026)

**Direction**: Aesthetic, refined, premium. Muted glass/gradient materials, soft ambient lighting, slow gentle motion. Low-poly abstract geometry (icosahedrons, tori) with instanced particles. Colors stay within the existing green/cream/accent palette — never fighting the design system.

**Architecture — Persistent Background Layer**:
- A single `<AmbientBackground>` component is rendered in the root `layout.tsx`
- It creates a `position: fixed; inset: 0` canvas behind all content (z-index: 0)
- The component reads `usePathname()` to automatically adjust intensity and color:
  - **high**: Landing page (`/`) — larger orbs, more particles, higher opacity
  - **medium**: Default for most pages
  - **low**: Dense data pages (`/listings`, `/farmer/*`, `/admin/*`, `/orders`)
  - **minimal**: Emergency pages (`/emergency/*`) — muted gray palette, very slow
- All 3D components live in `app/components/3d/`

**Key Files**:
- `AmbientBackground.tsx` — Client wrapper, reads route, passes intensity/mood props
- `AmbientCanvas.tsx` — Actual Three.js Canvas (dynamically imported, `ssr: false`)
- `FloatingParticles.tsx` — Instanced mesh particle system
- `Shapes.tsx` — Reusable primitives: `GlassOrb` (accepts `opacity` prop), `OrbitRing`, `AbstractLeaf`
- `AmbientScene.tsx` — **DEPRECATED** (old per-page variant approach, no longer imported)

**Performance constraints**:
- Single canvas for entire app (not per-page) — one WebGL context
- Canvas uses `dpr={[1, 1.5]}` and `powerPreference: "low-power"`
- Particles use `instancedMesh` (single draw call), max ~40 globally
- Lazy-loaded via `next/dynamic` — zero impact on initial page render
- All 3D elements are `pointer-events-none` and `aria-hidden="true"`

### Category Visual System

Category colors are defined in `app/lib/categoryStyles.ts` and used by:
- `CategoryBrowse.tsx` (homepage tiles — gradient backgrounds + SVG icons)
- Listings page filter chips (colored when active, tinted when inactive)

| Category   | Gradient                             | Hex       | Icon   |
|-----------|--------------------------------------|-----------|--------|
| Vegetables | `from-[#2D6A4F] to-[#40916C]`      | `#2D6A4F` | leaf   |
| Fruits     | `from-[#E8913A] to-[#F6B352]`      | `#E8913A` | apple  |
| Grains     | `from-[#8B6F47] to-[#C4A265]`      | `#8B6F47` | wheat  |
| Spices     | `from-[#C2432D] to-[#E86A50]`      | `#C2432D` | flame  |

### Glassmorphism System

Two CSS utility classes defined in `globals.css`:
- `.glass-card` — `bg-white/75 backdrop-blur-[12px]` with subtle border — used for cards
- `.glass-card-strong` — `bg-white/88 backdrop-blur-[16px]` — used for forms, modals, summaries

Applied consistently across all pages so cards appear translucent against the 3D background.

### Structural Decisions (Styling Pass — July 2026)

- **Landing vs. Dashboard split**: `app/page.tsx` renders a marketing landing page (hero, features, social proof, CTA) for logged-out users and a dashboard (greeting, quick actions, category browse tiles) for logged-in users. This is the established pattern — do not show the hero/marketing content to logged-in users.
- **AI Agent → Floating Chat Widget**: The AI chat lives in `app/components/ChatWidget.tsx` (Intercom/Crisp pattern) — a fixed bottom-right floating bubble that expands into a 360×500 chat panel. It is NOT a nav link or standalone page. `/agent` redirects to `/`.
- **Listings + Create Listing merged**: There is a single `/listings` page. For FARMER users, a "+ New Listing" button toggles an inline create form with collapsible "Additional details" for optional fields. `/listings/new` redirects to `/listings`.
- **Category filtering**: The listings page reads `?category=` from the URL and passes it to the API. Category filter pills are shown at the top. The dashboard's `CategoryBrowse` tiles link to `/listings?category=X`.
- **Cart + Checkout flow**: `/cart` shows items with thumbnails, quantities, and remove controls. `/checkout` has a 3-step flow: order summary → payment (Razorpay or mock) → confirmation screen with farmer contact info for pickup coordination. **No delivery language** — users pick up from the farmer directly.
- **Cart badge**: Navbar shows a cart icon with item count badge for CONSUMER users. Updates via `cart-updated` custom DOM event.
- **Hero animations**: CSS `@keyframes` in `globals.css` — `hero-float-*` for floating produce icons, `hero-blob` for gradient blobs, `hero-pulse` for subtle opacity animation (retained alongside 3D).

