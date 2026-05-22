# KDE Settings Extension Roadmap

## Current State

This extension currently searches KDE System Settings modules and exposes command-backed actions in Vicinae.

- `KcmModuleAdapter` discovers `kcm_*.desktop` files from XDG application directories and turns them into searchable module results.
- `DisplayAdapter` already queries `kscreen-doctor -o` and parses display state.
- HDR per-monitor toggles are partially implemented with `kscreen-doctor output.<id>.hdr.on` and `kscreen-doctor output.<id>.hdr.off`.
- The UI already supports action kinds for opening modules, running commands, toggling settings, and copying commands.

The architecture is a good fit for curated quick settings: add one adapter per subsystem, return searchable `SettingResult` objects, and wire actions to stable system commands or D-Bus calls.

## Near-Term Goal

Evolve the extension from "search and open KDE settings" into curated quick settings that can be edited directly from Vicinae.

Keep the scope intentionally practical. Do not try to build a generic KDE settings editor. Many KDE settings are backed by different KCM backends, KConfig files, helper services, or D-Bus APIs, so each editable setting family should be handled explicitly.

## Feature Roadmap

1. Harden display and HDR support.
   - Make HDR parsing resilient across likely `kscreen-doctor` output variants.
   - Refresh display state after toggling so the accessory text reflects the new state.
   - Hide toggle actions when HDR availability or state cannot be determined.
   - Keep "Open Displays & Monitor" as the fallback action.

2. Add Wi-Fi status and toggle support.
   - Add a `NetworkAdapter`.
   - Start with NetworkManager via `nmcli radio wifi`.
   - Expose searchable Wi-Fi/WLAN results with current state and toggle action.
   - Degrade gracefully when `nmcli` or NetworkManager is unavailable.

3. Add Bluetooth status and toggle support.
   - Add a `BluetoothAdapter`.
   - Start with `bluetoothctl show` and `bluetoothctl power on/off`.
   - Handle missing adapters, powered-off adapters, and missing `bluetoothctl`.
   - Consider BlueZ D-Bus later if command parsing proves fragile.

4. Add shared adapter utilities.
   - Reuse command availability checks, state refresh behavior, and failure messaging.
   - Prefer small helpers over a large generic settings framework.
   - Preserve copyable commands for actions where that helps debugging.

5. Consider additional curated settings.
   - Night light.
   - Power profile.
   - Refresh rate.
   - Display scaling.
   - SDR brightness.
   - Default audio device or mute toggles, if reliable command or D-Bus interfaces are identified.

## Important Findings

- HDR is the best first editable display feature because KScreen exposes it through `kscreen-doctor`.
- Wi-Fi should be relatively straightforward on systems using NetworkManager.
- Bluetooth is feasible but needs careful adapter detection and unavailable-state handling.
- Arbitrary KDE settings editing is not realistic as a single generic backend.
- Prefer stable command-line tools or documented D-Bus interfaces over direct KConfig edits.
- Direct KConfig writes should be a last resort because many settings need service reloads or KCM-specific side effects.

## Implementation Defaults

- Keep the existing adapter model.
- Add one adapter per subsystem, such as `NetworkAdapter` and `BluetoothAdapter`.
- Prefer command-backed v1 implementations when commands are stable enough.
- Record any known D-Bus replacement candidates here before switching implementations.
- Keep editable settings searchable by common names and abbreviations.
- For every toggle, show current state in `accessory` and include an action title that describes the next state.
- When a required backend tool is missing, return either no editable result or a module-opening fallback instead of a broken action.

## Testing Checklist

Run static checks before handoff:

```sh
just check kde-settings
just build kde-settings
```

On a KDE Plasma system, manually verify:

- Search still lists KDE System Settings modules.
- Display settings still open through `systemsettings kcm_kscreen`.
- HDR results only appear for displays with known HDR state.
- HDR toggle actions update the real display state.
- Result accessory text refreshes after a toggle.
- Missing tools such as `kscreen-doctor`, `nmcli`, or `bluetoothctl` degrade gracefully.
- Wi-Fi and Bluetooth unavailable states do not show broken toggle actions.

## Open Questions

- Should the extension prefer command-line tools for simplicity, or use D-Bus for subsystems where typed APIs are available?
- Should toggles always refresh search results immediately after command execution, or should adapters expose explicit post-action refresh hooks?
- Which KDE/Plasma versions should be considered supported for editable settings?
- Should potentially disruptive actions, such as disabling all wireless radios, require an extra confirmation step?
