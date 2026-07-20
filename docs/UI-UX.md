# UI/UX Specification

## Experience goal

The application should feel like a precision control console: fast, dark, tactile, and technically confident. It should not look like a gaming launcher, generic glass dashboard, or direct Stream Deck clone.

## Reference analysis

Current creative-control products establish useful interaction conventions:

- Elgato emphasizes drag-and-drop actions, profiles, pages, folders, multi-actions, and virtual controls.
- Logitech emphasizes application-specific profiles and analog adjustment controls.
- Razer/Loupedeck emphasizes combining buttons, touchscreen controls, and dials.

Adopt the conventions users already understand—action library, device canvas, inspector, profiles, pages—while using an original visual system and information architecture.

## Primary navigation

```text
Application shell
├── Dashboard
├── Profiles
│   ├── Keys & dials
│   ├── Virtual deck
│   └── Application rules
├── Lighting
├── Device
│   ├── Status
│   ├── Firmware
│   └── Diagnostics
└── Settings
    ├── General
    ├── Permissions
    ├── Updates
    └── About
```

## Main editor layout

```text
┌ Profiles ─────┬ Action library ────┬ Device/page canvas ─────┬ Inspector ────┐
│ Default       │ Search actions     │     [1] [2] [3]         │ Mic mute       │
│ Streaming     │ Audio              │     [4] [5] [6]         │ Trigger         │
│ Development   │ Keyboard           │        (dial)            │ Parameters      │
│ + New         │ Multimedia         │ Page 1 of 4              │ Feedback        │
└───────────────┴────────────────────┴──────────────────────────┴───────────────┘
```

Panels are resizable. At narrower widths, the action library and inspector become drawers. The device/page canvas remains the visual anchor.

## Core journeys

### First run

1. Welcome explains local operation and permissions philosophy.
2. App discovers a device or offers “Continue with virtual deck.”
3. Connected device displays identity and capability summary.
4. User selects a starter profile: General, Meetings, Media, Streaming, or Blank.
5. Contextual permissions are requested only when a chosen action needs them.
6. User tests a highlighted key and receives immediate physical/UI feedback.

Target first value: a working volume or mic-mute binding within three minutes.

### Assign action

1. Select a physical or virtual control.
2. Pick trigger or accept the primary trigger.
3. Drag/click an action from searchable library.
4. Configure typed parameters in the inspector.
5. Validation runs continuously.
6. Test executes only after explicit click.
7. Save is automatic and visibly confirmed.

### Microphone mute

The inspector distinguishes System microphone from Meeting-app shortcut. It shows selected endpoint, current observed state, permission state, press behavior, and optional red/green device feedback.

### Firmware update

Use a focused stepper: Release -> Verify -> Enter bootloader -> Flash -> Confirm. During flashing, hide unrelated navigation, keep recovery guidance visible, show phase plus byte/percentage progress, and use plain-language errors.

### Lighting

Provide color, brightness, effect, speed, direction, scope, and status-overrides only when advertised by the device. Preview is live but reversible; Apply commits to firmware. Reduced-motion disables animated UI previews without changing device effects.

## Component states

Every interactive component defines default, hover, active, selected, focus-visible, disabled, loading, success, warning, and error states. Empty, disconnected, permission-required, incompatible, and recovery-required states have dedicated compositions rather than generic toast errors.

## Feedback hierarchy

- Inline validation for field problems.
- Local banners for device/page issues.
- Toasts only for brief non-critical confirmations.
- Modal dialogs only for destructive decisions, permission education, and interrupted update recovery.
- Activity center for background downloads, actions, and diagnostics.

## Accessibility

- WCAG 2.2 AA baseline.
- Text contrast at least 4.5:1; large text and meaningful non-text boundaries at least 3:1.
- Minimum target 32 px; primary controls 40–44 px.
- Visible 2 px focus ring with offset and sufficient contrast.
- Entire editor supports keyboard navigation and non-drag alternatives.
- Icons include labels/tooltips; status never relies on color alone.
- Screen-reader announcements cover connection, save, action result, and update phase.
- Motion respects `prefers-reduced-motion`.
- Zoom to 200% without loss of core function.

## Motion

- Micro feedback: 80–140 ms.
- Panel and selection transitions: 160–220 ms.
- No continuous ambient animation outside active status indicators.
- Device key press uses quick light/depth response, never large scale bounce.
- Firmware progress is determinate where technically possible.

## Copy style

Use short, operational language: “Hold BOOT, then press RESET” rather than “Initiating bootloader procedure.” Errors state what happened, whether data/device is safe, and the next action.

## Responsive windows

- Recommended: 1280 × 800.
- Minimum supported: 960 × 640.
- Compact virtual deck: user-configurable, down to a small always-on-top grid.
- Full-screen is optional, never forced.

## Usability acceptance

- Create, edit, duplicate, reorder, and delete a binding without documentation.
- Complete every drag operation through keyboard controls.
- Identify connection and mic state in under two seconds.
- Recover from a missing bootloader port without restarting the app.
- Undo accidental binding deletion.
- Preserve editor context after window hide/show and device reconnect.
