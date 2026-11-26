# Pinpoint

Explore every country on a map made of flags, with a source behind every number, and play geography games solo or with a room full of friends.

macOS-style layout, **claymorphism** visuals, phone-first. Free, no ads, open source.

## Repo layout

| Path | What |
|---|---|
| `apps/web` | Next.js 16 app (App Router, Tailwind 4, Motion) |
| `packages/ui` | Clay design system: surfaces, buttons, segmented control, 3D clay icons, dock, tab bar |
| `packages/data` | Data pipeline: raw sources → versioned JSON in `apps/web/public/data/<version>/` |
| `docs/` | PRD, HLD, LLD, UML and sequence diagrams, roadmap |

Coming next: `apps/realtime` (party rooms), `packages/game` (question generators, answer matching, scoring), `packages/db` (Postgres schema).

## Run it

```bash
npm install
npm run data   # builds country index, map shapes and flags into apps/web/public
npm run dev    # http://localhost:3000
```

Node 22+. The `/styleguide` page shows the whole clay design system.

## Data sources

Every value shown to users carries `{ v, year, src }` and links to where it came from.

- Population: World Bank Open Data (CC BY 4.0)
- Country facts and names: mledoze/countries (ODbL)
- Shapes: Natural Earth via world-atlas (public domain)
- Flags: flag-icons (MIT)

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Milestone 1 (foundation and clay design system) is in progress.
