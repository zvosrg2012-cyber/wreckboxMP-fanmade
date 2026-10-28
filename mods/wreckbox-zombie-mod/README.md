# WreckboxMP Zombie Menu Mod — prototype for 1.9.2

This folder contains the optional zombie-type menu mod for branch `1.9.2`.

## Install

1. Keep the original game files in place; `index.html` must remain in the game root.
2. Copy this entire folder to `<game>\\mods\\wreckbox-zombie-mod\\`.
3. Run `install_mod.bat`, then restart the game.

The installer creates a timestamped backup of `index.html` before adding the menu script.

## Important limitations

- The menu can select a type and expose its configuration in `window.__WRECKBOX_SELECTED_ZOMBIE_TYPE__` and `window.__WRECKBOX_SELECTED_ZOMBIE_CONFIG__`.
- The game’s original zombie-spawning code does not currently read that configuration. Selecting **Fast / red** therefore does not change spawned zombies; they remain ordinary zombies.
- Heavy and Hunter are placeholders too.
- This mod does not patch the game's core. Keep the original `index.html` unchanged except for the installer’s script tag.
