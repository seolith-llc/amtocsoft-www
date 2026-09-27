# Design Tokens

This documents the design system the site actually uses (see `styles.css` `:root`).
All new UI should use these tokens instead of one-off values.

## Palette

Dark-theme only. All text colors below meet WCAG AA (4.5:1) on the deep background.

| Token | Value | Use |
| --- | --- | --- |
| `--bg-deep` | `#0c0a1a` | Page background |
| `--bg-surface` | `#110e24` | Raised surface |
| `--bg-card` | `rgba(255,255,255,0.04)` | Glass card fill |
| `--glow-pink` | `#ec4899` | Primary accent |
| `--glow-purple` | `#8b5cf6` | Secondary accent |
| `--glow-orange` | `#f97316` | Price / highlight accent |
| `--glow-coral` | `#fb7185` | Fourth accent (counters, icons) |
| `--text-primary` | `#fafafa` | Headings, body emphasis |
| `--text-secondary` | `#a1a1aa` | Body copy, muted labels |
| `--text-dim` | `#81818a` | Meta text, inactive icons (AA on `--bg-deep`) |
| `--success` | `#4ade80` | Valid/success feedback |
| `--error` | `#f87171` | Invalid/error feedback |
| `--glass-border` | `rgba(255,255,255,0.08)` | Card/input borders |
| `--glass-border-hover` | `rgba(255,255,255,0.15)` | Border on hover |
| `--glass-blur` | `blur(20px)` | Glass backdrop |

Gradients: primary action = `linear-gradient(135deg, var(--glow-pink), var(--glow-orange))`.
The tri-color `pink → purple → orange` gradient is reserved for brand marks
(logo text, 404 headline, final-cta banner, pipe-fill).

The standalone legal pages (`terms`, `privacy`, `license`, `refund-policy`,
`acceptable-use`) and `404.html` carry their own inline styles using the same
accent hues; body text there uses warm/lavender neutrals (`#f0e8d0`, `#c8b8e0`,
`#d8cce8`) — keep them readable, prefer the accent hexes above for anything new.

## Typography

Fonts: `--font-sans` = 'Plus Jakarta Sans', system-ui, sans-serif;
`--font-mono` = 'JetBrains Mono', 'Fira Code', monospace.

Scale (mobile → desktop where responsive):

- Display (hero h1): 2.2rem → 3rem (768px+) → 3.5rem (1024px+), weight 800
- Counter value: 4rem → 5rem → 5.5rem, weight 800
- Section title (`.stage-title`): 2.2rem → 2.5rem, weight 800
- Final CTA h2: 2.5rem, weight 800
- Card title: 1.15rem, weight 700
- Lead (`.stage-subtitle`, `.final-cta p`): 1.1rem
- Body: 1rem, line-height 1.6–1.7
- Small (nav links, card copy, table): 0.875–0.95rem
- Meta (footer bottom, review meta): 0.8rem
- Micro (badges, pipeline stat): 0.75–0.8rem, uppercase, letter-spacing 0.08–0.1em

## Spacing

8px-based scale with 4px half-steps: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96.
Section rhythm: `.stage` padding 100px 0; card padding 32px; grid gaps 16–24px;
container padding 24px inline.

## Corner radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 8px | Small utility buttons (copy button) |
| `--radius-md` | 12px | Buttons, inputs, tables, badges, terminal |
| `--radius-lg` | 16px | Cards (`.glass-card`, review cards, forms) |
| `--radius-pill` | 100px | Pill badges |

## Components

- **Primary button** (`.btn-primary`, `.nav-cta`, form submit/apply): pink→orange
  gradient, white text, weight 600, `--radius-md`, pink glow shadow. Sizes:
  default 14px/32px padding (1rem), small (`.btn-sm`) 11px/24px (0.875rem).
  Buttons and controls keep a ~44px minimum tap target for touch.
- **Outline button** (`.btn-outline`): glass fill, `--glass-border`, `--radius-md`,
  same sizes as primary.
- **White button** (`.btn-white`): only on the tri-color final-cta banner.
- **Card** (`.glass-card` and variants): `--bg-card` fill, glass blur,
  `--glass-border`, `--radius-lg`, 32px padding (24px for compact rows).
- **Input** (`.referral-input`, `.review-form` fields): translucent white fill
  (0.05–0.06), `--glass-border`, `--radius-md`, purple border on focus.
- **Feedback text**: `--success` / `--error` only.
