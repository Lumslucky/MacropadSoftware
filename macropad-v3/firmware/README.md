# MacroPad ESP32-S3 firmware

This is the updater-aware firmware source used by local builds and GitHub
Actions. It is derived from the previously external `MacroPadFirmware` project.

Firmware installation is USB-only. The device does not start a Wi-Fi access
point and contains no web server or OTA updater. MacroPad Studio downloads and
validates signed firmware packages on the computer, then writes them through the
ESP32-S3 ROM serial bootloader after the user enters BOOT0 mode.

Build locally with:

```powershell
pio run --project-dir firmware
```
