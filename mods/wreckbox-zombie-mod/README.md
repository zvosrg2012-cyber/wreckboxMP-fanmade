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


## Freeze-hardening update

The `fix/zombie-menu-freeze` branch includes a defensive rewrite of both copies of
`zombie_type_menu.js`:

- coalesces repeated DOM notifications into one animation-frame render;
- prevents duplicate initialization if the script is included twice;
- observes only direct child changes inside the options panel, not every nested menu mutation;
- catches render errors and reports them to the console;
- keeps Fast, Heavy, and Hunter as UI placeholders, without claiming their gameplay effects exist.

This update passed a JavaScript syntax check, but it has **not** been runtime-tested inside WreckboxMP 1.9.3. The branch is based on the repository's 1.9.2 source; test it on a backup before using it in a different game build.
