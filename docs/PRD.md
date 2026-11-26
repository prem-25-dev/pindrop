# 1. PRD — Product Requirements

## 1.1 Context and goal
worldflagmap.com shows flags on a map with a few quizzes. Its maps are limited, it says little about each country, it cites no sources, and it has no live multiplayer. **Pinpoint** is a premium, phone-first world-flag site with a macOS-style layout and **claymorphism** visuals, with three parts:

## 1.1a Visual direction: "Mac layout, made of clay"
- **Layout and behavior come from macOS:** the dock with magnifying icons, window-like cards, ⌘K Spotlight search, genie transitions, and smooth springs.
- **The look is claymorphism** (following the reference image you shared): soft, puffy, rounded surfaces that look molded from clay. Each surface gets two inner shadows (a light one top-left, a darker one bottom-right) plus a soft outer drop shadow. Corners are large (24–36 px). Colors are pastel: peach, lilac, sky blue and mint, on a soft cream background.
- **3D clay icons and illustrations:** dock icons, mode-grid cards, empty states and badges are glossy 3D clay objects (a globe, a flag on a pole, a map pin, a trophy, a passport). Avatars are clay characters too, so everything matches.
- **Buttons feel physical:** they sink in when pressed (shadows flip) and spring back with a slight squish on tap.
- **Frosted glass is used only for overlays** (the ⌘K palette and the country panel's backdrop), so clay stays the main material.
- **Dark mode is "dark clay":** charcoal-indigo surfaces with dimmer highlights, keeping the same pastel accents.
- **Accent colors:** peach/orange `#FF8A5B` for the main action (pin and play), lilac `#9B87F5`, sky `#6EC1FF`, mint `#5FD3A6`. All are checked for WCAG AA contrast on text.
- **Font:** Gatrelli (the file is coming from you), with a rounded fallback (Nunito or Quicksand) until then.
1. **Explore:** a flag map or data map with sourced country info.
2. **Games:** solo and party modes at three difficulties, with a scope choice for each game.
3. **Community:** accounts, XP, Passport, friends, and content submitted by users and reviewed by your team.

Free, no ads, open source, self-hosted on Coolify.

## 1.2 Personas
| Persona | Need | Key features |
|---|---|---|
| Student (Asha, 15) | Learn countries for exams | Explore panel, solo modes on Tourist level, Passport |
| Casual player (Ravi, 28) | 5 minutes of fun a day | Daily mix, streaks, quick flag quiz |
| Party host (Meera, 22) | Game night with 10 friends | Rooms, QR code join, voting, chat |
| Geography nerd (Karl, 35) | Hard challenges, data | Cartographer level, data layers, compare, contributing |
| Moderator (team) | Keep content right | Review queue |

## 1.3 User journeys
1. **First visit:** mode grid → 3-step tour (dock, Explore, games) → pick "Guess the flag" → play as a guest → "Save your XP?" sign-in prompt (optional).
2. **Explore:** dock → Explore → tap India → fly-in, side panel opens → tap the population number → World Bank page opens → "More info" → official government site.
3. **Data:** Explore → switch to Data map → choose a layer such as "GDP per capita" → press play on the year slider → open the ranking table → compare India, China, USA and Brazil.
4. **Party:** host taps Party → Create → gets code `KQ7XM`, a QR code and a link → friends join with nicknames → everyone votes on mode, difficulty and region (host breaks ties) → rounds → scoreboard → rematch.
5. **Passport (v2):** profile → Passport → Japan → 10 hard questions → 8/10 → Silver stamp → one more try tomorrow for Gold.
6. **Contribute (v2):** signed-in user → Submit → Category "Countries with snowfall" + list + source → review queue → approved → credit + XP + badge.

## 1.4 Functional requirements
| ID | Requirement | Release |
|---|---|---|
| F-01 | Mode grid home page, 3-step tour, dock (magnifies; bottom or left), glass tab bar on phones | v1 |
| F-02 | ⌘K search palette for countries, capitals and cities | v1 |
| F-03 | Explore map (Equal Earth, no Antarctica) with Flags / Data toggle; hover lifts a country; tap flies in and opens the panel | v1 |
| F-04 | Country panel tabs (Overview / People / Economy / Culture / Sources); every number links to its source; "More info" menu | v1 |
| F-05 | Flag meaning, 3 fun facts (AI-drafted, reviewed), local time + weather | v1 |
| F-06 | 12 data layers, animated year slider, sortable ranking table, compare up to 4 | v1 |
| F-07 | Filter chips + AND/OR query builder | v1 |
| F-08 | 195 countries by default, territories as a setting; disputed areas marked | v1 |
| F-09 | SEO pages `/country/[slug]` | v1 |
| F-10 | Difficulty Tourist (choices) / Navigator (fuzzy typing ≥ 67%) / Cartographer (exact spelling, any case) | v1 |
| F-11 | Scope for every game: World, continent, subregion, group | v1 |
| F-12 | Guess the flag, Pin drop (borderless / with borders), Find the region: solo and party | v1 |
| F-13 | Rooms: code, link, QR, public list; up to 50 players; host handover; settings by vote (host breaks ties); chat; teams | v1 |
| F-14 | Accounts: guest nickname, Google, email + password, @handle + display name | v1 |
| F-15 | Original mix-and-match avatars that react, with unlockable items | v1 |
| F-16 | XP, levels, badges, public profile, friend requests | v1 |
| F-17 | Leaderboards: global, daily/weekly, by country, friends | v1 |
| F-18 | Installable app with offline solo games | v1 |
| F-19 | Remaining solo modes (11) and Daily mix + streak | v2 |
| F-20 | Passport trivia with Bronze / Silver / Gold stamps, one try per day | v2 |
| F-21 | Rarity with ~100 categories and global obscurity scoring | v2 |
| F-22 | Community submissions + review queue (admin, moderator) | v2 |
| F-23 | Friend challenges (same seed) | v2 |
| F-24 | Full set of ~40 data layers | v2 |

## 1.5 Quality targets
- **Speed:** on a mid-range phone over 4G the page is usable within 2.5 s, and the map draws within 1 s of opening Explore. Animations run at 60 fps, with a lighter mode for weak devices.
- **Party:** answers reach other players in under 150 ms (95% of the time); one room server instance handles 200 rooms × 50 players.
- **Accessibility:** WCAG 2.2 AA. Every game is playable by keyboard, with a screen reader, by touch and with a pen; reduced motion and colorblind palettes are supported.
- **Privacy:** cookieless Umami analytics; no ads or trackers.
- **Reliability:** reconnecting puts a player back in their seat within 60 s; daily database backups (Coolify).
- **Security:** passwords hashed with argon2, rate limits, server-side scoring, chat profanity filter, CSRF protection, CSP headers.

## 1.6 Success metrics
Weekly active players, share of players who return on day 7, party rooms per week, average players per room, number of Passport stamps, approved community submissions per month.

## 1.7 Out of scope (for now)
Ads and payments, native apps, social sharing, UI languages other than English, live AI calls during games.

---
