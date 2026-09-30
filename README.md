# ZipSpinZ

Play-money social casino. Eight themed machines, a lobby, daily wheel, and a local coin purse. Coins have no cash value.

## Layout

- `src/components/lobby` — floor, store, lounge, vault, profile
- `src/components/game` — cabinet, reels, paytable
- `src/lib/engine` — RNG, paylines, spin results
- `src/lib/machines/catalog.ts` — machine themes and paytables
- `src/lib/audio.ts` — one voice per machine, plus the wheel
- `public/machines` — covers, cabinets, emblems, symbols

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Dev server listens on port 8080.
