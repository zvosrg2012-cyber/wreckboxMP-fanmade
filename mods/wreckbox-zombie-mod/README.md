# WreckboxMP Zombie Menu Mod — prototype for 1.9.2

Windows/local HTML prototype for branch `1.9.2`.

## Install
1. Keep the game's files in place; `index.html` must be in the game root.
2. Copy this entire folder to `<game>\\mods\\wreckbox-zombie-mod\\`.
3. Run `install_mod.bat`, then restart the game normally.

The installer makes a timestamped backup of `index.html`, then adds a script tag for this mod. It does not download anything or launch an external engine.

## Uninstall
Run `uninstall_mod.bat`. It restores the newest backup made by the installer. Do not do this after making other edits to the game, because those later edits would be lost.

## Current behavior and limitations
- The side badge confirms the script loaded.
- The menu uses the existing `#tools` and `#optExtra` hooks.
- Menu text is constrained with ellipsis/line clamping so long labels should not stretch the options panel.
- Choosing a type sets `window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__`, exposes its config as `window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__`, and dispatches `wzm:zombie-type-change`.
- The Fast config requests speed multiplier `1.75`, red body color, blue eyes glowing in darkness, a bloodier visual flag, and hostility to other zombie types.
- **Those config values do not change NPCs by themselves.** The game’s NPC/spawn/render/combat code must read the config or handle the `wzm:zombie-type-change` event. The current mod script does not invent or patch unknown game APIs, so actual speed, body/eye visuals, blood effects, and faction combat still require a compatible game-side integration.
- Heavy and Hunter remain placeholders.
- Future game versions may change the HTML hooks.
- Source inspection only; this has not been launched on the user's Windows computer.
