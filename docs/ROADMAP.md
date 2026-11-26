# 6. Milestones
1. Foundation: monorepo, **clay design system** (tokens, surfaces, pressable buttons, clay dock with 3D icons, ⌘K, light/dark clay, motion, font), a style-guide page to sign off the look first, data pipeline with sources, docs.
2. Explore v1: flag/data map, panel tabs, 12 layers, year slider, rankings, compare, filters + query builder, SEO pages.
3. Game engine + solo: Guess the flag, Pin drop (borderless / borders), Find the region.
4. Accounts: Auth.js, handles, avatars, XP, profiles, friends, leaderboards.
5. Party v1: rooms, votes, host handover, chat, teams, the 3 modes.
6. Deploy to Coolify + Umami + monthly job → **v1 launch**.
7. v2: remaining modes, Daily mix + streaks, Passport, Rarity + 100 categories, community + review queue, challenges, full layer set.

# 7. Needed from you
Gatrelli font file or link · Google OAuth keys · Gemini key · domain + Coolify access · GitHub repo name.

# 8. Verification
- Data check passes.
- In the browser preview: phone and desktop, dark and light, keyboard-only, reduced motion, no console errors, source links correct.
- Game unit tests pass. Playwright: a 3-player room through join, vote, rounds, host leaving and scoreboard.
- After deploy: live URL works and sign-in and rooms work across two devices.
