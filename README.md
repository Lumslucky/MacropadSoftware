# MacroPad Software

Cross-platform desktop software for configuring and operating an ESP32-based macro pad. The current Electron application is a legacy prototype; the approved target design is a Tauri 2 desktop application with a Rust core and React/TypeScript interface.

## Product goals

- Preserve the current six-button, rotary, profile, media, URL, tray, and launch-at-login behavior.
- Add dependable microphone, multimedia, shortcut, macro, virtual-button, and lighting features.
- Download, verify, and flash firmware through the ESP32 serial bootloader.
- Ship signed Windows, macOS, and Linux builds with secure application updates.
- Provide a modern, compact control experience inspired by professional creative-control software without copying another product's visual identity.

## Design documentation

| Document | Purpose |
| --- | --- |
| [Product specification](docs/PRODUCT.md) | Scope, requirements, constraints, success criteria, and open decisions |
| [System architecture](docs/ARCHITECTURE.md) | Target stack, components, lifecycle, persistence, and trust boundaries |
| [Device protocol](docs/DEVICE-PROTOCOL.md) | Versioned HID protocol and capability negotiation |
| [Action engine](docs/ACTION-ENGINE.md) | Triggers, actions, macros, shortcuts, and virtual controls |
| [Firmware update](docs/FIRMWARE-UPDATE.md) | Signed manifest, bootloader workflow, recovery, and failure handling |
| [Platform and security](docs/PLATFORM-SECURITY.md) | OS adapters, permissions, signing, secrets, and threat model |
| [UI/UX specification](docs/UI-UX.md) | Information architecture, journeys, states, accessibility, and motion |
| [Visual design system](DESIGN.md) | Tokens, components, interaction styling, and reference rationale |
| [Quality and release](docs/QUALITY-RELEASE.md) | Tests, observability, CI matrix, packaging, and release gates |
| [Implementation plan](plans/IMPLEMENTATION-PLAN.md) | Dependency-ordered construction plan with verification and exit criteria |

Additional visual artifacts:

- [Design tokens](design-tokens.json)
- [Interactive design preview](design-preview.html)

## Current status

The repository does not yet implement the target architecture. Documentation status is **architecture-ready, hardware-confirmation pending**. The ESP32 variant, flash layout, lighting hardware, display, report sizes, and firmware repository must be confirmed before the device protocol and flasher can be frozen.

## Can this be built?

Yes. The complete desktop application can be implemented in this repository. Firmware-side protocol, lighting, version-reporting, and flashing-manifest work requires access to the separate firmware project and physical devices for hardware-in-the-loop validation. Signed production distribution additionally requires Apple and Windows signing credentials owned by the project.
