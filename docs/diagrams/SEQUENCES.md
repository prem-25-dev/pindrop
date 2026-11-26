# 4. Sequence diagrams

## 4.1 Explore: tap a country
```mermaid
sequenceDiagram
  actor P as Player
  participant UI as Explore UI
  participant MAP as Map engine
  participant DATA as Static data (CDN/SW)
  participant OM as Open-Meteo
  P->>UI: tap India
  UI->>MAP: flyTo(IN) (spring, 700 ms)
  UI->>DATA: get country/IN.json (cached)
  DATA-->>UI: facts + sources
  UI->>UI: open side panel (Overview tab), URL ?c=IN
  par weather
    UI->>OM: forecast(lat,lng of New Delhi)
    OM-->>UI: temp, condition
  end
  P->>UI: tap population "1.45 B"
  UI-->>P: open World Bank page in a new tab
```

## 4.2 Party: create, join, vote, play
```mermaid
sequenceDiagram
  actor H as Host
  actor F as Friend
  participant WEB as web
  participant RT as realtime
  participant DB as Postgres
  H->>RT: room:create {visibility}
  RT-->>H: {code:"KQ7XM", link, qr}
  F->>WEB: open /join/KQ7XM
  WEB-->>F: nickname + avatar screen
  F->>RT: room:join {code, nickname, avatar, sessionToken}
  RT-->>H: room:state (players +1)
  RT-->>F: room:state
  H->>RT: vote:open
  RT-->>H: vote:options {mode, difficulty, scope}
  RT-->>F: vote:options
  F->>RT: vote:cast {mode:"pin-drop", ...}
  H->>RT: vote:cast {...}
  RT->>RT: count votes, host breaks ties
  RT-->>H: game:config + countdown
  RT-->>F: game:config + countdown
  loop each round
    RT-->>H: q:show {prompt, deadline}
    RT-->>F: q:show
    F->>RT: q:answer {lat,lng}
    H->>RT: q:answer
    RT->>RT: scoreRound() (packages/game)
    RT-->>H: q:reveal {pins, distances, points}
    RT-->>F: q:reveal
  end
  RT-->>H: game:scoreboard
  RT-->>F: game:scoreboard
  RT->>DB: save match + XP (signed-in players)
```

## 4.3 Host leaves and reconnects
```mermaid
sequenceDiagram
  participant RT as realtime
  actor H as Host
  actor A as Player A
  H--xRT: socket disconnect
  RT->>RT: mark H disconnected, start 60 s grace timer
  RT->>RT: grace timer ends → host = earliest connected player (A)
  RT-->>A: room:host {you:true}
  H->>RT: room:join {sessionToken}
  RT->>RT: token matches seat → restore H as player
  RT-->>H: room:state (A is host)
```

## 4.4 Solo answer with the difficulty rules
```mermaid
sequenceDiagram
  actor P as Player
  participant UI as Game UI
  participant G as packages/game
  participant API as web API
  P->>UI: types "Phillipines"
  UI->>G: match(input, answerKey, "navigator")
  G->>G: normalize (lowercase, strip accents/punctuation)
  G->>G: best similarity vs all aliases = 0.91 ≥ 0.67
  G-->>UI: correct
  UI-->>P: ✅ + confetti + avatar wiggle
  alt ranked / daily
    UI->>API: POST /api/sessions/:id/answer {qid, input, ms}
    API->>G: same match() on the server
    API-->>UI: {correct, points}
  end
```

## 4.5 Sign-in (guest → account, XP kept)
```mermaid
sequenceDiagram
  actor P as Guest
  participant UI
  participant WEB as web (Auth.js)
  participant GO as Google
  participant DB
  P->>UI: "Save your XP"
  UI->>WEB: signIn("google")
  WEB->>GO: OAuth
  GO-->>WEB: profile
  WEB->>DB: upsert user, then merge guest sessions (guestId cookie)
  WEB-->>UI: session
  UI-->>P: pick @handle + avatar
```

## 4.6 Monthly data refresh
```mermaid
sequenceDiagram
  participant J as Data job
  participant WB as World Bank
  participant WD as Wikidata
  participant GEM as Gemini
  participant CDN as Static data
  J->>WB: indicators × years
  J->>WD: SPARQL (capital, website, cities, gov type…)
  J->>J: normalize → attach {v, year, src}
  J->>J: check (every country has flag, shape, 12 layers; no NaN)
  alt new countries missing facts
    J->>GEM: draft flag meaning / fun facts with sources
    J->>J: add to review queue (not published until approved)
  end
  J->>CDN: publish /data/v2026.12/ + update manifest
```

## 4.7 Community submission (v2)
```mermaid
sequenceDiagram
  actor U as User
  participant WEB
  participant GEM as Gemini
  participant DB
  actor M as Moderator
  U->>WEB: submit category + answers + sources
  WEB->>GEM: pre-check (duplicates, obvious errors)
  WEB->>DB: submission (pending, AI notes)
  M->>WEB: open review queue
  M->>WEB: approve (with edits)
  WEB->>DB: publish category, credit author, +XP, badge
```

---
