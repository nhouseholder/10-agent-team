---
name: website-design-agent
description: "Unified website design agent — creative direction, design references, critique, visual audit, and design tokens in one skill. Use for any web design task: build, redesign, review, critique, or audit."
weight: heavy
---

# Website Design Agent

One agent. Six disciplines. 58 brand references. Everything you need to design, build, audit, and critique production-grade websites.

## When This Fires

- Building any website, webapp, landing page, dashboard, or UI component
- Redesigning or restyling an existing site
- Running `/site-redesign`, `/site-review`, `/site-update`
- Any request involving: design, build, create, style, improve, review, audit, critique UI/UX
- Frontend composite agent profile triggers

---

## Phase 1: UNDERSTAND (Creative Direction)

Before writing a single line of code, commit to a **BOLD aesthetic direction**.

### Design Thinking
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme — brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Constraints**: Framework, performance, accessibility requirements
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Bold maximalism and refined minimalism both work — the key is intentionality, not intensity. If it looks like a template, it's wrong.

### Anti-Generic Mandate
NEVER produce:
- Generic fonts (Inter, Roboto, Arial, Open Sans, Lato, Montserrat, Space Grotesk as defaults)
- Purple gradients on white backgrounds
- Cookie-cutter 3-column grids with identical cards
- Predictable hero → features → testimonials → CTA layouts

Every design must feel genuinely crafted for its specific context.

---

## Phase 2: RESEARCH (Brand References + Design System)

### Step 2A: Brand Reference Lookup (awesome-design-md)

If the user references a specific brand/style or you need design inspiration, check:

```
~/.claude/skills/website-design-agent/design-refs/<brand>/DESIGN.md
```

**58 brands available** — exact color palettes, typography specs, spacing systems, component patterns:

| Category | Brands |
|----------|--------|
| **AI & ML** | claude, cohere, mistral.ai, ollama, together.ai, x.ai, opencode.ai, minimax, replicate |
| **Dev Tools** | cursor, linear.app, vercel, supabase, sentry, posthog, expo, warp, raycast, hashicorp |
| **Design** | figma, framer, webflow, miro, notion, cal, mintlify, lovable, sanity |
| **Infra & Cloud** | mongodb, clickhouse, resend |
| **Fintech** | stripe, coinbase, wise, revolut, kraken |
| **Enterprise** | apple, spotify, uber, airbnb, pinterest, spacex, nvidia, ibm, superhuman, zapier, airtable, intercom, elevenlabs, runwayml, clay, composio |
| **Auto** | tesla, ferrari, bmw, lamborghini, renault |

**Usage**: When building "a dashboard like Linear" → read `design-refs/linear.app/DESIGN.md` for exact tokens. When the user says "Stripe-inspired checkout" → read `design-refs/stripe/DESIGN.md`.

### Step 2B: Design System Generation (search.py)

Generate comprehensive design recommendations from the searchable database:

```bash
python3 ~/.claude/skills/website-design-agent/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

**Domain searches** for specific needs:

| Need | Command |
|------|---------|
| Style options | `--domain style "glassmorphism dark"` |
| Font pairings | `--domain typography "elegant luxury"` |
| Color palettes | `--domain color "saas fintech"` |
| Landing structure | `--domain landing "hero social-proof"` |
| UX rules | `--domain ux "animation accessibility"` |
| Chart guidance | `--domain chart "real-time dashboard"` |
| Stack guidelines | `--stack html-tailwind` (or react, nextjs, vue, svelte, shadcn) |

### Step 2C: Expert References (read before implementing)

Deep-dive reference docs with expert-level specifics — exact values, not generic rules:

| Reference | When to Read | Location |
|-----------|-------------|----------|
| Typography | Font selection, pairing, hierarchy, modular scales | `reference/typography.md` |
| Color & Contrast | Palette creation, OKLCH, theming, dark mode | `reference/color-and-contrast.md` |
| Motion Design | Animations, 100/300/500ms rule, easing curves | `reference/motion-design.md` |
| Spatial Design | Layout, 4pt grid, spacing, container queries | `reference/spatial-design.md` |
| Interaction Design | 8 states per element, focus, dialog/popover API | `reference/interaction-design.md` |
| Responsive Design | Content-driven breakpoints, pointer queries | `reference/responsive-design.md` |
| UX Writing | Microcopy, error formulas, empty states | `reference/ux-writing.md` |
| Theme Library | Pre-built theme combinations | `reference/theme-library.md` |

**Read the reference before implementing. Don't apply from memory — the specifics matter.**

### Step 2D: Design Token Generation

Generate complete design system tokens from a brand color:

```bash
python3 ~/.claude/skills/website-design-agent/scripts/design_token_generator.py [brand_color] [style] [format]
```
- Styles: modern, classic, playful
- Formats: json, css, scss
- Outputs: color palette, modular type scale, 8pt spacing, shadows, animations, breakpoints

---

## Phase 3: BUILD (Implementation)

### Frontend Aesthetics

- **Typography**: Distinctive, characterful font choices. Pair a display font with a refined body font. Never default to Inter/Roboto.
- **Color**: Dominant colors with sharp accents. CSS variables for consistency. 60-30-10 rule. Tinted neutrals (chroma 0.01, not pure gray).
- **Motion**: High-impact moments — staggered page load reveals, scroll-triggered animations, surprising hover states. CSS-only for HTML; **Framer Motion for React** (`npm install framer-motion`). Timing: 100ms micro, 300ms transition, 500ms orchestration.

### Framer Motion Patterns (React projects)
When `framer-motion` is installed or the project is React-based, use these:
- **Animate on mount**: `<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>`
- **Exit animations**: Wrap in `<AnimatePresence>` for unmount transitions
- **Staggered reveals**: Parent `transition={{ staggerChildren: 0.1 }}` + children `variants`
- **Scroll effects**: `useScroll()` + `useTransform(scrollYProgress, [0, 1], [0, -50])` for parallax
- **Hover/tap**: `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.98 }}` — subtle, not cartoonish
- **Layout animations**: `layout` prop on `motion.div` for smooth reflows (list reorder, expand/collapse)
- **Performance**: Use `willChange` sparingly. Prefer `transform`/`opacity` over `width`/`height`. Exit animations need `key` on `AnimatePresence` children.
- **Spatial**: Unexpected layouts. Asymmetry. Overlap. Grid-breaking. Generous negative space OR controlled density. 4pt base grid.
- **Atmosphere**: Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays. Never default to solid white/dark backgrounds.

### 21st.dev Component Library (on-demand)
Premium UI building blocks — hero sections, feature grids, pricing tables, testimonials, CTAs, and more. **Not an always-on MCP** — install per-project when building fresh UIs:
```bash
claude mcp add magic -- npx -y @21st-dev/magic@latest
```
Use when: starting a new site/landing page and need polished component scaffolding faster than building from scratch. Don't use for: minor updates to existing sites (adds unnecessary MCP overhead). After the build session, the MCP can be removed.

### Library Discipline
If a UI library (Shadcn, Radix, MUI) is detected: **USE IT**. Don't build custom primitives. Wrap/style library components for the aesthetic, but the underlying primitive must come from the library.

### Design Normalization (existing sites only)
When updating an existing site (not fresh build):
1. Audit existing design tokens from CSS/config
2. Identify elements that drift from the project's own system
3. Normalize drifted elements to existing tokens BEFORE adding new ones
4. Never mix systems (if Tailwind custom colors, extend tailwind.config — don't add inline OKLCH)

---

## Phase 4: AUDIT (Visual Quality Gate)

### 4A: 7-Pillar Visual Audit (Refactoring UI)

Run each check. Score pass/fail. Fix failures before delivery.

| Pillar | Key Check |
|--------|-----------|
| **Hierarchy** | ONE dominant element per section. 3-4 font sizes max. Labels quieter than values. |
| **Spacing** | Consistent scale (4,8,12,16,24,32,48,64). More space between groups than within. Double the padding. |
| **Color** | 1 primary + 1 accent + neutrals. Tinted grays. 4.5:1 contrast minimum. |
| **Typography** | Max 2 families. Line-height 1.5 body / 1.2 headings. 45-75 char line length. |
| **Shadows** | 2-3 levels max. Tinted, semi-transparent. Elevation = interactivity. |
| **Borders** | Use spacing/color to separate, not borders. Remove half your borders. |
| **Icons** | Consistent style (all outline OR all filled). Consistent sizing. No emojis as icons. |

### 4B: AI Slop Detection (MANDATORY)

Scan output for these 10 AI-generated fingerprints. **3+ matches = SLOP. Redesign before delivering.**

| # | Fingerprint | Fix |
|---|---|---|
| 1 | Inter/Roboto/Open Sans default | See `reference/typography.md` for alternatives |
| 2 | Purple gradient hero | Brand-specific palette |
| 3 | Cards-in-cards nesting | Spacing + typography for hierarchy |
| 4 | Gray text on colored bg | Tinted neutrals or bg-color transparency |
| 5 | Glassmorphism everywhere | Reserve for 1-2 elements max |
| 6 | Hero metrics row (Users: 10K+) | Real data only |
| 7 | Generic gradient buttons | Solid color, intentional hover |
| 8 | Identical section rhythm | Vary layout, break the grid |
| 9 | Stock testimonials | Real quotes or skip |
| 10 | SVG blob backgrounds | Brand-aligned visual texture |

**Slop score**: 0-1 = clean. 2 = borderline (fix matches). 3+ = redesign.

---

## Phase 5: CRITIQUE (Quantitative Evaluation)

Run after implementation for quantitative UX scoring.

### 5A: Nielsen's Heuristics (/40)

Score each 0-4 (read `critique/heuristics-scoring.md` for full guide):

1. Visibility of System Status
2. Match Between System and Real World
3. User Control and Freedom
4. Consistency and Standards
5. Error Prevention
6. Recognition Rather Than Recall
7. Flexibility and Efficiency of Use
8. Aesthetic and Minimalist Design
9. Help Users Recover from Errors
10. Help and Documentation

| Score | Rating | Action |
|-------|--------|--------|
| 36-40 | Excellent | Minor polish |
| 28-35 | Good | Address weak areas |
| 20-27 | Acceptable | Significant improvements |
| 12-19 | Poor | Major UX overhaul |
| 0-11 | Critical | Redesign |

### 5B: Cognitive Load (8-item checklist)

Read `critique/cognitive-load.md`. Check: single focus, chunking (4 items max), grouping, visual hierarchy, one decision at a time, minimal choices (4 max), no cross-screen memory, progressive disclosure.

4+ failures = high cognitive load = critical fix.

### 5C: Persona Testing

Read `critique/personas.md`. Pick 2-3 relevant personas:

| Persona | Tests For |
|---------|-----------|
| **Alex** (Power User) | Keyboard shortcuts, bulk actions, efficiency |
| **Jordan** (First-Timer) | Guidance, clarity, onboarding |
| **Sam** (Accessibility) | Screen reader, keyboard-only, 4.5:1 contrast |
| **Riley** (Stress Tester) | Edge cases, empty states, long strings |
| **Casey** (Mobile) | Thumb-only, interruptions, slow connection |

Walk through the primary user action as each persona. Report specific red flags.

---

## Pre-Delivery Checklist

Before delivering ANY design work:

- [ ] **Slop score < 3** (Phase 4B)
- [ ] **7-pillar audit passed** (Phase 4A — all 7 pass)
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback (150-300ms transitions)
- [ ] Focus states visible for keyboard navigation (`:focus-visible`)
- [ ] Light/dark mode text has sufficient contrast (4.5:1)
- [ ] No emojis as icons (use SVG — Heroicons, Lucide)
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] `prefers-reduced-motion` respected
- [ ] Brand logos verified (Simple Icons)
- [ ] No content hidden behind fixed navbars

---

## Output Formats

### Build Output
1-sentence design rationale → code

### Audit Output
```
VISUAL AUDIT — [project]
Hierarchy:  PASS/FAIL — [detail]
Spacing:    PASS/FAIL — [detail]
Color:      PASS/FAIL — [detail]
Typography: PASS/FAIL — [detail]
Shadows:    PASS/FAIL — [detail]
Borders:    PASS/FAIL — [detail]
Icons:      PASS/FAIL — [detail]
Slop Score: [N]/10
Top 3 fixes: [specific changes with exact values]
```

### Critique Output
```
DESIGN CRITIQUE — [project]
HEURISTICS: [N]/40 — [rating]
COGNITIVE LOAD: [Low/Moderate/High] ([N]/8 passed)
PERSONA TESTING: [results per persona]
TOP ISSUES: P0 → P1 → P2 → P3
RECOMMENDATION: [Ship / Fix first / Rework]
```
