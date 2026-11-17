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

## Headset feedback, evening of Nov 16
- Brian tested the redesign in the headset and said the progress is great. Fixed after his feedback: the board is moved back so it no longer hangs over the court (`BOARD_POS`), the spring is much stiffer (230 / 27) with far less lean, and the hand-brush zone is now only the real surfaces (2 cm around the base and the board) instead of a fat box of air.
- Brian wants a clever way to cash out. Ideas were discussed, nothing is built; do not code it until he picks one.

## Cash-out, built late Nov 16 (decided with Brian)
- Cash-out = sell a pick early at its current value. Fingers near the cash pile light it up and show "Pinch to cash out $X". Pinch to pick it up and carry it. Let go over the court = cancel (it returns). Let go anywhere else = cashed out: the pile flies into the balance card.
- Backup for mouse or controller: press the pile twice within 3 seconds.
- All-or-nothing per pick. A running simulation is stopped first, so cash-out always uses the real Gemini price. It is still local test money; it becomes the Arc payout call in step 3.
- Hand outlines are hidden (`showHands: false` in SETTINGS) because Brian found them ugly. Hand tracking still runs.
- Betting stays as it was (poke a pill, amount panel, Confirm). Brian chose NOT to add grab-a-stack betting.
- Verified on desktop by calling the grab functions directly. NOT verified with real hands.

## Cash mound and partial cash-out, late Nov 16 (replaces the simpler cash-out above)
- Brian confirmed in the headset that the pile glow works. He then asked for the following, all built:
- The cash is a mound of up to 170 small bundles (one InstancedMesh per side). One bundle = a fixed dollar amount (`unitFor(stake)`, stored on the pick as `unit`), so the mound size is the pick value. Bigger units draw bigger bundles (`scaleFor`).
- Each bundle is on its own spring: drops in, bounces on the table, sloshes when the base accelerates (`phys.acc`), and scoots away from a fingertip (`pile.poke`).
- Partial cash-out: finger height on the mound decides how much a pinch takes (`pile.hoverK`): the bottom 30 percent of the height takes all, higher takes only the bundles above the fingers. The lit bundles and the label show the dollars and percent.
- Held cash is still part of the pick: `heldFrac` of the bundles follow the hand and the count keeps tracking the odds. Letting go off the court pays that fraction into the balance and scales the pick stake and shares down. Letting go over the court puts it back.
- Hands: `handStyle: "glove"` adds two A-Frame `hand-tracking-controls` entities (mesh style, 45 percent see-through). "outline" brings back the dots and lines, "none" hides hands.
- Verified on desktop by calling the functions directly (selection by height, partial cash-out $9.50 of $25, held value following a price change, cancel). NOT verified in the headset: the glove model, bundle slosh and poke feel, and how easy the height selection is with real fingers.

## Cash heap v2, 1-100 percent cash-out, glove v2 (night of Nov 16)
- Brian feedback on the first mound: it looked like stacks in a small circle, the percent jumped (2 to 30), the simulation stopped when he lifted cash, and the first glove showed white speckles between overlapping fingers. He sent a photo of the Quest system hand (dark see-through with a light edge) as the target look.
- Heap: a solid lathe core (`CORE_GEO`, swells with value) covered by up to 170 instanced banknotes lying on its surface (`layout(n)`, numbered bottom to top). Notes have a canvas-drawn generic green note texture. Per-note springs, slosh and poke are kept.
- Cash-out amount: `pile.hoverFrac` maps hand height above the table to 1 to 100 percent over `cashRange` (0.16 m), smoothed in `stepGrab`. The percent showing at the pinch is what is taken (`heldFrac`, exact, not rounded to notes).
- Simulation no longer stops on a grab and does not end while cash is held. Amounts during a simulation are labeled "(simulated)" and DO pay into the test balance. When Arc is added, a cash-out during a simulation must not call the contract.
- Glove: `styleGlove()` replaces the A-Frame hand material with a two-step draw (shape first, then only the nearest surface, dark with a bright rim). Verified on desktop by loading the hand model by hand; NOT verified with live hand tracking.

## Circle office hours, Nov 16 evening, and Arc research (nothing built yet)
- What the Circle engineer told Brian: a plain USDC transfer between wallets is NOT enough for Best use of Arc; he wants deeper use. CCTP and Gateway work on Arc testnet. He talked about invisible wallets and user-controlled vs developer-controlled wallets. Agentic use would be nice but he said not to let it stop us (so: not in the plan). Brian has his email for follow-ups (do not put it in the repo).
- Devpost rules (read Nov 16): Best use of Arc is $1,000 inside the track; testnet is fine; existing contracts count; contract addresses must be listed. Circle team is on the judging panel. Consumer track tagline: "the crypto is invisible and the experience is seamless".
- Arc testnet facts from docs.arc.io: chain ID 5042002, RPC https://rpc.testnet.arc.io, USDC is the native gas token and also has an ERC-20 interface at 0x3600000000000000000000000000000000000000 (6 decimals; native balance uses 18). CCTP domain 26. Addresses for CCTP, Gateway, Memo, Multicall3From, ERC-8004 are on docs.arc.io/arc/references/contract-addresses. Explorer for testnet: confirm (sources disagree between explorer.testnet.arc.io and testnet.arcscan.app).
- Circle developer-controlled wallets support ARC-TESTNET including contract calls (`createContractExecutionTransaction`, Node SDK `@circle-fin/developer-controlled-wallets`, needs API key + entity secret, so it must run on a private server, never in index.html). Circle handles fees and signing.
- Faucet: faucet.circle.com gives only 10 test USDC per hour per chain. Plan amounts around that, or ask the Circle engineer for more.
- Plan agreed in principle: (1) Solidity contract on Arc testnet that locks USDC per pick, records odds, handles partial cash-out and payout; (2) developer-controlled wallet per user; (3) small private server that signs via Circle and reports Gemini results; (4) wire Confirm and cash-out to the contract with an explorer link. Agent and CCTP/Gateway cash-in are extras only.

## Direction change, late Nov 16: real Gemini trading, Arc only for the track
- Brian decided he will probably not win the Arc award. Focus is the Consumer track and the Gemini bounty. He wants picks to be REAL orders on Gemini with his own real money, and still needs a blockchain piece because the track requires it.
- Shape agreed: Gemini is the market, Arc is the cash register. Pick = USDC moves on Arc + a real order on Gemini; cash-out = sell on Gemini + USDC back on Arc.
- Gemini trading facts (developer.gemini.com, read Nov 16): `POST https://api.gemini.com/v1/prediction-markets/order` with body symbol (the instrumentSymbol), orderType limit, side buy/sell, quantity (contracts), price (0-1), outcome yes/no, timeInForce (good-til-cancel, immediate-or-cancel, fill-or-kill). Auth is X-GEMINI-APIKEY / X-GEMINI-PAYLOAD / X-GEMINI-SIGNATURE (HMAC-SHA384), key needs the Trader role. Terms must be accepted first: GET /v1/prediction-markets/terms/status, POST /v1/prediction-markets/terms/accept. Positions: POST /v1/prediction-markets/positions. Winning outcome pays $1.00 per contract. OAuth with scope orders:create also exists (the right way for other users to trade on their own accounts, not built).
- A demo environment EXISTS: api.sandbox.gemini.com, separate account, same API; the docs say to confirm prediction markets are supported there. (The earlier note "no sandbox found" was wrong.)
- Hard rules for this work: the Gemini key and secret live only in the private server's settings, never in index.html, the repo, or the chat. Real trading must be locked to Brian (passcode live mode); the public link must not be able to spend his money. Claude writes the code but does not place real orders or enter keys; Brian does both.
- Still unknown: whether Brian has a verified, funded Gemini account that can trade prediction markets where he lives.

## Live trading built (UNTESTED), night of Nov 16
- Brian's Gemini account is verified. He said "lets do this" to: private server, real Gemini trade loop, then Arc wallet + contract + receipts, stop Wednesday night, Thursday video.
- `server/worker.js` is a Cloudflare Worker with no secrets in it. Secrets (GEMINI_API_KEY, GEMINI_API_SECRET, LIVE_PASSCODE) are entered by Brian in Cloudflare. Routes: /status (public), /unlock, /order, /positions (need header X-TM-Pass). Orders are limit + immediate-or-cancel. The server refuses any buy over MAX_ORDER_USD (default 1).
- index.html: `SETTINGS.serverUrl` (empty = test money only). With a URL set, the welcome screen shows "Owner: turn on live trading" which asks for the passcode. In live mode (`LIVE.on`): Confirm places a real buy at the ask, cash-out places a real sell at the bid and the cash stays in the air until Gemini answers, simulation is disabled, the balance is a local budget (`liveBudget`), not the real Gemini balance.
- None of this has been run. Claude must not place real orders or enter keys; Brian tests. Positions are not restored after a page reload (the Gemini account still holds them).
- Next: Arc invisible wallet, contract that locks USDC per pick, memo receipt naming the Gemini order id.

## Arc piece in progress (stopped mid-way on Nov 17 by a usage limit)
- Gemini API key: Brian could not create it on Nov 16 (passkey check failed on his Windows PC; the passkey lives on his iPhone). Retry with the QR / phone option or from Safari on the iPhone. Key settings: Trading only, NOT Fund management, NOT Admin, IP allowlist Unrestricted; if "time based nonce" is on, add GEMINI_NONCE_SECONDS=1 in Cloudflare. Cloudflare account exists (subdomain brianlinxd.workers.dev); unknown whether the Worker was deployed.
- Decision for speed: the Arc wallet is built INTO the app (a practice-network key kept in the browser's localStorage, testnet only, must be disclosed), not Circle developer-controlled wallets. No new accounts needed.
- DONE: `contracts/TabletopEscrow.sol` (written, NOT compiled, NOT deployed). placePick(bytes32 key, uint32 oddsBps, string receipt) payable locks native USDC; cashOut(bytes32 key, uint32 shareBps, string receipt) returns that share to the caller. No owner or admin. It holds and returns the stake only; it does not pay winnings.
- Checked: https://rpc.testnet.arc.io answers web pages (CORS ok, chain id 5042002). Explorer that responds: https://explorer.testnet.arc.io. ethers 6.13.4 is on cdnjs. solc 0.8.26 build is soljson-v0.8.26+commit.8a97fa7a.js on binaries.soliditylang.org.
- NOT DONE (next): in index.html add ethers from cdnjs; SETTINGS.arc {rpc, chainId, explorer, escrow, dollarsToUsdc 0.01}; an ARC module (wallet from localStorage, queued transactions); a "Blockchain setup" panel on the welcome screen (wallet address + copy, balance, faucet link, Deploy button, receipts with explorer links); Deploy = compile the .sol in a Web Worker with soljson (must be a Worker, Chrome blocks it on the main thread) then ethers ContractFactory; call arcLock from addPick and arcRelease from settleCash (pass the Gemini order id into the receipt text); show the receipt count on the balance card. Then Brian funds the wallet at faucet.circle.com (10 USDC per hour), presses Deploy, and sends the contract address to hardcode in SETTINGS.
- A browser-tool attempt to compile the contract was denied by the permission system; do not retry that route. Compile in the app's own Worker, or ask Brian before installing a local compiler.

## Arc wired into the app (UNTESTED), Nov 17
- index.html loads ethers 6.13.4 from cdnjs (with an integrity hash). `SETTINGS.arc` = rpc, chainId 5042002, explorer https://explorer.testnet.arc.io, `escrow` (empty until Brian deploys), `dollarsToUsdc` 0.01 (a $5 pick locks 0.05 test USDC, because the faucet gives only 10 per hour).
- Each browser makes its own practice wallet (key in localStorage `tm-arc-key`; testnet only, disclose). PC and headset are separate wallets and each needs faucet money.
- `addPick` calls `arcLock` (placePick with the pick key hashed, odds in basis points, and a readable receipt; in live mode the receipt names the Gemini order). `settleCash` calls `arcRelease` (cashOut with the same share). Transactions run one at a time in `ARC.queue`. Failures never block the app; they show in the receipts list.
- Welcome screen: "Blockchain setup" opens a panel with the wallet address (copy), balance, faucet link, a "Deploy contract (once)" button, the contract address, and the last 8 receipts with explorer links. Deploy compiles contracts/TabletopEscrow.sol in a Web Worker with soljson 0.8.26 (evmVersion paris), then deploys with ethers; the address is saved in localStorage `tm-arc-escrow` until it is hardcoded in `SETTINGS.arc.escrow`.
- The 3D balance card shows "Secured on Arc: N receipts" once a contract is set.
- Releases during a simulation ARE sent: the contract returns a share of the stake, never a simulated amount, so this is safe (supersedes the earlier note).
- Not built: releasing locks left over after a page reload (the app forgets picks; locks stay in the contract). The explorer's /tx/ and /address/ link format is assumed, not checked.
- Next for Brian: open Blockchain setup on the PC, fund the wallet at faucet.circle.com (Arc Testnet), press Deploy, send Claude the contract address; then fund the headset's wallet the same way.

## Escrow contract deployed, Nov 17
- Brian deployed TabletopEscrow from the in-app panel on his PC: 0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d on Arc testnet (chain 5042002). Confirmed by Claude via RPC: 1693 bytes of code, totalLocked() = 0. Hardcoded in SETTINGS.arc.escrow. This is the address for the README and Devpost.
- Not yet seen working: a real placePick or cashOut from the app.

## Cash cone of up to 1,000 notes, Nov 17 (UNTESTED)
- Brian asked for about 1,000 bills and a heap made only of bills shaped into a cone. MAXB is now 1000 (instance capacity CAP 1300), the solid core is hidden, and `layout(n)` fills the whole cone volume (equal space per note, bottom to top, more notes near the outside). A new pick uses at most 400 notes (`unitFor` units now start at $0.01) so it can grow. The drop-in animation takes about a second however many notes arrive.
- Risk to check in the headset: frame rate with up to 2,000 moving notes on two piles.

## Gemini key created, Nov 17
- Brian created the Gemini API key. Worker is deployed at https://tabletop-market.brianlinxd.workers.dev (/status answered tradingConfigured:false before secrets were added). SETTINGS.serverUrl now points to it, so the welcome screen shows "Owner: turn on live trading".

## First live test, Nov 17
- Gemini key replaced (the first one was exposed in a screenshot; Brian was told to delete it). /status showed tradingConfigured:true. Passcode unlock worked.
- First pick showed "This market cannot be traded now": the app treated a pubticker 404 (`o.dead`) as untradable, but pubticker 404s for many open markets. Fixed: options keep `bid`, `ask` and `closed` (contract marketState) from the events list; live buys are refused only if there is no symbol or marketState is not "open".

- Next live attempt gave "invalid api key" from Gemini. Likely the Cloudflare secret holds the deleted old key, or key/secret were swapped. Brian told to make a fresh key and replace both values. Unlock now fails with Gemini's message if the terms-status call is rejected.

- Nov 17: the "invalid api key" was a typo (0 vs O) in the Cloudflare value. After fixing it, unlock worked and a $1 live buy reached Gemini, which answered "insufficient funds". The full signed order path is confirmed working; the account needs a USD deposit.

- Nov 17: Brian deposited and placed a real $1 order from the app; he says it worked and he "lost 1 dollar" (not yet clear whether he sold it back or the position fell). Whether the live SELL (cash-out) works is not confirmed. README updated to say a real buy was placed.

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
