# MacroPad Studio

An isolated rebuild of the MacroPad desktop application using Tauri 2, React, and TypeScript, with repository-contained ESP32-S3 firmware.

## Implemented slice

- futuristic responsive device editor for six keys and the rotary encoder
- typed, versioned profiles persisted locally
- microphone, speaker, volume, media, shortcut, text, launch, and open actions
- configurable virtual-button workspace
- functional lighting studio and OLED configuration
- signed desktop and USB firmware updates through Device Center
- narrow native command boundary with no shell or URL-opening capability

Hardware events, device discovery, host-controlled OLED/lighting, signed desktop updates, and verified ESP32-S3 firmware flashing are implemented. Distribution builds must embed the release endpoint and public key; see [docs/UPDATER.md](docs/UPDATER.md).

The manual GitHub Actions workflow in `.github/workflows/release.yml` can publish
signed desktop bundles for every supported platform plus USB firmware. Local
Windows releases do not start that workflow; no separate update server is needed.

## Run

```powershell
npm install
npm run dev
npm test
npm run build
```

For the native shell, install the Tauri prerequisites and Rust, then run `npm run tauri dev`. This workspace can also use the ignored project-local Rust toolchain in `.tooling` by adding `.tooling/cargo/bin` to `PATH` for the current terminal.
