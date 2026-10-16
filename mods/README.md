# NPC Possession prototype

Integrated in the game's inline runtime on branch `mod/possess-npc-prototype`.

## Controls
- **F6** — enter NPC selection mode.
- **Left-click a resident** — possess them.
- **W / A / S / D** or arrow keys — move.
- **Shift** — run.
- **Space** — jump.
- **Esc** — release the resident.

While possessing, the normal HUD is hidden and the camera follows the selected resident. The possession code targets the game's existing resident objects; it does not replace the resident creation system.

## Status and limitations
This is an experimental first integration. JavaScript syntax was checked after patching the obfuscated runtime, but the game itself has not been launched in this environment. In-game behavior still needs testing, especially whether the original resident AI fully yields while `state === "possessed"`, jumping/ground collisions, and restoring the previous HUD state. No claim is made that these behaviors are verified.
