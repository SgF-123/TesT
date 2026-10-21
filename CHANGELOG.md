# Changelog

## [0.1.2] - 2026-10-21

### Added

- Windows x64 installer and portable builds.
- macOS Apple Silicon (`arm64`) and Intel (`x64`) DMG builds.
- LDRS loading animations for chat thinking, tool execution, provider login,
  and model catalog loading.

### Fixed

- Provider login no longer hangs in packaged builds when
  `login-helper.cjs` is stored inside `app.asar`.
- Provider and model requests now report a clear error if the login helper
  exits or fails to start.
- Pi TypeScript extensions can load `jiti` from packaged builds.
- Data-directory migration after changing the storage location.

### Notes

- Windows and macOS builds in this release are unsigned.
- On macOS, right-click the app and choose **Open** the first time it is
  launched, or allow it in **System Settings → Privacy & Security**.

[0.1.2]: https://github.com/SgF-123/TesT/releases/tag/v0.1.2
