# WreckboxMP Zombie Menu Mod — prototype for 1.9.2

Windows/local HTML prototype for branch `1.9.2`.

## Fix zombies standing idle (core patch)

The game core is embedded in `index.html` in an XOR-obfuscated form. `patch_zombie_ai.py` edits that embedded core directly; it does **not** inject another runtime script.

1. Make sure Python 3 is installed.
2. Copy `mods/wreckbox-zombie-mod/patch_zombie_ai.py` into the game root next to `index.html`.
3. Open a terminal in that folder and run:
   `python patch_zombie_ai.py index.html`
4. Restart the game and test the Zombie tool in a new scene.

The patch makes the core reactivate the zombie AI controller when a zombie is idle and has lost its zombie action. It creates `index.html.before-zombie-ai-patch` first and leaves the file unchanged if the expected 1.9.2 code marker is missing. This patch has not been tested in a running browser/game session yet.

## Install the menu (optional)

1. Keep the game's files in place; `index.html` must be in the game root.
2. Copy this entire folder to `<game>\\mods\\wreckbox-zombie-mod\\`.
3. Run `install_mod.bat`, then restart the game normally.

The installer makes a timestamped backup of `index.html`, then adds a script tag for the menu mod.

## Current behavior and limitations

- The menu uses the existing `#tools` and `#optExtra` hooks and sits on the left.
- Selecting a type currently stores a config and dispatches `wzm:zombie-type-change`; it does not yet apply fast-zombie color, glowing blue eyes, blood effects, or hostility between zombie types to the game core.
- Heavy and Hunter remain placeholders.
- Source patching is specific to the current 1.9.2 core structure. Back up the game before running it.
