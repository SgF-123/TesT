# Architecture

TesT is split into four runtime layers:

1. **Renderer** — React 19 + Vite. The renderer never gets Node.js access.
2. **Preload** — exposes a narrow `window.tesT` API through `contextBridge`.
3. **Electron main** — owns windows, files, Git, PTY sessions and network services.
4. **Pi sidecar** — a Node process speaking JSONL RPC over stdin/stdout.

## Main process modules

| Module | Responsibility |
| --- | --- |
| `electron/main.cjs` | Window lifecycle, IPC registration and feature wiring |
| `electron/pi-bridge.cjs` | Pi sidecar process and JSONL RPC |
| `electron/pty-terminal.cjs` | Multi-session PTY through `node-pty` |
| `electron/git.cjs` | Git status, diffs, staging and commits |
| `electron/git-worktree.cjs` | Worktree lifecycle and merge helpers |
| `electron/remote-server.cjs` | Local web client, mobile UI and tunnel state |
| `electron/channels/feishu.cjs` | Optional Feishu long-connection channel |
| `electron/data-location.cjs` | Portable/installer data-directory pointer |
| `electron/paths.cjs` | Data, session, model and extension paths |

## Data flow

```text
UI action
  → preload API
  → IPC handler
  → filesystem / Git / PTY / Pi RPC / remote server
  → event
  → preload listener
  → renderer state
```

Long-running operations stream events instead of polling. Renderer updates are
coalesced with `requestAnimationFrame`; terminal resizing and window dragging are
throttled to the animation frame.

## Packaging

- `dist/` contains the compiled React renderer.
- `electron/` contains the CommonJS main process and preload scripts.
- `build-resources/` is generated locally and contains Node and the Pi bundle.
- Production JavaScript is packed into `app.asar`.
- Native `node-pty` files are emitted to `app.asar.unpacked`.
- Only `zh-CN` and `en-US` Electron locale packs are shipped.
- The update source defaults to the latest GitHub Release and can be overridden
  through `%APPDATA%\TesT\update.json`.

The NSIS installer and portable executable share the same optimized application
payload. The portable build unpacks that payload to a temporary directory on each
launch.

macOS preview builds are produced by `.github/workflows/macos-build.yml` on
separate Apple Silicon and Intel runners. They use `node-pty` Darwin prebuilds,
bundle the matching Node binary, and produce unsigned DMG images.

## Build inputs

`scripts/prepare-electron.cjs` copies:

- the running Node executable;
- the Pi coding-agent bundle;
- the login injection helper.

Set `TEST_PI_BUNDLE` when the Pi source is not in a sibling `pi/` directory.
