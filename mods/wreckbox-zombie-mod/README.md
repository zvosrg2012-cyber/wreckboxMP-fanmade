# WreckboxMP Zombie Menu Mod — prototype for 1.9.2

Windows-only prototype for the local HTML build on branch `1.9.2`.

## Install
1. Keep the game's files in place; `index.html` must be in the game root.
2. Copy this entire folder to `<game>\mods\wreckbox-zombie-mod\`.
3. Run `install_mod.bat`, then restart the game normally.

The installer makes a timestamped backup of `index.html`, then adds a script tag for this mod. It does not download anything or launch an external engine.

## Uninstall
Run `uninstall_mod.bat`. It restores the newest backup made by the installer. Do not do this after making other edits to the game, because those later edits would be lost.

## Prototype limits
- The side badge confirms the script loaded.
- The menu uses the existing `#tools`, `#optExtra`, and `.tool.on[data-tool="zombie"]` hooks found in the 1.9.2 project.
- Standard is the only type with implemented gameplay behavior. Fast, Heavy, and Hunter are selectable UI placeholders only; they do not change NPC stats or behavior yet.
- Future game versions may change the HTML hooks.
- Source inspection only; this has not been launched on the user's Windows computer.
