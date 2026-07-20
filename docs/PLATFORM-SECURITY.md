# Platform Support and Security

## Support strategy

The domain exposes common capabilities while each OS adapter reports `available`, `permission-required`, `degraded`, or `unsupported`. The UI never implies parity that the platform cannot provide.

| Capability | Windows | macOS | Linux |
| --- | --- | --- | --- |
| HID/serial | Native libraries/WinUSB drivers as needed | IOKit-backed libraries | `udev` rules and hidraw/serial groups |
| Output volume/mute | Core Audio | Core Audio | PipeWire/WirePlumber, Pulse fallback policy |
| Microphone mute | Capture endpoint | Core Audio device-dependent | PipeWire/WirePlumber |
| Keyboard/mouse injection | SendInput | Accessibility + CGEvent | Wayland/X11 adapter; compositor limitations surfaced |
| Foreground app/window | Win32 | Accessibility/NSWorkspace APIs | Desktop/compositor dependent |
| Media | System media APIs | Media keys/system integration | MPRIS |
| Autostart | Startup registration | Launch agent/login item | XDG autostart/system integration |
| App updates | Tauri updater with signed NSIS payload | Tauri updater with signed/notarized app bundle | Tauri updater for AppImage; deb uses notification or signed repository |

## Release baseline

The provisional v1 matrix is Windows 10 1809+ x64, macOS 11+ universal (x64 and arm64), and Ubuntu 22.04+/compatible modern distributions on x86_64. Step 1 validates these baselines against selected Tauri, WebView, and native dependencies and records any change before public compatibility is promised. Windows ARM64 and Linux ARM64 are post-v1 unless hardware demand promotes them.

Update behavior is package-specific:

- Windows NSIS and macOS direct-download builds use the signed Tauri updater.
- Linux AppImage uses the signed Tauri updater and replaces only the user-owned AppImage.
- Debian packages never self-modify through the AppImage path. They notify with a signed `.deb` destination or defer to a configured signed APT repository.
- Store-managed packages defer to the store/package manager and disable conflicting in-app installation.
- The application detects packaging mode and selects exactly one mechanism.

## Permissions experience

- Request permissions in context, never all at first launch.
- Provide a Permissions page with purpose, state, test, and open-system-settings actions.
- Features degrade independently.
- Denial never prevents basic device configuration.
- Linux setup includes a packaged, least-privilege `udev` rule with uninstall instructions.

## Trust boundaries

Untrusted inputs include HID/serial packets, renderer commands, profile imports, firmware manifests/artifacts, update metadata, network responses, filenames, URLs, user icons, and logs imported for support.

Trusted computing base includes the signed desktop binary, embedded release keys, Rust domain validation, Tauri capability policy, OS credential store, and protected release pipeline.

## Threat controls

### Renderer compromise

- Strict Content Security Policy; no remote scripts.
- Tauri allowlist grants only named commands.
- Validate again in Rust; TypeScript types are not security controls.
- No shell, unrestricted filesystem, HID, serial, updater, or secret API in the UI.

### Malicious profiles/actions

- JSON Schema validation and size/depth/count limits.
- No executable code in profiles.
- Imported actions disabled pending permission review.
- Restrict URL schemes; default network actions to HTTPS and approved domains.
- Destructive system actions require explicit confirmation policy.

### Action-specific controls

| Action class | Primary threats | Required controls |
| --- | --- | --- |
| URL/open | Dangerous schemes, credential leakage | Allowlisted schemes (`https` by default); canonicalize before policy checks; reject embedded credentials; show unusual destinations |
| HTTP/webhook | SSRF, token leakage, oversized responses | Canonical host/port policy; DNS/IP re-check; block loopback, link-local, private, metadata, and file targets unless explicitly granted; redirect, size, and timeout limits; credential-store secrets |
| File/folder | Arbitrary data exposure or execution | User-selected scoped paths/bookmarks; distinguish open from execute; canonicalize and prevent scope escape |
| Command/script | Arbitrary code execution | Excluded from default v1 registry; advanced permission, visible executable/argument array, no shell interpolation, environment allowlist, directory scope, timeout/output cap, and confirmation class |
| Keyboard/text/clipboard | Secret disclosure and unintended injection | Never log content; warn for sensitive foreground targets; held-key cleanup; clipboard restore policy; explicit import approval |
| Destructive system | Shutdown or data loss | Destructive classification, default confirmation, countdown/cancel, and deliberate per-binding opt-out |

### Supply-chain/update compromise

- Lock dependencies and audit every release.
- Signed desktop artifacts and signed updater metadata.
- Independent firmware manifest signature and artifact hashes.
- Release keys separated from routine CI and rotated through documented policy.

### Secrets

- Store tokens in Windows Credential Manager, macOS Keychain, or Linux Secret Service.
- Profiles contain opaque secret IDs.
- Redact logs and diagnostics.
- Never pass secrets on command lines when avoidable.

### Device/parser attacks

- Length-bounded parsing with fuzz tests.
- Rate limits and bounded channels.
- No indexing before range validation.
- Quarantine repeated protocol violations without crashing the service.

## Application signing

- Windows production builds use Authenticode or Azure Trusted Signing and fail CI when unsigned.
- macOS production builds use Developer ID, hardened runtime, notarization, and stapling.
- Linux publishes checksums and signatures; package repository metadata is signed where applicable.
- Firmware and desktop signing keys are distinct.

## Privacy

- No mandatory account or telemetry.
- Local execution history is off or minimal by default and always bounded.
- Diagnostic export previews included data and excludes secrets.
- Future telemetry requires an explicit opt-in and separate specification.

## Security release gates

- Dependency and license audit
- Secret scan
- Static analysis and clippy with warnings denied
- Capability/permission diff review
- Fuzz regression corpus
- Artifact signature verification
- Updater and firmware negative tests
- Review of every new shell, filesystem, network, or credential permission
