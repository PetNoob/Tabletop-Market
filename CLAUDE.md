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

- Nov 17: Brian noticed the live table balance did not match Gemini. Added server route /balance (POST /v1/balances, USD "available") and `liveBalance()` in the app: called at unlock, 1.5 s after each live buy or sell, and every 20 s. The card title is now "Gemini balance (REAL money)". Needs the updated worker.js pasted into Cloudflare. Not tested.

## Graph restyle and red LIVE NOW, Nov 17 (UNTESTED)
- Graph: 55 percent see-through background, 5 horizontal and 4 vertical gridlines, a faint fill under each line, time stamps along the bottom (start, middle, "Now"), and a dot with a pulsing additive glow (`graph.pulse(now)` from `stepPulse`).
- Faster: the graph's answers re-poll every 3 s (`gameRefreshSec` 3); all answers on the board every 9 s. Kept near Gemini's public limit (about 120 requests a minute).
- "LIVE NOW" is red and pulses (text shader opacity uniform) on lobby cards and on the market board.

## Activity tab and positions after reload, Nov 17 (UNTESTED)
- Brian confirmed in the headset: a live PARTIAL cash-out sold on Gemini and worked. The live balance did not update because his Cloudflare worker was still the old code (the card said "update the server code").
- He asked for an Activity tab because cash piles vanished after a reload. Built: an "Activity" button next to the lobby title toggles `state.activity` with sub-tabs Positions, Orders, History (cards reuse CARDS; `card.act`).
- Live: `liveSync()` reads POST /v1/prediction-markets/positions (at unlock, every 15 s, 2.5 s after each order) into `LIVE.positions`; `syncPicksFor(m)` rebuilds `state.picks` for the open market from them, so piles come back after a reload. A duel "No" position is shown on the other team's pile. Orders = POST /v1/prediction-markets/orders/history via new server route /history.
- Test mode: picks, balance and a log are saved in localStorage `tm-test` and restored on load.
- History = Arc receipts. Pressing a position or order opens that market via GET /v1/prediction-markets/events/{eventTicker}.
- Needs worker.js re-pasted into Cloudflare (adds /balance and /history).

- Nov 17: Brian re-pasted the worker and confirmed "it works" for the Activity tab, live balance and positions after reload.

## Market pictures, Nov 17 (UNTESTED)
- Gemini sends `imageUrl` per event (bitcoin, oil barrel) and per contract (generic team shoes for NBA, helmets for NFL, in team colors; not league logos). assets.gemini.com sends no CORS header, so WebGL cannot use them directly. New public worker route /img?u= (only https://assets.gemini.com/...) passes them through with CORS and a 1-day cache.
- App: `iconEntry`/`iconMesh`/`setIcon` (texture cache `TEX`). Pictures on lobby cards, the board title, answer rows, and duel pills; Activity cards use the position's event picture. `SETTINGS.icons` turns them off. Images are AVIF or PNG (Quest browser decodes AVIF). Needs the worker re-pasted.

## Design pass, Nov 17 (UNTESTED)
- Market pictures have rounded corners (`roundedPlane`). Brian confirmed the pictures show.
- Court only for basketball (`courtShow(!!m.hoops)`); other sports and all other markets get the plain table surface (Brian picked option A and small touches; the plain surface was Claude's default since he did not choose).
- Animations (`tween`/`stepAnims`, run from TM.frame): the court lines draw out from the center and the hoops rise with a slight overshoot and a rim glow (900 ms), retract in 380 ms. Opening a market: a stand-in panel (`UI.ghost`) grows from the pressed card into the board, then fades to reveal the market (700 ms; `UI.trans` stops refresh() from toggling views). Back: it shrinks into that market's card (450 ms). Pills slide up from the table edge; the graph line draws left to right on open (`graph.reveal()`).

## Lobby without a table, Nov 17 (UNTESTED)
- Brian: animations are nice. Asked for the table to disappear in the lobby, the lobby to slide forward, and slide back when a market opens; and easier-to-read text.
- `UI.base` holds the table slabs. `setStage(k)`: 0 = lobby (list at STAGE_LOBBY, forward and lower, table hidden), 1 = market (list at the back, table grown in with a slight overshoot). Opening: stage slides to 1 (420 ms), then the card grows into the board, then the court draws in. Back: the board shrinks into its card, then the stage slides to 0. Balance card and move handle stay in the lobby. Hand brush on the base only counts at stage > 0.5.
- Readability: C.dim brightened to #b0b8c3, panels 93 percent solid (SEE), lobby card titles, answer names, feet, tabs, board answers and graph labels all larger.

- Odds ticker (Nov 17, UNTESTED): `tickerLabel`/`setTicker` give the lobby card odds, board answer odds, pill odds and Activity values a second text; on a change on the same market the old value slides out, the new slides in (up from below when rising), with a green or red flash (pills: slide and pulse only). `SETTINGS.oddsAnim` turns it off.

- Odds wheels (Nov 17, UNTESTED, replaces the slide ticker): Brian wanted bike-lock style rolling. `tickerLabel` is now a group of per-character wheels (right-aligned, widths from CHAR_W). On a change on the same market, only changed digits turn, through the digits in between, upward for a rise and downward for a fall (tilted on a small drum, R = 0.85 x size), with a green or red flash. Pills: no flash. Each wheel has a second text created only when it first turns.

- Nov 17: Brian said the wheels are pretty good but digits looked cramped and slightly too big. Digits now drawn at 86 percent (GLYPH) with wider slots (CHAR_W). SETTINGS.distance 0.75 to 0.67 so everything is a bit easier to reach.

- Nov 17 fixes (UNTESTED): odds wheels now read real character widths from the loaded font (`fontInfo`/`tkAdvance`, same formula A-Frame uses) and draw at normal size (GLYPH 1), so spacing matches other text. The amount panel opens only from a pill: duel answer rows no longer open it, and pills ignore touches during arrival (`UI.arriving`, 1.9 s finger lock on open). Table, court lines and hoops scaled to COURT_SCALE 0.85; pills narrower (0.282 wide at x +-0.146); move handle at z 0.275; "over the court" cash-out zone shrunk to match.

- Nov 17: crypto lobby cards showed crushed odds digits on the lower rows. Cause (diagnosed, not confirmed): wheel slots are created lazily and positioned at once, then A-Frame's position component initializes on "loaded" and resets x to 0. Fix: `tkWhenReady` re-runs `tkLayout` for that ticker when a new slot's entity loads.

## Move to Gemini: Arc to Base with CCTP (built Nov 17, UNTESTED)
- Brian chose option 1: practice networks end to end, with the final deposit into Gemini shown as a labeled next step (Gemini only accepts real USDC). He dropped the on-ramp idea for now.
- Checked live before building: CCTP TokenMessengerV2 0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa and MessageTransmitterV2 0xe737e5cebeeba77efe34d4aa090756590b1ce275 have code on Arc testnet (and the transmitter on Base Sepolia); iris-api-sandbox fees 26 -> 6 with forward=true returned forwardFee med about 0.0528 USDC, minimumFee 0, CORS *. The address 0x28b5... listed on docs.arc.io is the MAINNET messenger (no code on testnet).
- Flow (`arcBridge`, from Circle's Ethereum-to-Arc forwarding quickstart, reversed): fee quote, approve USDC (0x3600...) to the messenger, depositForBurnWithHook(total, 6, wallet as bytes32, usdc, 0, maxFee, 1000, hook "cctp-forward"), then `bridgeWatch` polls /v2/messages/26?transactionHash= until `forwardTxHash` (the Base mint by Circle). Runs inside ARC.queue. Resumes watching after a reload.
- UI: "Move to Gemini" section in the Blockchain setup panel (0.25 / 0.5 / 1 test USDC) with four steps and receipt links (Arc explorer for the burn, sepolia.basescan.org for the mint). Shows in Activity > History as "Arc to Base".

- Nov 17: Brian confirmed the bridge: steps 1, 2 and 3 all got real check marks (burn on Arc, Circle confirmation, mint on Base Sepolia). README updated: bridge section, CCTP addresses, Arc award listed, Activity/balance/pictures/animations, new Gemini endpoints.

## Voice assistant (built Nov 17, UNTESTED)
- Brian has Grok (xAI, needed a payment method) and ElevenLabs keys; they go in Cloudflare as XAI_API_KEY and ELEVENLABS_API_KEY. Optional XAI_MODEL (default grok-4.20-0309-non-reasoning, from docs.x.ai models page) and ELEVENLABS_VOICE (default JBFqnCBsd6RMkjVDRZzb).
- Worker routes (public, soft rate limit 90 an hour per IP, in memory): POST /stt (raw audio body -> ElevenLabs POST /v1/speech-to-text, model scribe_v2), POST /ask ({question, context} -> xAI /v1/chat/completions, max 260 tokens, ASSISTANT_RULES: 1-3 spoken sentences, never recommend a bet, JSON {say, action}), POST /tts ({text} -> ElevenLabs /v1/text-to-speech/{voice}, eleven_flash_v2_5, mp3). /status now also reports voice and grok booleans.
- App: `buildOrb` puts a glowing orb at (0.43, 0.075, 0.06) on the market root with a subtitle panel. Press = record (MediaRecorder) up to 8 s, press again to stop; then stt -> ask (with `aiContext()`: mode, balance, open market and odds with 24 h change, user picks, or lobby markets by index) -> `aiDo(action)` (open market by index, category, back, activity, simulate; never money) -> tts played through an AudioContext with an analyser that drives the orb pulse. Colors: idle green, listening white, thinking amber, speaking green.
- Welcome screen: "Turn on the voice assistant (microphone)" asks for mic permission before AR (the prompt may be hidden in immersive mode). AudioContext is unlocked on the Enter press.
- Not verified: MediaRecorder and mic inside the Quest browser's immersive AR session, and whether ElevenLabs accepts the Quest's webm audio.

## Grok v2: wake word, flame character, joint gloves (Nov 17, UNTESTED; page start checked)
- Brian's asks: no subtitles; a floating character (black core ball, see-through dark grey animated flame, two blinking eyes, no mouth) with float and talking bounces; it lags behind when the table moves; "Hey Grok" wake word with an automatic "Hey!", "Yeah?" or "What's up?"; a cuter (less macho) voice; fix the gloves, which were not showing.
- Grok (`buildOrb`/`stepOrb`): an entity on the scene root (not the table) following a world target 0.42/0.13/0.04 in table space on a soft spring (34 / 7.5), always facing the camera. Two layers of `flameMaterial` (ShaderMaterial, value noise, fresnel alpha, top stretches, `uLean` from velocity so it trails). Eyes blink every 2 to 5 s, bigger when awake, glance up when thinking, squint when speaking. Modes: sleep, awake, thinking, speaking. A tiny note under him shows only on errors.
- Wake word: after the start-screen mic button (stores tm-voice=1) the mic starts on Enter (`wakeStart`). Always-on MediaRecorder with a loudness check (`vadTick`, adaptive floor) cuts each sentence and sends it to /stt; regex WAKE matches "hey grok" and mishearings. While sleeping, only wake-word sentences act; awake for 9 s takes the next sentence as the question. Greetings are pre-fetched as audio. He does not listen while thinking or speaking. Tapping him still wakes him. Cost note: every sentence spoken nearby is one ElevenLabs speech-to-text call; worker limit raised to 400 an hour per IP.
- Voice: worker tries Gigi jBpfuIE2acCO8z3wKNLl, Elli MF3mGyEYCl7XYWbV9V6O, Sarah EXAVITQu4vr4xnSDxMaL, Rachel 21m00Tcm4TlvDq8ikWAM in order (first one the account can use), with livelier voice_settings; playback at 1.06x. Personality line added to ASSISTANT_RULES.
- Gloves: the A-Frame hand-tracking-controls model is no longer used. `drawGlove(i, joints)` draws each hand from the 25 joints xr-input already reads (InstancedMesh tubes for GLOVE_SEGS and balls for joints, radii JR), depth pre-pass then rim-lit see-through skin.
- Needs the worker re-pasted (voice list, personality, rate limit).

- Grok v3 (Nov 17, UNTESTED; page start checked): Brian asked for a sleeping animation and pat-to-wake with physics. Grok starts asleep (eyes shut to lines, slow breathing, lazy dim flame, floating z's, sits lower); nothing is sent to ElevenLabs while asleep. `grokTouch` (called per hand from xr-input via TM.handTouch) treats any fingertip or palm joint within 4 cm as a pat: `grokPat` adds the hand's velocity to his spring, a jelly squash (spring 260/9), and a flame flare, pushes him out of the hand, and if asleep wakes him (startled blink, hop, greeting, then awake). Pinch/trigger/mouse click on him also pats. Awake: every sentence is a question (wake word not needed); he stays awake after answering and dozes off after 25 quiet seconds. The mic starts on the first pat (not on Enter). Patting him while he talks stops him.

- Grok v4 (Nov 17, UNTESTED; page start checked): Brian said Grok answers only sometimes and asked for voice orders and pulling up markets/activity. The action list now lives in `aiContext()` (client) and the worker rules just say "use the listed actions; never choose a side or amount". Actions: open by name (searches loaded markets, then Gemini /events?search=) or index, category, back, activity with tab (positions/orders/history), simulate, order {answer, side, amount}, cashout {answer, percent}. Orders and cash-outs set `AI.pending` and Grok reads back exactly what will happen ("Put $2.00 on Boston at 77%? Say yes to confirm"); the next sentence is checked by `aiConfirm` (yes words without no words), expires after 30 s, then goes through confirmPick / grabBegin+grabDone, so live caps still apply. Hearing: VAD threshold lowered to floor*2+0.006; flame brightens and eyes widen while he hears speech. Needs the worker re-pasted (new rules).

- Nov 17 (UNTESTED; page start checked): Brian reported Grok answered once, then went blank when he interrupted to ask again; and the gloves had a faint white outline at every angle. Fixes: barge-in (`vadTick` keeps listening while he thinks or speaks; while speaking, your voice must beat floor*2 + 0.026 + 0.6 x his output level for 320 ms, then his audio stops and he listens); `aiAnswer` uses a request id so the newest question wins and older answers are dropped. Gloves: even dark grey (about 62 percent opaque) with a faint lighter top and a soft edge that fades (no white rim), smoother tubes and balls, fuller fingers, and a flattened ball filling the palm (sphere instance 25).

- Nov 17: Grok opened the Michigan game by voice, then stared blankly at the next question. Cause unknown (candidates: hidden speech-to-text error such as ElevenLabs credit running out, stuck in thinking/speaking, or voice not detected). Added `SETTINGS.grokDebug` (true while testing; set false for the demo): a small note under Grok shows "Heard: ... [mode]" or the error; every listening error is now shown; safety resets in stepOrb (thinking over 20 s, or speaking with no audio source for 2 s, go back to awake); AudioContext resumed before playback.

- Nov 17: the debug note showed "Couldn't hear: ElevenLabs: file corrupted". Cause: `recStart` pushed data into the global AI.chunks, so the old recorder's final piece (fired after stop) landed at the start of the next clip, making it an invalid webm. Fixed by giving each recorder its own chunks array (closure). This explains "answers once, then stares".

- Nov 17: after the clip fix, Brian said Grok is slow (5 to 10 s before "Heard: ..." appears) and then does nothing. Changes (UNTESTED; page start checked): silent clips are thrown away every 3 s (was 6) so clips are short; end of sentence at 600 ms; the moment a sentence ends while awake he switches to thinking (and bumps AI.req); after his audio ends he is deaf for 700 ms and then starts a fresh clip (`deafUntil`, `freshClip`) so he does not hear his own voice; barge-in needs floor*2 + 0.041 + 0.9 x his level for 420 ms; empty or failed hearing returns him to awake. Debug note now shows each step: Heard, Asking Grok, Grok's reply (with action), Skipped, or the error.

- Nov 17: Grok now answers and can be interrupted (Brian confirmed). Remaining complaints: poor speech-to-text, not smart, no memory, sometimes slow. Changes (UNTESTED; page start checked): /stt sends language_code en, no_verbatim, and up to 90 `keyterms` from the app (`aiTerms()`: app words, tab names, names on the table) via ?k=a|b|c, retrying without terms on 400/422 (keyterms add about 20 percent to cost); mic noiseSuppression off; end of sentence 800 ms. /ask takes `history` (last 12 messages kept in AI.history) and the rules mention mishearing. /tts accepts GET ?text= and uses ElevenLabs /stream; the app plays answers through an <audio> element (`aiVoiceEl`, routed through the analyser) so speech starts while downloading; greetings still use prefetched buffers; `aiHush()` stops either. Debug note shows "hearing Xs | Grok Ys | voice Zs". A smarter model can be tried by adding XAI_MODEL (for example grok-4.3) in Cloudflare. Needs the worker re-pasted.

- Nov 17: Brian: "a hell of a lot better", but he could not interrupt Grok while Grok counted down from 20. Cause: the barge-in bar (floor*2 + 0.041 + 0.9 x output level) assumed far more echo than reaches the mic. Now `AI.echoK` learns the mic/output ratio while the user is quiet, and barge-in needs mic > floor*2 + 0.018 + 2.2 x echoK x output for 350 ms; fresh clips during his speech are only started when no one is mid-word. UNTESTED.

- Nov 17: Brian found the latest version slow and said he would rather lose interrupting unless it can be as fast. Likely causes: noise heard while thinking counted as a newer question and discarded the answer in progress; end-of-speech had been raised to 800 ms; a longer keyterm list. Changes: `vadTick` ignores the mic while thinking (and while speaking if `SETTINGS.grokInterrupt` is false); end of speech 650 ms; keyterms capped at 40; history sent capped at 8 messages. UNTESTED.

- Nov 17: Brian chose to turn interrupting off: SETTINGS.grokInterrupt = false (Grok finishes speaking before listening; tapping or patting him still stops him).

- Nov 17: "open crypto" / "open commodities" did nothing after a game opened fine. Likely Grok sent {type:"open", name:"crypto"} (a market search) or a tab name that did not match exactly. `aiFindCat` now matches tabs loosely (ignores the/tab/section/markets, singular/plural, partial), and an "open" whose name matches a tab is treated as a category switch. UNTESTED.

## Quest-style hand overlay (Nov 17; model load and shader compile checked on desktop, NOT seen in the headset)
- Brian pasted a spec: thin soft white outline of the whole hand silhouette (finger gaps included), faint see-through fill, restrained glow, no skeleton/dots/wireframe, follows bends and pinches, fade out/in with tracking, brighter while pinching; do not fake it by connecting landmarks.
- Constraint: WebXR in the Quest browser gives 25 joint poses per hand, no mesh or segmentation and no camera image. So the overlay uses a real skinned hand mesh: the Oculus hand GLB (cdn.aframe.io/controllers/oculus-hands/v4/left.glb and right.glb, CORS *), posed like A-Frame's hand-tracking-controls does (bones[i].position/quaternion = joint i pose in room space, armature transform reset).
- xr-input now stores joint orientations (H.quats) and calls TM.handPose(handedness, joints, quats) per tracked hand, and handPose(side, null) for hands not seen this frame.
- `handPose`/`stepHands`/`handMaterials`/`loadHand`: four SkinnedMesh copies sharing the skeleton: depth pre-pass (order 20), glow hull (back faces, pushed out 3.4 mm, alpha 0.14), line hull (1.1 mm, alpha 0.55), fill (fresnel, alpha 0.06 to 0.20, light grey). uA = fade x (1 + 0.6 x pinch). Fade in 10/s, out 6/s. Smoothing: lerp/slerp with alpha 0.45 to 1 by movement. If the model fails to load, the old capsule glove (`drawGlove`) is the fallback.
- Limits to tell judges: the model is a generic hand shape, not the user's exact hand; outline thickness is a fixed world size.

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
- Nov 17 hand fix (UNTESTED): the left hand was scrambled because bones were matched by list position; the left GLB lists its 25 bones in reverse order (pinky tip first; checked by reading the file). Bones are now matched by joint name (`JOINT_NAMES`, `h.byJoint`). Fill is now see-through dark grey (about 66 to 80 percent opaque, lighter at the edges) instead of a faint white tint, and the fill, outline and glow all fade out toward the wrist (`tmFade`, along wrist to middle knuckle; uniforms uWrist/uAxis/uLen set in handPose).
- Nov 17: Brian confirmed in the headset that both hands look perfect. LOCKED: do not change the hand overlay (look or code) unless Brian explicitly asks to change the hands.

## Lobby redesign, Nov 17 (UNTESTED; scripts parse cleanly with esprima)
- Brian pasted a design prompt with a Gemini website screenshot; agreed version: row-by-row scrolling, separate category bar, featured card with graph and odds, voice search, no invented data.
- One panel 0.74 x 0.48 (`LW`, `LH`; STAGE_LOBBY y raised to 0.30). Fixed header: "Tabletop Market", search field (press = Grok asks "What should I look for?", next sentence becomes a Gemini `search=` query; x clears), Activity, Sort (Top = Gemini order / Volume / Soonest, sorts only loaded markets), status.
- Scrolling area (`CTOP`..`CBOT`): featured card (`UI.feat`, `FEAT_H`) then a 3-column grid from a pool of 12 cards (4 rows). `state.scroll` = top row; `scrollBy(+-1)` slides 240 ms and `clipContent()` hides anything not fully inside. Rail on the right: arrows, thumb, and finger drag along it (`railTouch`, from TM.handTouch; scroll-bar direction: drag down = further down). Mouse wheel on desktop. Scroll position is kept when opening a market and coming back.
- Featured = a live game if there is one, else the first game, else the first market; kept by ticker per category (`state.feat`), never rotates. Left: icon, title, LIVE/time, two big cyan/yellow answer buttons (open the market; on a list market they select that answer), your pick, volume + "odds Xs ago" + "score: ESPN". Right: score and clock or "MSU vs TENN" / most likely answer, graph of both answers (cyan, yellow) with legend.
- Cards: category, LIVE + clock or time, team icons and names (games) or title + top two answers (lists), cyan-outlined % pills (centered tickers), ESPN score boxes, footer with your pick / "+N more" and volume.
- Category bar (`UI.bar`, child of the lobby, hidden at stage > 0.5): All, Live (red dot), then Gemini categories in CAT_ORDER, then the rest; arrows scroll it sideways; selected tab has a cyan underline and is brought into view. In Activity it shows Positions / Orders / History. "All" = /events with no category; "Live" = /events (30 at a time) filtered to isLive (Gemini has no live filter); search = /events?search=.
- Scores: ESPN public scoreboard (site.api.espn.com/apis/site/v2/sports/{league}/scoreboard, no key, CORS *, unofficial). League from subcategory/tags (`LEAGUES`); teams matched by abbreviation or name plus start time within 12 h; polled every 30 s while a game is live, else 2 min, only for leagues on screen. Also shown on the market board line ("(score: ESPN)"). Must be disclosed in the README.
- Gemini events carry `volume` (now `m.volume`); contracts keep `abbr` and `side`. Reloads keep price history (`o.hist`) by symbol.
- Grok: new action {"type":"search","words":...}; tabs list uses barCats().

## Market board redesign, Nov 17 (UNTESTED; scripts parse cleanly)
- Brian pasted a detail-view prompt with a Gemini game page screenshot. Agreed: keep the table, court, pills and cash piles; restyle only the upright board. Skip watchlist, share and Stats. The category bar stays hidden in the market view (no room under the board). Cyan/pink in the screenshot are team colors, so charts use each team's own color; the lobby featured card now also uses team colors for games (cyan/yellow only for answer lists).
- Board is now the lobby panel size (LW x LH; the grow/shrink stand-in too). Header: "< Back" button, picture, title, odds status. A live line between two thin rules (ESPN period and clock, else start/close time). Games: big score between the two team pictures with codes under them ("vs" when ESPN has no score). Answer lists: the answer rows (with paging) on the left, chart on the right.
- `makeLineChart`: thin lines, no fill, bottom axis with 5 time labels, dot plus pulsing ring at each end, big name and percent labels beside the ends, pushed apart when closer than 4.2 cm and kept inside the chart. `UI.wide` (games) and `UI.narrow` (lists); `UI.graph` is a small proxy for reveal/pulse.
- Ranges (`m.range`, kept while data updates): Live = /v2/candles/{sym}/1m since game start (or last hour, labeled "1H" when not live), 1D = 15m (the old history), All = 1hr, falling back to 15m when fewer than 6 points. Gemini only has candles where trades happened (6hr and 1day returned NoDataFound for a game). New prices are appended to all loaded ranges.
- Footer: event date with time zone ("Nov 17 @ 9:30pm CST", or "Closes ..."), volume, "score: ESPN" when shown; Live/1D/All with the active one as a gray pill (hidden during simulation).

- Nov 17 voice commands (UNTESTED): Brian said open/back worked only sometimes. Now `aiLocal(q)` handles plain commands in the app without Grok (back/home/lobby, open a tab, open <market words>, positions/orders/history, search for X, simulate) and speaks a short ack; everything else still goes to Grok. Grok's past answers are kept in history as {say, action} JSON so he keeps replying with actions; `aiDo` accepts action names like go_back, open_market, positions. `aiFindCat` matches whole words only (the new All/Live tabs made 'basketball' match 'All'). aiOpen ignores filler words (the, game, market...). No worker change.
- Nov 17 Gemini outage: every /v1/prediction-markets route returned 500 'An unexpected error occurred' (pubticker still worked). Added a safety net (UNTESTED): after each good category load the markets are saved in localStorage `tm-snap` (up to 36 per category, plus the category list; not searches). When Gemini fails, saved markets are shown with live switched off and `m.saved`; lobby header says 'Gemini down: saved <time>' in red, the board says 'Saved odds (Gemini down), prices still update' (pubticker keeps working). Samples only if nothing was ever saved. Retries every 60 s while not live. Saved per browser: open each category once in the headset while Gemini works.
- Nov 18 colors and distance (UNTESTED): Brian disliked the cyan. Accent is now Gemini-style orange `ACC` #ff8c32 (card pill outlines, category underline, active tab tint #2b1d12, search listening text, list answer 1); `ACC2` #e6e9ee off-white for a list's second answer; games still use team colors. Welcome page: orange Enter button with soft glow, orange logo outline, links and on-states, warm dark gradient; the little cash in the logo stays green. Cash and money texts stay green. Closer at AR start: SETTINGS.distance 0.67 -> 0.58, STAGE_LOBBY z 0 -> 0.08 (lobby panel about 0.50 m away).
- Nov 18 more orange and spacing (UNTESTED): `C.acc` #ff8c32 / `C.accInk` replace green for interface accents (Live from Gemini status, board odds status, balance card interest line and cash-in flash, walletOn tint #5a3315, Your pick texts, Risk/win line, Confirm button, list chart line, move-handle grab, Arc lock receipts, controller pointer tip, welcome logo cash). Green kept only for meaning: odds rising flash, Yes pill, bought vs sold. Lobby closer again: STAGE_LOBBY {y 0.29, z 0.15}; category bar snug (y -0.265). Balance card moved to (-0.54, 0.05, 0.21) rot -35 26 0, clear of the wider panel. Grok's target now glides with the stage: lobby (0.51, 0.34, 0.16) beside the panel's right edge, market (0.42, 0.13, 0.04) as before.
- Nov 18: "hotbar" = the move handle. Reverted the last spacing round (STAGE_LOBBY back to {y 0.30, z 0.08}, category bar back to y -0.272). The handle now follows the stage in setStage: lobby (0, 0.012, 0.222), just under the category bar; market (0, -0.006, 0.275) at the table's front edge as before. Pinch-grab of the handle by hand is now the handle's own box plus a margin (local |x|<0.10, |y|<0.035, |z|<0.05) instead of 12 cm around its center, so pinching near the bar does not grab the dashboard. UNTESTED.
- Nov 18: at boot the lobby panel sat at the BOARD position (back of the table) until the first market open/back, because UI.lobby was created with position BOARD_POS and A-Frame's position component applies that attribute after setStage(0) ran. Fixed: the lobby entity is created at the STAGE_LOBBY position/rotation. This likely explains Brian's 'dashboard is far away when AR starts'. Handle in the lobby moved slightly forward: (0, 0.008, 0.25); market still (0, -0.006, 0.275). UNTESTED.
