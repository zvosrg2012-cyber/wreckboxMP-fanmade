# WreckboxMP Zombie & Acid Mod — 1.9.2

Adds two special zombie types and a corrosive acid tool. The mod patches the game's decrypted source through the existing loader hook; only files in this `mods` folder are maintained in the repository.

## Install

1. Keep the original game files in place; `index.html` must remain in the game root.
2. Copy this folder to `<game>\mods\wreckbox-zombie-mod\`.
3. Run `install_mod.bat` and restart the game.

The installer backs up the local game-root `index.html`, inserts the mod script before the encrypted game script, and routes the decrypted source through the mod hook.

## Zombie types

Choose a type in the zombie tool's menu before infecting a person or creating new zombies. The selection affects zombies converted after the choice; existing zombies are not retroactively changed.

- **Обычный:** normal game zombie.
- **Быстрый:** red, visibly faster movement and running speeds; targets ordinary zombies as well as people.
- **Огненный:** neon-orange body and clothing. When it gets close to a target, it breathes fire, ignites nearby people, and lights flammable materials in front of it.

## Acid

- Select **Кислота** in the elements/tools panel and hold the mouse to pour green acid.
- Acid pools persist for a while and visually bubble.
- It corrodes **steel, cast iron, and lead**; it intentionally does not dissolve concrete, reinforced concrete, brick, or other strong/non-metal materials.
- A person remaining in the acid is killed by the corrosion effect and replaced by an animated skeletal overlay.

## Validation and limits

The injected source and mod JavaScript pass syntax checks, and the patch checks for the expected source markers before applying changes. This is not a substitute for launching the game and testing the effects in the actual game runtime. If the upstream game's minified source changes, the hook may need updating.

The installer modifies the local game-root `index.html` and creates a timestamped backup first. The repository itself should contain only the `mods` tree.
