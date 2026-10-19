# Fan update 1.8

- Added **Атомград** to the original in-game map selector. It is selected with the same previous/next map controls as the existing maps.
- Atomgrad generates the normal destructible city on the left and a destructible nuclear plant complex on the right: reactor building and segmented dome, turbine hall, generator, substation, striped stack, two cooling towers, fence and power-line poles.
- The map uses the game's existing cell-based construction and destruction system. No separate prototype page or duplicate launcher is used.
- The plant generator is tracked by its destructible cells; losing the generator disables power in the generated district networks.
- Existing maps remain separate and do not generate the nuclear plant.
- District transformer sheds remain destructible; destroying a shed cuts power to its connected group of buildings.
