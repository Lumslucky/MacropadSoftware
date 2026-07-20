# Quality, Observability, and Release Design

## Quality strategy

Test domain behavior without hardware first, transport behavior against fixtures/emulators, OS adapters on target systems, and final firmware/update behavior on physical devices.

## Test pyramid

### Rust unit tests

- Packet parsing and encoding
- Capability/version negotiation
- Gesture derivation
- Action graph validation and execution
- Permission calculation
- Profile migration and atomic persistence
- Firmware manifest signature, hash, range, and compatibility validation
- State-machine transition legality

### TypeScript tests

- View-model reducers and selectors
- Editor commands and undo/redo
- Schema-driven inspector fields
- Accessibility behaviors
- Update and permission state rendering

### Contract tests

- Tauri command inputs/outputs against generated schemas
- Shared protocol golden fixtures against firmware implementation
- OS adapter success/failure and permission behavior
- Profile import/export round trips

### Integration tests

- Virtual HID/serial adapters
- Disconnect/reconnect and malformed-device behavior
- Held-action cancellation
- Profile save during forced termination simulation
- Firmware update with mock flasher and interrupted phases

### End-to-end tests

- First-run virtual-deck path
- Physical-device discovery on lab runners
- Assign and execute common actions
- Microphone permission and mute state
- Lighting preview/apply
- Desktop update prompt/defer/install in a controlled channel
- Firmware install and recovery on supported hardware

### Fuzz and property tests

- HID packet decoder
- Manifest and profile parsers
- Action graph depth/size/concurrency boundaries
- Offset overlap and flash-range validation

## Hardware laboratory

Maintain at least one device per hardware revision, powered through controllable USB where possible. Record board revision, chip revision, flash size, USB bridge, firmware baseline, and host OS. Stable firmware promotion requires installation and post-boot protocol checks on the lab matrix.

## Performance budgets

- HID report receipt to action dispatch: p95 < 50 ms.
- UI input response: < 100 ms perceived latency.
- Cold UI ready target: < 2 seconds on reference hardware.
- Idle background CPU: approximately 0%; investigate sustained > 1%.
- Memory budget target: < 100 MB working set, refined after prototype.
- Lighting preview bounded to device-advertised rate, default max 30 updates/s.

## Logging

Use structured local logs with timestamp, level, subsystem, operation ID, device alias/hashed ID, event code, duration, and redacted context. Never log secrets, typed text, clipboard content, authorization headers, or firmware signing material.

Log rotation is bounded by size and age. Diagnostic export includes app/version/platform, sanitized configuration summary, recent logs, device capabilities, and update state after preview and consent.

## CI matrix

| Job | Linux | Windows | macOS |
| --- | --- | --- | --- |
| Format/lint/typecheck | Yes | optional duplicate | optional duplicate |
| Rust/TS unit tests | Yes | Yes | Yes |
| Platform adapter tests | Yes | Yes | Yes |
| Package build | x86_64 AppImage/deb | x64 NSIS | universal DMG/update bundle |
| Sign/notarize | package signatures | Authenticode | Developer ID + notarization |
| Hardware smoke | lab runner | lab runner | lab runner |

## Application release gates

1. Version and changelog finalized.
2. All tests, audits, schema compatibility, and migration fixtures pass.
3. Target artifacts build from the same reviewed commit.
4. Signing is mandatory and verified after packaging.
5. Update metadata refers to exact signed artifacts and checksums.
6. Canary channel installs and rolls forward successfully.
7. Stable metadata promotion is an explicit protected action.
8. Rollback means publishing a higher fixed version; never mutate released artifacts.

Packaging-mode tests verify that AppImage, deb/repository, NSIS, macOS direct, and any store build select only their documented updater and never attempt an incompatible self-update.

## Firmware release gates

1. Firmware and protocol tests pass.
2. Flash layout is generated, not manually transcribed.
3. Manifest schema/compatibility/ranges validate.
4. Manifest is signed in a protected environment.
5. Install, verification, reboot, and desktop handshake pass on hardware.
6. Artifacts are immutable after publication.

## Channels

- `development`: local/unsigned, never offered to production users.
- `canary`: opt-in, rapid validation, visible diagnostics.
- `beta`: opt-in, release candidate behavior.
- `stable`: signed, promoted only after canary/beta evidence.

## Definition of done

A capability is done when domain behavior, UI states, permissions, cross-platform availability, errors/recovery, documentation, metrics/logging, migration, and automated tests are implemented—not merely when its happy-path button works.
