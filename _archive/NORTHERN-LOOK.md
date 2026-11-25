# The "Northern" map look (retired from the picker, kept for later)

The first look of ElderMaps: Google's own terrain map, restyled with cold northern colours (the style rules and palette are saved in `northern-look.json` next to this file), with each land tinted by its province over it (`src/TintLayer.tsx`). It was dropped from the picker in favour of the vivid and parchment looks.

It is still in the code, only hidden:
- `src/lib/styles.ts`: `LookId` still includes `'skyrim'` (the internal name of the look), `WORLD_STYLES.skyrim` and `PALETTE.skyrim` are untouched (the vivid look uses the same base styles).
- `src/App.tsx`: the look picker cycles `vivid -> oblivion (the parchment look) -> vivid`; the saved choice falls back to `vivid`.

To bring it back: in `src/App.tsx` put `'skyrim'` back into the saved-choice test (`l === 'oblivion' || l === 'vivid' || l === 'skyrim'`) and into the button's cycle (`vivid -> oblivion -> skyrim -> vivid`), with the label NORTHERN.
