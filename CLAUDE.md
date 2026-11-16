# Tabletop Market — project brief for Claude Code

Read this first. It is the handoff from an earlier planning and build session.

## Who you are working with
- Brian, a solo builder and business student. He is NOT fluent in computers or coding.
- Give him instructions as small numbered steps in plain language, one thing at a time. Avoid jargon, or explain it in a few words.
- You write the code. He tests on his Meta Quest 3 and reports back. You cannot see the headset, so ask specific questions about what he saw.
- He is on Windows. He owns a Quest 3.
- Be honest about what is untested or simulated. He has to defend every claim to judges.

## The deadline
- UBC 2026 Hackathon. Submission due Friday, November 20, 2026 at 12:00 PM CST on Devpost (ubc-hackathon-2026.devpost.com). Aim to submit by 10 AM.
- Thursday Nov 19: stop adding features. README, 2–3 minute demo video, Devpost form.
- Saturday Nov 21: in-person judging in Austin, during the day. He must be present to win anything.
- All code must be written during the hackathon week. The repo must be public.

## The project in one sentence
A prediction market you can put on your table: a mixed reality (passthrough) web app for Meta Quest 3 where a market appears as an object, live odds come from Gemini's prediction markets, and picks are held and paid out in USDC on Arc.

## What it is entered for
- Track: Consumer Apps (must interact with a blockchain and have a working user-facing frontend).
- Chain award: Best use of Arc (Circle's EVM-compatible L1, USDC as gas). Core onchain function must be on Arc (testnet is fine). README must list contract address(es) and explain how Arc is used.
- Bounty: Gemini Prediction Markets (must use the Gemini Prediction Markets API; say which endpoints and how).
- Optional, only if the voice assistant gets built: ElevenLabs and Grok Bot bounties (no cash).
- Judging criteria: Technical Execution, Product & UX, Innovation, Impact & Potential, Demo.

## Product decisions already made (do not reopen without a reason)
- Web-based VR using A-Frame (WebXR), hosted on GitHub Pages. No native app. No login.
- An NBA game is shown as a mini basketball court on the user's real table. The user watches the real game on their own TV or screen. No NBA footage is used anywhere.
- Design: opaque, monotone charcoal/black surfaces. Green cash. Team colors only as small accents. It must look polished, not amateur.
- No chips. The user presses the side they want, then sets an amount with quick buttons (+$1, +$5, +$25), a slider, or a number pad, then presses Confirm. The panel shows "Risk $X to win $Y".
- The cash pile on a side is the CURRENT VALUE of the user's pick (shares x current odds), with a label like "$6.06 (+$1.06)". Bundles fall onto it when the odds move the user's way and pop off when they move against. Keep the motion restrained.
- Crypto is invisible: show dollars only, never "USDC" or wallet addresses in the UI. Idle balance "earns interest" (real only if a yield source exists on Arc testnet; otherwise a clearly labeled preview). Cash in and cash out are simulated.
- Payments: a pick locks test USDC in a contract on Arc testnet; payout = stake / odds at pick time; the other side is a pool funded with test USDC (simulated counterparty, must be disclosed). A small reporter server reads Gemini's settled result and tells the contract (trusted component, must be disclosed).
- Rule: avoid anything that looks like paying athletes for results or encouraging reckless betting. Gemini is a regulated sponsor.

## Current state of the code
- Repo: github.com/PetNoob/Tabletop-Market. Live site: https://petnoob.github.io/Tabletop-Market/
- The repo is tidy: there is one `index.html` and git history keeps old versions.
- The description below is of the version before Nov 16; see "Confirmed on Nov 16" for what changed.
- That version is a single HTML file (A-Frame 1.6.0 from aframe.io) containing:
  - a SETTINGS block at the top (table height, distance, scale, start balance, sample teams)
  - an `xr-input` component: controller pointer lines, hand-joint outlines, fingertip press, select (trigger or pinch) raycast clicks, and dragging the court by a front handle
  - the app: court, scoreboard, two team panels with odds, amount panel (quick buttons, slider, number pad, Cancel, Confirm), cash piles, test balance card, "Simulate odds" button
  - `loadGemini()` which fetches https://api.gemini.com/v1/prediction-markets/events?status=active&category=Sports&search=NBA&limit=30 and falls back to sample data. A status line under the title says "Live odds from Gemini" or "Sample odds".
- Verified on a desktop browser: pick a side, amounts, confirm, pile appears, simulation moves the pile.
- On the headset Brian confirmed: entering AR works, and picking worked in AR with the earlier version. He described the new version as "not bad" but has not yet reported on: hand outlines, fingertip press, slider and number pad by finger, the move handle, text legibility, or whether the status line says live or sample. ASK HIM THESE FIRST.
- Balance and picks are local to the page. Nothing is on a blockchain yet.

## Confirmed on Nov 16 (no longer unknown)
- Headset test of the previous version: hand outlines lined up, fingertip press worked on team panels, amount buttons, slider and number pad, and the move handle worked. Brian did not notice the status line (it was small; it is bigger now).
- A browser page CAN call Gemini directly: the API answers with `access-control-allow-origin` for the GitHub Pages origin. No relay is needed for odds (the reporter in step 3 is still needed).
- Real shape of `GET /v1/prediction-markets/events`: `{ data: [...], pagination: {limit, offset, total} }`. Each event has `title`, `ticker` (moneyline ends in `-M`), `startTime`, `isLive`, `participants`, and `contracts[]` with `label`, `abbreviatedName`, `color`, `sportsSide` (home/away), `instrumentSymbol`, `prices` (`bestBid`, `bestAsk`, `lastTradePrice`, strings 0–1). Home team is listed first, so sort by `sportsSide` to match the title ("Away vs Home").
- That list is about 7 MB for 100 events (each event embeds related events), so it is fetched once and then every 5 minutes in the lobby. Live odds use `GET /v1/pubticker/{instrumentSymbol}` (about 150 bytes: `bid`, `ask`, `last`), every 5 seconds for the game on the table. `GET /v2/ticker/{instrumentSymbol}` also works and returns 24 hourly prices (useful for a small chart later).
- No score field was found in the events response. Ask Gemini whether live scores exist.
- index.html now has: a welcome screen (HTML overlay, Enter starts AR on a headset), a lobby board of games (6 cards per page), and the game view. Picks are stored per game ticker in `state.picks`. Local preview: `.claude/launch.json` runs `python -m http.server 8123`.

## Redesign later on Nov 16 (Brian asked for a Kalshi-style app covering every Gemini category)
- Product decision changed by Brian: not only NBA. The lobby has a tab for every category from `GET /v1/prediction-markets/categories` (16 names; 10 had open markets on Nov 16, the others show "No open markets here right now"). Markets load 12 at a time per tab from `/events?status=active&category=X&limit=12&offset=N`.
- Every market is a list of answers (Gemini contracts). `kind: "duel"` = two answers that exclude each other (a game; court lines shown, hoops only for basketball). `kind: "list"` = one or many answers; the user selects an answer on the board and picks Yes or No on it.
- Picking is done with two long colored pills on the front edge (team colors for a duel; green Yes / red No for a list). The old side panels are gone. Picks are stored as `state.picks["ticker|answer index|yes or no"]`. The No price is shown as 1 minus the Yes price (an approximation; disclose).
- Graph: `GET /v2/candles/{instrumentSymbol}/15m` (last 24 hours), plus a new point every 5 seconds from pubticker. During "Simulate odds" the graph shows only simulated points and is labeled.
- Some listed answers return 404 from pubticker (finished events still marked active); the app marks them `dead` and stops polling them.
- Look: rounded shapes (`slab()` / `roundedGeo()`), big surfaces about 86% solid. Text is forced to draw after its panel (`renderOrder`) to avoid see-through sorting bugs.
- Physics: `phys` is a spring. xr-input calls `TM.setTarget()` when dragging; `stepPhysics()` makes the base follow with overshoot and lean. `brushAt()` shoves it when a fingertip moves through the base or board. Tunable in SETTINGS: `springStiffness`, `springDamping`, `brushStrength`.
- Verified on desktop only: tabs, cards, duel and list markets, pick, pile, simulate, graph with real history, spring overshoot. NOT verified: anything in the headset, including hand brush, pill presses by fingertip, and how the see-through surfaces look in passthrough.

## Known unknowns
- How to sign transactions inside the Quest browser (no wallet extensions). Plan: Circle's wallet tooling, or an app-held demo wallet. Ask Circle.
- Whether Arc testnet has a yield source. Whether Gemini has a trading sandbox (none found; real trading needs a funded, verified account, so it is a bonus at most).
- In immersive AR the Quest hides its other 2D windows, so "court beside the Quest's virtual big screen" only works in plain browser-window mode; the AR mode is for watching on a real TV.

## Build order from here
1. Tidy the repo and fix what Brian's headset test turns up.
2. Live Gemini odds confirmed working (relay if needed). Lobby of tonight's games as cards. Welcome screen with an Enter button.
3. Arc testnet: contract that locks USDC per pick and pays out or refunds; reporter; wallet flow in the headset; show the contract address.
4. Settlement animation (pile flies to the balance on a win, pops on a loss). A labeled replay or simulation for demos, since judging is in the daytime when no NBA game is live. A second market object (bitcoin price chart) so something is always live.
5. Stretch only if 1–4 work: voice assistant as a simple pulsing orb (fixed commands first, with a spoken confirm step; then Grok for questions; ElevenLabs voice). One real Gemini trade. Sounds.
6. Thursday: README (architecture, how Arc is used, which Gemini endpoints, what is real vs simulated, risks and trust assumptions, uses not allowed), demo video recorded from the headset, Devpost form.

## Sponsor office hours (CST) — remind Brian to attend
- Circle: Mon Nov 16 and Wed Nov 18, 6 PM. Ask: wallet tool on Arc testnet and in a headset browser? Yield on Arc testnet? What do you want to see for Best use of Arc?
- Gemini: Mon, Tue, Thu, 7 PM. Ask: can a web page call the API directly? Live scores in the API? Trading sandbox? What do you want to see for the bounty?
- Cursor/xAI: Tue 7 PM. Ask whether the Grok Bot bounty needs Grok inside X or accepts Grok via API.
- Zoom links are in the hackathon Telegram: https://t.me/+Q0hy2P7nbIk2YWIx

## Submission checklist
- Public GitHub repo with source and setup instructions
- Working demo link (the GitHub Pages URL)
- 2–3 minute demo video (Google Drive or YouTube, viewable by judges)
- README with technical documentation and architecture overview
- Devpost: project name, description, team, track, chain award (Arc), bounties, five written answers (what you built, problem, how it works, what is unique, what is next), technologies and sponsor tools used
