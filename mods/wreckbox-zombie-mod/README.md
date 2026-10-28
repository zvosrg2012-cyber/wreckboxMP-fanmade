# WreckboxMP Zombie Menu Mod — 1.9.2

Optional zombie-type menu for WreckboxMP.

## Install

1. Keep the original game files in place; `index.html` must remain in the game root.
2. Copy this folder to `<game>\mods\wreckbox-zombie-mod\`.
3. Run `install_mod.bat` and restart the game.

The installer backs up the local game-root `index.html`, then inserts the menu script before the game's encrypted main script and routes the decrypted source through the mod hook.

## Zombie types

Choose a type before infecting a person or creating new zombies. The settings apply when the game's zombie-conversion function runs; existing zombies are not retroactively changed.

- **Обычный:** normal speed and appearance.
- **Быстрый:** 1.75× walking and running speed; red clothing and darker red skin.
- **Тяжёлый:** 0.58× speed, 3.4× health, grey clothing/skin and a dark helmet.
- **Охотник:** 1.45× speed, 0.82× health, dark blue-purple clothing and darker skin.

The game source is minified and encrypted in the original HTML. The mod checks for the expected conversion-code markers before patching; if they change in a future game build, the hook will report inactive rather than blindly patch unrelated code.

Only files inside this `mods` folder are maintained in the repository. Running the installer modifies the local game-root `index.html` and creates a timestamped backup first.
