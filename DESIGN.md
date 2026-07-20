# MacroPad Visual Design System

## Direction

**Working name:** Signal Deck  
**Theme:** precision instrument, quiet futuristic, tactile control  
**Keywords:** graphite, focused light, compact, responsive, trustworthy

The design avoids the legacy UI's full-screen wallpaper, repeated glass pills, viewport-relative typography, and ornamental blur. Depth comes from tonal surfaces, fine borders, and selective illumination. Accent color communicates focus and device energy; it is not washed across every surface.

## Reference rationale

- Elgato validates action libraries, pages/folders, multi-actions, profiles, virtual buttons, and extensibility.
- Logitech validates application-aware profiles and the importance of analog-control affordances.
- Razer/Loupedeck validates a unified surface for buttons, displays, and dials.

The product adopts those interaction conventions but uses original layout proportions, iconography, copy, tokens, and device visualization.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#090B10` | Window background |
| `surface1` | `#10141C` | Sidebars and base panels |
| `surface2` | `#171C26` | Cards and controls |
| `surface3` | `#202735` | Hover/elevated controls |
| `line` | `#2B3444` | Dividers and boundaries |
| `text` | `#F4F7FB` | Primary text |
| `textMuted` | `#9AA6B7` | Secondary text |
| `accent` | `#43D9C5` | Focus, selection, ready state |
| `accentStrong` | `#78F3E2` | High-contrast accent text |
| `violet` | `#8D7CFF` | Secondary category/profile accent |
| `success` | `#54D68B` | Confirmed/safe state |
| `warning` | `#F3B95F` | Attention/recoverable issue |
| `danger` | `#FF6577` | Muted/recording/destructive depending context |

Red is contextual and always accompanied by icon/text. Microphone muted may use red; microphone live uses green plus “Live.”

## Typography

- UI sans: `Inter`, `Segoe UI`, system sans-serif.
- Technical/telemetry: `JetBrains Mono`, `SFMono-Regular`, monospace.
- Base size: 14 px.
- Display: 28/34, weight 650.
- Page title: 20/28, weight 650.
- Section title: 14/20, weight 650.
- Body: 14/21, weight 450.
- Caption: 12/17, weight 500.

Do not use ultra-light text. Avoid all-caps except tiny status labels with increased tracking.

## Spacing and geometry

- Base unit: 4 px.
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Control height: 36 px compact; 40 px default; 44 px prominent.
- Radius: 6 px small, 10 px control/card, 14 px major panel.
- Panel gaps: 12–16 px.
- Borders: 1 px; selected keys use accent outline plus subtle outer glow.

## Elevation

- Panels generally use tonal separation, not shadows.
- Popovers: `0 16px 48px rgba(0,0,0,.38)`.
- Active key: inset highlight, 1 px accent border, low-opacity accent glow.
- Avoid blur behind routine controls; reserve translucent treatment for temporary overlays.

## Components

### Device key

Square or hardware-proportional surface containing icon, concise label, optional state, and trigger badge. Press changes translate/brightness for 80 ms. Selected state uses an accent ring distinct from execution state.

### Rotary control

Circular representation with tick marks, center action, and separate left/right binding arcs. Keyboard controls expose left, right, and press as discrete targets.

### Action tile

Icon, name, short description, platform badges, and permission indicator. Supports click-to-assign as an alternative to drag.

### Inspector field

Schema-driven label, control, help/error, and optional Test affordance. Dangerous actions show confirmation policy inline.

### Status chip

Compact icon + text, never color alone: Connected, Disconnected, Mic muted, Update ready.

### Progress stepper

Named update phases with current, complete, pending, failed, and recovery states. Exact progress appears only when measurable.

## Icons

Use one outlined icon family at 1.75–2 px stroke. Custom device/control glyphs share its geometry. User-provided icons are clipped safely and never execute active content.

## Motion

- Fast feedback: 100 ms, ease-out.
- Selection/panel: 180 ms, cubic-bezier(.2,.8,.2,1).
- Dialog: 220 ms maximum.
- No layout-shifting hover scale.
- No animated gradient backgrounds.
- Reduced motion eliminates translation and nonessential interpolation.

## Accessibility

- WCAG 2.2 AA target.
- 4.5:1 normal text contrast.
- 3:1 meaningful UI boundary/non-text contrast.
- 2 px focus ring using `accentStrong`, offset 2 px.
- Minimum practical target 32 px, preferred 40–44 px.
- Keyboard and screen-reader alternatives for drag, color, and rotary interactions.

## Breakpoints

- `>= 1440`: four-column editor.
- `1200–1439`: compact four-column editor.
- `960–1199`: profiles collapsed; inspector drawer available.
- `< 960`: supported only for virtual-deck/compact surfaces, not the full editor.

## Design anti-patterns

- Gratuitous purple/blue gradients
- Glassmorphism on every container
- Pill-shaped controls without semantic reason
- Tiny low-contrast gray labels
- Hiding important actions behind icon-only buttons
- Replacing native interaction semantics with canvas-only rendering
- Showing false progress during firmware operations
- Using lighting animation as the only status indicator

## Artifacts

- Machine-readable canonical tokens: [design-tokens.json](design-tokens.json). CSS uses the same camelCase names with a `--color-`/`--space-` prefix.
- Self-contained component preview: [design-preview.html](design-preview.html)
