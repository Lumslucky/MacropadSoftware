# Product Capability Specification

Status: Proposed target specification  
Audience: Product owner, desktop engineers, firmware engineers, designers, release operators  
Target: Desktop application v3

## Capability

A macropad owner can connect one or more supported ESP32 macro pads, assign physical and virtual controls to reliable system or application actions, organize those controls into profiles and pages, configure device lighting, update device firmware safely, and keep the desktop application updated on Windows, macOS, and Linux.

## Product principles

1. A physical action must feel immediate and dependable.
2. A failed update must be diagnosable and recoverable.
3. Hardware and operating-system capabilities must be reported honestly.
4. Profiles contain declarative configuration, never executable code.
5. Powerful features require explicit, understandable permissions.
6. Common tasks must work without a cloud account.
7. Visual polish must not compromise accessibility or clarity.

## Actors

- **Owner:** Configures devices and actions, performs updates, and manages profiles.
- **Desktop application:** Executes actions and maintains device/application state.
- **ESP32 firmware:** Emits input events and accepts configuration, lighting, and identity commands.
- **Release operator:** Publishes signed application and firmware releases.

## User-visible promises

### Device management

- Discover supported devices by VID/PID and confirm identity through protocol negotiation.
- Reconnect automatically after temporary removal, firmware restart, sleep, or update.
- Support multiple devices without confusing their profiles.
- Show connection, firmware, protocol, and hardware-revision status.
- Never flash an artifact for a different board revision.

### Controls

- Six physical buttons and rotary controls retain current behavior.
- Supported triggers include press, release, short, long, double, hold, repeat, rotary direction, rotary velocity, chord, and page/layer changes.
- Virtual buttons are available in a resizable desktop deck.
- Pages, folders, profiles, and temporary layers provide effectively unlimited controls.
- Foreground-application rules can switch profiles automatically.

### Actions

- Keyboard shortcuts, text, mouse, application/file/URL launch, window operations, volume, microphone, media, system, timer, and device-control actions are supported through built-ins.
- Multi-actions support sequences, parallel branches, delays, conditions, toggles, repeats, variables, cancellation, and error policy.
- Unsupported actions remain visible but clearly explain platform or permission requirements.

### Audio and microphone

- Toggle, set, and observe default microphone mute state where the OS exposes it.
- Support push-to-talk and push-to-mute using separate press/release events.
- Control output volume/mute and enumerate audio endpoints.
- Add per-application audio only where the platform adapter can do so reliably.
- Reflect external mute changes in the UI and device lighting.

### Lighting

- Configure brightness, static color, and firmware-advertised effects.
- Preview changes at a bounded update rate and commit persistent state separately.
- Use lighting as optional status feedback for mute, recording, page, profile, connection, and update state.
- Never assume per-key RGB unless firmware advertises it.

### Updates

- Check for signed desktop updates and offer Restart now or Later.
- Download firmware metadata and artifacts over HTTPS.
- Verify a signature rooted in a pinned firmware-release public key plus artifact hashes before flashing.
- Display deterministic manual BOOT/RESET instructions when automatic reset is unavailable.
- Verify the written image and reconnect to confirm the expected firmware version.

## Fixed constraints and invariants

- The application targets Windows, macOS, and Linux; release artifacts are built on a target-OS CI matrix.
- macOS production artifacts are signed and notarized on macOS.
- The UI cannot directly access HID, serial, shell, secrets, or unrestricted filesystem APIs.
- Only one process owns a given HID or serial device at a time.
- HID execution and serial flashing are mutually exclusive for the same device.
- Device packets, IPC inputs, profile files, manifests, and OS responses are validated before use.
- Firmware compatibility is decided from signed metadata plus reported device identity, never filenames alone.
- Profile writes are atomic and recoverable.
- The legacy `hidconfig.json` format is imported through a tested one-way migration; corrupt profiles do not prevent startup.
- Destructive system actions require confirmation unless the owner explicitly opts out per binding.
- Secrets are referenced by identifier and stored in the OS credential store.
- The application remains useful offline after installation and configuration.

## Capability states

### Device lifecycle

`absent -> discovering -> connecting -> ready -> disconnecting -> absent`

Exceptional states: `incompatible`, `permission-required`, `busy`, and `faulted`.

### Firmware lifecycle

`idle -> checking -> update-available -> downloading -> verified -> awaiting-bootloader -> flashing -> verifying -> rebooting -> confirmed`

Any update state may transition to `failed`; failures before flashing preserve the installed firmware. Failures during flashing lead to `recovery-required`, with instructions kept available offline.

### Action lifecycle

`configured -> validating -> ready -> running -> succeeded|failed|cancelled`

Held actions can remain `running` until a matching release event or safety timeout.

## Data ownership

- Profiles, pages, bindings, appearance preferences, and device aliases belong to the local user.
- Device identity and capabilities are reported by firmware and cached only as observations.
- Credentials belong to the OS credential store.
- Firmware/application release metadata belongs to the release service and must be signed.
- Logs belong to the user and are local by default; diagnostic export requires explicit action.

## Non-goals for the first production release

- Public plugin marketplace or automatic execution of community code.
- Deep application-specific APIs or native integrations for OBS, Discord, Teams, Spotify, Adobe products, smart-home platforms, and similar third-party applications. Users control these applications through configurable keyboard shortcuts and generic OS actions.
- Cloud accounts, billing, or mandatory telemetry.
- Remote control over the public internet.
- Mobile companion application.
- Firmware compilation inside the desktop app.
- Guaranteed feature parity for OS facilities that do not have equivalent APIs.
- Silent firmware flashing without identity, integrity, and compatibility checks.

## Success criteria

- Normal input-to-action latency: p95 under 50 ms after receipt of a HID report.
- Reconnect after device return: p95 under 3 seconds.
- No corrupted profile after forced termination during save.
- Firmware mismatch is rejected before erase/write.
- All shipped artifacts pass signature and malware/reputation checks defined by release policy.
- Keyboard-only completion of configuration, lighting, and update flows.
- WCAG 2.2 AA contrast, focus visibility, and target-size requirements.
- Hardware-in-the-loop tests pass on at least one supported device for every production firmware release.

## Open decisions

These are not safe to infer from the desktop repository:

- Exact ESP32 family and USB/serial bridge.
- VID/PID ownership and whether bootloader mode uses a different identity.
- LED chipset, count, topology, and per-key capability.
- Display model, dimensions, color depth, and transfer constraints.
- HID input/output/feature report sizes and report IDs.
- Existing firmware partition table, secure boot, flash encryption, and anti-rollback settings.
- Whether DTR/RTS are connected to EN/GPIO0.
- Whether the device exposes HID and serial concurrently.
- Required support for multiple macropads.
- Exact mapping for any legacy action values discovered outside the current `hidconfig.json` structure.

## Handoff

Architecture is ready for implementation planning. Protocol and firmware steps require a firmware-repository review and a hardware capability worksheet before their interfaces are frozen.
