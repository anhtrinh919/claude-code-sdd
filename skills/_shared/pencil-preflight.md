# Pencil MCP pre-flight — shared across SDD skills

This has bitten the operator many times. **Read it before any `mcp__pencil__*` call.**

The Pencil MCP server connects to the running Pencil desktop app via WebSocket. **If the app is not open, every MCP call fails with `WebSocket not connected to app: desktop`.** Saving a `.pen` file and closing Pencil is normal — but it breaks every subsequent MCP call until the app is reopened.

## Pre-flight (run before the first MCP call in any session that needs Pencil)

**Step 1 — Detect platform and launch Pencil with the `.pen` file as argument.**

Don't ask the user — the operator has explicitly said "you have to open it by your own using bash."

Detect platform with `uname -s` and follow the matching path:

### macOS (Darwin)

```bash
# Find the binary (handles arm64 and x64 installs)
PENCIL_BIN=$(find /Applications -name 'Pencil' -type f -maxdepth 4 2>/dev/null | grep 'Contents/MacOS' | head -1)
# Launch with the .pen file
"$PENCIL_BIN" /absolute/path/to/file.pen >/tmp/pencil.log 2>&1 &
sleep 3
```

No DISPLAY issues on macOS — the native window server handles everything. `nohup` is not needed and not recommended (it can break app sandboxing). The `&` alone is sufficient.

If `find` returns nothing, the app may be at `/Applications/Pencil.app/Contents/MacOS/Pencil` — try that path directly. If that also fails, prompt the user to confirm Pencil is installed.

### WSL2 (Linux)

```bash
pencil-app /absolute/path/to/file.pen >/tmp/pencil.log 2>&1 &
sleep 3
```

The binary is typically installed at `~/apps/pencil/pencil` and symlinked as `pencil-app` in PATH (whichever path the operator's install used). See the `nohup` caveat section below — DISPLAY stripping is a real hazard on WSL2.

---

**Step 2 — Verify reachability.** First MCP call: `mcp__pencil__get_editor_state({ include_schema: true })`. This both probes the connection and loads the schema.

**Step 3 — If the verify call fails with `WebSocket not connected`:** check `tail /tmp/pencil.log` for startup errors. Only after that, prompt the user — they may need to log in to Pencil, or the binary may have moved.

## Platform notes

**macOS:** The MCP bridge listens for the native Mac Pencil instance. No DISPLAY, no X server, no WSL complications. The process to leave alone (never kill mid-session) is `mcp-server-macos-arm64` or `mcp-server-macos-x64`.

**WSL2:** The MCP bridge listens for the WSL2-side Pencil instance specifically. Use whichever absolute path the local install lives at (commonly `~/apps/pencil/pencil`, symlinked as `pencil-app` in PATH); don't assume Pencil is reachable from a different host. The process to leave alone is `mcp-server-linux-x64`.

## NEVER kill the MCP server process or Pencil mid-session

Once the Pencil MCP server disconnects from Claude Code, `mcp__pencil__*` tools are gone for the rest of the session — Claude Code does not auto-reconnect. Even relaunching Pencil afterward doesn't restore the tools; the operator has to restart Claude Code.

If you see a stale-looking Pencil process, **leave it alone and try the MCP call first** — `WebSocket not connected` is sometimes a transient handshake issue, not a process problem. Killing should be the absolute last resort, only with explicit user instruction.

## `nohup` caveat (WSL2 only)

`nohup pencil-app file.pen &` detaches the process from the shell, which on WSL2 strips `$DISPLAY` and Pencil exits immediately with `Missing X server or $DISPLAY`. Either:
- Drop `nohup` and use `&` alone (preserves DISPLAY but ties to the shell), or
- Pass DISPLAY explicitly: `DISPLAY=$DISPLAY nohup pencil-app file.pen &`.

The simplest reliable launch: `pencil-app /absolute/path.pen >/tmp/pencil.log 2>&1 &` followed by `disown` only if you need the parent shell to fully detach.

On macOS, this issue does not apply — `&` alone is always sufficient.

## Escape hatch — `.pen` files are plain JSON

The Pencil MCP server's tool description claims `.pen` files are "encrypted and can be only accessed via the pencil MCP tools." **This is empirically wrong.** `.pen` files are plain JSON — `file file.pen` reports "JSON text data", first bytes are `{ "version": "2.11", "children": [...]`. The `Read` tool, `cat`, `jq`, etc. all work directly.

Use the escape hatch when:
- Pencil app has a bug opening the specific file (e.g. v1.1.46 had a `loadFile` arg-handling bug where it would silently restore the previously-active file instead of the one named on the command line).
- MCP connection has been severed mid-session and tools are no longer available.
- Claude Code session was restarted but Pencil isn't running and starting it would just be overhead.
- The task is purely read-only (extracting variables and frame names) and doesn't need Pencil's editing features.

Schema reference is in `get_editor_state({ include_schema: true })` output, but the same `Document` interface applies when reading directly:
- `.version` (string, e.g. "2.11")
- `.themes` (per-theme axis values)
- `.variables` (palette + numeric + string tokens — feeds `design-tokens.css`)
- `.children` (array of Frame / Group / Rectangle / Text / etc.)

Common jq queries:

```bash
jq '.version' file.pen
jq -r '.children[] | "\(.id)\t\(.name)\t\(.type)"' file.pen   # top-level frames
jq '.variables' file.pen                                       # all tokens
jq '.themes' file.pen                                          # theme axes
jq -r '.children[] | select(.reusable==true) | .id + "\t" + .name' file.pen
```
