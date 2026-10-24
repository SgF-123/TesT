# Changelog

## [0.2.1] - 2026-10-24

### Fixed

- Updating the Pi kernel from the npm registry no longer rolls back on
  launch. The runtime dependencies the Pi bundle loads lazily (`jiti` for
  TypeScript extensions) were looked up relative to the Pi CLI path, which only
  exists for the bundled kernel. They are now resolved from the app's vendor
  folder and staged inside the downloaded kernel, so extensions keep loading
  after a kernel update.
- Desktop updates now download with HTTP range resume, automatic retries, and
  SHA512 verification instead of abandoning a partial installer after a
  dropped GitHub connection.
- Failed desktop downloads keep their partial data and expose a direct retry
  action; completed installers are launched with the correct NSIS update
  arguments and the existing installation directory.
- Extension status text strips terminal ANSI escapes and hides inactive LSP
  statuses, so control codes no longer appear as broken characters in the UI.

## [0.2.0] - 2026-10-21

### Added

- Long conversations now show stable inline user-turn numbers (`#N`),
  per-session turn bookmarks in message headers and on the turn rail, and
  `Alt+Shift+Up/Down` navigation between bookmarked turns.
- Tool activity now scopes its file summary, file list, and editable undo to
  the current turn while keeping full-session execution details available in
  the detail dialog.
- Added architecture tests that verify preload/IPC channel coverage, documented
  Pi RPC command usage, and CI quality-gate wiring.
- Install Pi packages directly from `npm:` and `git:` sources in the
  Skills & Extensions sheet.
- Drop npmjs, GitHub, Git, or `npm:` links onto the install area to install
  the matching package automatically.
- npm package links do not require Git. If a GitHub link is used without Git
  installed, TesT tries the matching published npm package before showing an
  actionable error.
- Package entries now show their declared extension, skill, and prompt
  resources alongside local extensions.
- Pi packages can be enabled, disabled, and removed from the same sheet.
- Tool activity now uses independently collapsible cards with lazy detail
  rendering. The rail stays behind one compact summary card by default, opens
  into a bounded scrolling list, and supports per-card and collapse-all actions.
- File edits are summarized in one card with per-file addition/deletion counts,
  a details dialog, hover states, and a safe undo action for reversible edits.
- The workspace file browser can permanently delete files or folders after a
  confirmation, with path checks that protect the workspace root.
- Workspace folders in the sidebar now have a right-click menu for reveal,
  copy path, and non-destructive project removal. Removed projects can be
  restored from the sidebar; files and sessions are retained.
- Projects are shown directly under the sidebar's `Projects` heading instead
  of being nested below a synthetic Pi path.
- The current project has a visible accent marker, project rows expose a
  hover `New session` action, and the project heading can collapse or expand
  every project at once.
- Session hover cards can pin or unpin the conversation without opening the
  context menu.
- Added an `Unprojected` action that creates a temporary session in a separate
  scratch workspace without touching recent projects.
- Long conversations now expose floating `Back to top` and `Back to latest`
  controls whenever you scroll away. New background output adds an unread
  count to the latest button.
- The chat header shows the active model, the empty state explains how to
  start, and the composer reveals Enter/Shift+Enter shortcuts on focus.
- The composer now uses one morphing status button with distinct Send, Stop,
  and Continue states, icons, labels, and colors.

### Changed

- Extracted shared button, clipboard, usage formatting/types, time formatting,
  tag, message row, usage dialog, branch dialog, archived-session dialog,
  extension prompt, file browser, log, rename, commit dialog, and session
  search dialog modules, plus the full PTY terminal, diff, settings, shared
  form-control, settings-config, context-card, extension, login, provider,
  model-browser, loading, remote, toast, close, and delete-session domains,
  plus the session sidebar and shared session types/path utilities, from the
  renderer monolith without changing behavior. Tool activity, streaming
  output, chat helper cards, response parsing utilities, and session-tree
  construction now live in dedicated modules as well. Session tabs and
  composer status/annotation strips are also separated.
- Removed redundant success toasts for sending a prompt, scheduling a
  continuation, and switching models; the interface already reflects those
  states.
- Refined the icon system and micro-motion pass: softer morphing, optical
  hover/press states, layered icon plates, breathing status dots, animated
  accordion reveals, and more polished menu, dialog, and composer transitions.
- Streaming output is coalesced to a paint-friendly cadence, message rows and
  activity cards are isolated from unrelated state updates, and scroll-state
  bookkeeping is batched to animation frames. This keeps typing, menu opening,
  and long output noticeably steadier.
- Continue now needs only one click. If Pi is still finishing an abort, TesT
  remembers the request and automatically resumes as soon as the run settles.
- Remote package installation uses Pi's own package manager so runtime
  dependencies, skills, prompts, and package settings stay consistent.
- Conversation and tool activity spacing now use a narrower, cleaner reading
  column with lighter activity cards.
- Execution details now surface actionable failure causes, show command and
  output as readable terminal blocks, and keep raw payloads behind disclosure
  instead of rendering every result as JSON. Tool and thinking steps can be
  filtered, expanded in bulk, and failed commands show their exit code.
- Long conversations render the latest 120 messages first, with an explicit
  load-earlier control and optimized search-match lookup to keep scrolling and
  streaming responsive.
- Dark mode, interface density, and accent color now persist across restarts.
  Explicit `theme=light` / `theme=dark` query values remain available for
  deterministic visual QA.
- The empty conversation state now offers direct actions for model setup,
  file context, and the command palette, and unconfigured model badges link to
  the model settings instead of acting as passive status.
- Settings uses a vertical category rail on wide windows with correct
  up/down keyboard navigation, falling back to the existing horizontal tabs on
  narrow layouts.
- Async feedback is more accessible: toasts, loading, and thinking states are
  live regions, active sessions expose `aria-current`, and secondary text now
  meets readable contrast in both themes.
- Sending is blocked until a model is configured. The composer explains the
  remaining setup step and links directly to model settings, while model setup
  offers a one-click default from currently available models.
- Composer text now lives in a dedicated external store instead of the root
  workspace state. Typing updates only the composer surface rather than
  reconciling the full application, and draft persistence is flushed safely
  when switching sessions.
- Composer typing disables browser spellcheck/autocorrect, while buttons use
  a shorter active transition for a more immediate press response.

### Notes

- This version was prepared as source only; no installer artifacts were built
  or published.

### Fixed

- Removed an always-running status-dot box-shadow animation that kept the
  renderer and GPU busy while TesT was idle.
- The Pi sidecar now restarts automatically after an unexpected exit with
  bounded backoff, instead of leaving every later command silently offline.
- Added a renderer error boundary and automatic reload for recoverable
  renderer-process crashes.
- Editing a message now resolves its fork target by stable message identity
  first, so repeated prompt text cannot select the wrong turn.
- Removed the silent 800-message session-history cap; long sessions now keep
  their full turn numbering and remain page-rendered 120 messages at a time.
- Queue mutations now compare the server queue snapshot before rewriting it
  and restore the actual queue when another client changed it mid-operation.
- Removed the obsolete Feishu channel skeleton so the documented and runtime
  Feishu capabilities have one owner.
- Editing a user message no longer fails when the running Pi kernel does not
  expose `navigate_tree`; TesT now falls back to a fork and restores the
  original text in the composer without showing an error.
- Installing or restoring a Pi kernel now recreates the RPC bridge instead of
  reusing the previous CLI path, so the active process switches to the selected
  kernel immediately.
- Pi kernel updates now pass a real RPC health check before being committed.
  If the new kernel fails to answer, TesT restores the previous kernel (or the
  built-in kernel) automatically. An interrupted update is also recovered on
  the next launch.

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
