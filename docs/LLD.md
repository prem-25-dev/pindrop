# 5. LLD — Low-Level Design

## 5.1 Repo layout
```
pinpoint/
  apps/web/
    app/(shell)/layout.tsx         wallpaper, Dock, TabBar, ⌘K, theme
    app/(shell)/page.tsx           mode grid + tour
    app/(shell)/explore/page.tsx   map + panel (?c=, ?layer=, ?year=)
    app/country/[slug]/page.tsx    SEO page (built ahead of time), renders Explore with that country open
    app/play/[mode]/page.tsx       solo setup → game
    app/party/page.tsx             create/join/public list
    app/party/[code]/page.tsx      room
    app/u/[handle]/page.tsx        profile
    app/admin/review/page.tsx      review queue (roles)
    app/api/...                    sessions, scores, leaderboards, friends, submissions
    lib/auth.ts                    Auth.js config
    public/manifest.webmanifest, sw.ts
  apps/realtime/src/
    server.ts  rooms.ts  voting.ts  rounds.ts  chat.ts  auth.ts  persist.ts
  packages/game/src/
    rng.ts  match.ts  scoring.ts  scope.ts  modes/{guessFlag,pinDrop,findRegion,...}.ts
  packages/data/
    raw/  scripts/{fetch-wb,fetch-wikidata,build,validate,publish}.ts  out/
  packages/db/src/schema.ts  migrations/
  packages/ui/src/{Glass,Dock,Palette,Sheet,Tabs,Avatar,Confetti,Map}/
  docs/  PRD.md HLD.md LLD.md diagrams/
```

## 5.2 Data files (static, versioned)
```ts
// /data/v{ver}/countries.json : light index used everywhere
type CountryIndex = { code; name; slug; region; subregion; groups: string[]; isUN195; disputed?: true;
  capital: { name; lat; lng }; aliases: string[]; colors: Color[]; centroid: [lng,lat]; tiny: boolean }[];
// /data/v{ver}/country/{code}.json : panel details, loaded on demand
type CountryDetail = { official; languages; currencies; calling; tld; borders: string[];
  stats: Record<LayerId, SourcedValue>;  // latest
  cities: City[]; landmarks: City[]; links: { gov?; wikipedia; worldBank; tourism? };
  flagMeaning: SourcedText; funFacts: SourcedText[] };
// /data/v{ver}/layers/{layerId}.json : time series for the data map
type LayerSeries = { id; label; unit; kind; scale: ScaleSpec; src: Source; years: number[];
  values: Record<code, (number|null)[]> };
// /data/v{ver}/world.topo.json : shapes keyed by code (Natural Earth 1:50m, simplified)
type SourcedValue = { v: number|string; year: number; src: string /* Source.id */ };
```

## 5.3 Database schema (Drizzle / Postgres)
```mermaid
erDiagram
  users ||--o{ accounts : has
  users ||--o{ game_sessions : plays
  users ||--o{ passport_stamps : earns
  users ||--o{ user_badges : earns
  users ||--o{ friendships : "a/b"
  users ||--o{ submissions : writes
  game_sessions ||--o{ attempts : contains
  matches ||--o{ match_players : has
  users ||--o{ match_players : "optional"
  leaderboard_entries }o--|| users : for

  users { uuid id PK; citext handle UK; text display_name; text email UK; text password_hash; text role; int xp; int level; jsonb avatar; char2 country; jsonb unlocks; timestamptz created_at }
  accounts { uuid user_id FK; text provider; text provider_account_id }
  game_sessions { uuid id PK; uuid user_id FK; text guest_id; text mode; text difficulty; text scope; text seed; bool ranked; int score; timestamptz started_at; timestamptz ended_at }
  attempts { uuid session_id FK; int idx; text input; bool correct; int points; int ms }
  matches { uuid id PK; char5 room_code; text mode; jsonb config; timestamptz played_at }
  match_players { uuid match_id FK; uuid user_id FK; text nickname; int score; int rank; text team }
  leaderboard_entries { text board; text period; uuid user_id FK; int score; char2 country; timestamptz at }
  passport_stamps { uuid user_id FK; char2 country; text tier; timestamptz earned_at; date last_try }
  user_badges { uuid user_id FK; text badge_id; timestamptz at }
  friendships { uuid a FK; uuid b FK; text status; timestamptz at }
  submissions { uuid id PK; uuid author FK; text type; jsonb payload; jsonb sources; text status; uuid reviewer; jsonb ai_notes; timestamptz at }
```
Indexes: `leaderboard_entries(board, period, score desc)`, `game_sessions(user_id, started_at)`, `friendships(a,b) unique`, `submissions(status, at)`.

## 5.4 Socket.IO events (realtime)
| Direction | Event | Payload |
|---|---|---|
| C→S | `room:create` | `{visibility, teams?:boolean}` → `{code, link}` |
| C→S | `room:join` | `{code, nickname, avatar, sessionToken?, authToken?}` |
| C→S | `room:leave` · `room:kick` (host) | `{playerId}` |
| S→C | `room:state` | `{players, hostId, state, settings}` |
| S→C | `room:host` | `{hostId}` |
| C→S | `vote:open` (host) | `{fields:["mode","difficulty","scope","count"]}` |
| C→S | `vote:cast` | `{field, value}` |
| S→C | `vote:tally` / `game:config` | `{counts}` / `GameConfig` |
| S→C | `q:show` | `{idx, prompt, choices?, deadline}` (never the answer) |
| C→S | `q:answer` | `{idx, input}` (text, choice, or `{lat,lng}`) |
| S→C | `q:progress` | `{answered:n, total}` |
| S→C | `q:reveal` | `{answer, perPlayer:[{id, input, points, distKm?}]}` |
| S→C | `game:scoreboard` | `{ranking, xpGained}` |
| C↔S | `chat:send` / `chat:msg` | `{text}` (filtered, max 200 chars, 1 message/s) |

Limits: 20 events/s per socket, 50 players per room, a room is deleted 10 min after it empties, codes use the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.

## 5.5 REST / server actions (web)
`POST /api/sessions` (start a ranked or daily session → `{id, seed, questions without answers}`) · `POST /api/sessions/:id/answer` · `POST /api/sessions/:id/finish` · `GET /api/leaderboards?board=&period=&scope=friends|country|global` · `POST /api/friends/:handle` · `PATCH /api/friends/:id` · `GET /api/profile/:handle` · `PATCH /api/me` (handle, avatar) · `POST /api/submissions` · `GET/PATCH /api/admin/submissions` (moderator) · `POST /api/realtime-token` (short-lived JWT for the socket).

## 5.6 Core algorithms (`packages/game`)
- **Normalize:** NFKD → strip diacritics → lowercase → drop punctuation and words like "the" / "republic of" → collapse spaces.
- **Match:**
  - *Tourist:* choice id equals the answer id.
  - *Navigator:* `max over aliases of similarity(a,b) = 1 − levenshtein/maxLen ≥ 0.67`, with Jaro-Winkler used as a tiebreak for short names (≤ 5 letters need ≥ 0.8 so "Mali" ≠ "Bali").
  - *Cartographer:* `normalize(input) ∈ normalize(aliases)` (exact, case-insensitive).
  - Aliases come from the data (common, official, native names, alternate spellings).
- **Pin-drop score:** `d = haversine(pin, nearest point of target country)`, `points = round(5000 · e^(−d / k))`, where `k = 2000 km` for World scope and is scaled by the scope's bounding-box diagonal. Landing inside the country = 5000.
- **Timed questions:** `points = base · (0.5 + 0.5 · remaining/limit)`.
- **Seeded random numbers:** `mulberry32(xmur3(seedString))`. Daily seed = `daily:${YYYY-MM-DD}:${mode}`. Friend challenges reuse the stored seed.
- **Scope:** filter countries by region, subregion or group membership, plus the territories setting.
- **Votes:** majority per field, host's vote breaks ties, and the default value is used if nobody votes.
- **Obscurity (v2):** `obscurity = 1 − normalize(0.5·log(pageviews) + 0.3·log(pop) + 0.2·log(area))`, mixed with real answer frequencies: `0.7·observed + 0.3·proxy` once a country has 500+ answers.
- **XP:** `xp = points/100 + 20·completion + streakBonus`, with `level = floor(sqrt(xp/50))`.

## 5.7 Front-end engineering
- **Map:** SVG `<pattern>` per country (flag image, `preserveAspectRatio="xMidYMid slice"`, sized to the largest polygon's bounding box). Data mode uses Canvas 2D with the same projection and zoom, redrawn with requestAnimationFrame during year playback. Tiny countries get flag pins. Hover lift = a translate plus a drop-shadow filter on a copy of that country's path.
- **Clay design system (`packages/ui/clay`):**
  - The tokens are `--clay-surface`, `--clay-hi` (inner highlight), `--clay-lo` (inner shade), `--clay-drop` (outer shadow), `--radius-clay: 28px`, and the pastel accents.
  - The base surface is `box-shadow: inset 6px 6px 12px var(--clay-hi), inset -8px -8px 16px var(--clay-lo), 0 18px 40px -12px var(--clay-drop)`.
  - Pressed state: the inner shadows flip, and a spring sets `scale: 0.97`.
  - Hover: the card lifts 4 px and its drop shadow grows. A soft highlight follows the pointer or device tilt, so the clay looks lit from where you point.
  - Elevation levels 0–4 and light/dark token sets. Frosted glass (`backdrop-filter`) is used only on overlays.
  - Reduced-motion and reduced-transparency settings turn off the springs and the blur.
- **3D clay assets:** about 30 icons and illustrations (dock icons, mode cards, badges, empty states) as optimized WebP/AVIF with alpha, plus lightweight SVG versions for small sizes. They will be made by AI-assisted generation and then cleaned up, in a consistent clay style and lighting from the top-left.
- **Dock:** Framer Motion springs; each icon scales with its distance from the pointer. Genie transition = a shared-layout animation from the icon to the window.
- **State:** URL holds `?c, ?layer, ?year, ?filters` (shareable); Zustand holds the rest of the UI state; TanStack Query handles API calls.
- **Offline app:** Workbox precaches the shell, data index, shapes and flags; solo modes work offline, and ranked answers queue until back online.
- **Accessibility:** a list version of the map (a "Countries" list button), focus rings, `aria-live` for game feedback, every input method (keyboard, touch, pen, mouse) mapped to the same actions.

## 5.8 Testing
- Unit tests (Vitest) for `packages/game`: matching tables (fuzzy and strict), scoring, rng, votes.
- A data-check script runs in CI.
- Playwright: explore flow, a solo game, a 3-player party room, and an axe accessibility scan.
- Load test: k6 against Socket.IO with 200 rooms × 50 players.

---
