# WreckboxMP Zombie Menu Mod — 1.9.2

This folder contains the optional zombie-type menu mod for branch \`1.9.2\`.

## Install

1. Keep the original game files in place; \`index.html\` must remain in the game root.
2. Copy this entire folder to \`<game>\mods\wreckbox-zombie-mod\`.
3. Run \`install_mod.bat\`, then restart the game.

The installer creates a timestamped backup of \`index.html\` before adding the menu script. It places the mod script before the game's encrypted main script so the speed hook can patch the code before it runs. Rerunning the installer updates an older loader placement.

## Fast zombies

- Choose **Быстрый** before creating/turning new zombies.
- The mod patches the game's zombie-conversion function so new zombies receive a 1.75× multiplier for both walking and running speed.
- Existing zombies are not retroactively changed; select the type before spawning/turning them.
- Red coloring, glowing eyes, blood effects, and hostility between zombie types are not implemented yet.
- Heavy and Hunter remain placeholders.

Only files in this \`mods\` folder are maintained in the repository. The installer modifies the local game-root \`index.html\` when you run it and makes a backup first.
