# Tabletop Market

**A prediction market you can put on your table.**

Tabletop Market is a mixed reality web app for Meta Quest 3. A live prediction market from Gemini appears as an object on your real table: a small court with the market's odds, a price graph, and a pile of cash that shows what your pick is worth right now. You pick a side by touching it. You cash out by pinching the money and lifting it off the table. Or you just ask Grok, a small floating voice assistant: "Grok, put five dollars on Boston." Every pick's stake is locked in a contract on Arc, and USDC moves from Arc toward Gemini through Circle's bridge (CCTP).

- **Live app:** https://petnoob.github.io/Tabletop-Market/
- **Demo video:** _link added at submission_
- **Escrow contract (Arc testnet):** [`0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d`](https://explorer.testnet.arc.io/address/0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d) (source verified on the explorer, so every pick and cash-out shows as a readable receipt)
- **Circle's bridge (CCTP) on Arc testnet:** TokenMessengerV2 `0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa`, USDC `0x3600000000000000000000000000000000000000`
- **Track:** Consumer Applications
- **Chain award:** Best use of Arc
- **Bounties:** Gemini Prediction Markets, ElevenLabs (speech-to-text, voice and sound effects). The assistant's brain is Grok through the xAI API (not the Grok bot on X).

Built during the UBC 2026 Hackathon (Nov 12 to 20, 2026).

---

## Try it

**On a Meta Quest 3**
1. Open the link above in the Quest browser.
2. Press **Enter mixed reality**. The market list floats in front of you.
3. Pinch the small bar at the front edge to move it onto your real table.
4. Touch a category tab, then a market card. The card grows into the market board, the table appears under it, and for basketball the court draws itself in.
5. Touch one of the two colored pills at the front to pick a side. Set an amount and press **Confirm**.
6. To cash out, bring your fingers to the cash pile. The height of your hand chooses how much (1% to 100%). Pinch, lift it off the court, and let go.
7. Press **Activity** at the top of the list to see your positions, orders and onchain history. Press one to reopen its market.
8. **Talk to Grok** (the little flame with eyes). On the welcome screen, press **Turn on the voice assistant (microphone)** first. He starts asleep: pat him, or wave at him from across the room. Then start with his name: "Grok, open crypto", "Grok, put five dollars on Auburn", "Grok, cash out half", "Grok, come here", "Grok, go to sleep". Anything that moves money is read back first and only happens after you say "yes".
9. **Follow** (next to the grab bar) makes the market trail you as you walk around. Pull the corner grip of the board to make everything bigger or smaller.

**On a computer**
Open the link and choose **View on this screen instead**. Click instead of touching; click the cash pile twice to cash out. Drag to look around.

**When nothing is moving**
Prediction markets can be quiet during the day. The **Simulate odds** button moves the odds of the market on the table so you can see the cash pile grow and shrink. Everything it shows is labeled "Simulated".

---

## What is real and what is not

We want judges to be able to check every claim, so here it is plainly.

| Part | Status |
|---|---|
| Markets, categories, answers | **Real.** Pulled live from Gemini's public API. |
| Odds on the table | **Real.** Midpoint of Gemini's best bid and ask, refreshed every 3 to 9 seconds. |
| Market pictures | **Real.** Gemini's own images (bitcoin, oil barrel, team shoes and helmets in team colors). |
| Price graph | **Real.** Gemini's price history (Live = 1-minute candles since the game started, 1D = 15-minute, All = hourly), plus live points. |
| Scores and game clock | **Real, but not from Gemini.** Gemini's API has no scores, so they come from ESPN's public scoreboard feed (unofficial, no key). Labeled "score: ESPN" on screen. |
| "LIVE NOW" label | **Real.** Shown only while a game is actually being played (ESPN says so, or it started less than a normal game length ago). Gemini marks every open market as live, so we do not use that flag. |
| "No" price on yes/no markets | **Approximation.** Shown as 1 minus the Yes price, not Gemini's own No price. |
| Balance in the app | **Test money.** Starts at $100 and is saved in this browser. |
| **+ Add** and **Withdraw** | **Simulated.** A ready-made TEST card and TEST bank account; nothing is typed in and no money moves. The screen says so. A real product would use a card on-ramp. |
| Grok, the voice assistant | **Real.** Your speech is turned into text by ElevenLabs, answered by Grok (xAI API), and spoken back by an ElevenLabs voice. Simple commands (open, back, come here...) are handled in the app without Grok. |
| Sound effects | **Real ElevenLabs sound generation.** Each sound was generated once by ElevenLabs and is cached by our server. |
| Saved markets when Gemini is down | **Real, but old.** If Gemini's market list fails, the last markets this browser loaded are shown, labeled "Gemini down: saved <time>". Prices still update. |
| Balls, coin vault, oil wells, metal blocks | **Decoration.** Each kind of market gets its own table (a court for games, a vault for crypto, pumpjacks for oil, a block mountain for metals) with physics you can poke. They do not affect money. |
| Stake locked on Arc | **Real transactions on Arc's testnet** (free test USDC, not real money). |
| Move to Gemini: Arc to Base | **Real transactions on testnets**, through Circle's CCTP and Forwarding Service. Verified end to end on Nov 17, 2026 (burn on Arc, Circle's confirmation, mint on Base Sepolia). |
| Move to Gemini: deposit into Gemini | **Not performed.** Gemini only accepts real USDC, so with test USDC this last step is shown as the next step. |
| "Earning 4.1% while idle" | **Preview only.** Not a real yield. |
| Simulate odds | **Simulated.** Labeled on screen whenever it is on. |
| Real orders on Gemini (live mode) | **Real, owner only.** Real buys and a real partial sell (cash out by hand) were placed from the app on Nov 17, 2026. See below. |
| Gemini balance and positions (live mode) | **Real.** Read from the owner's Gemini account, so cash piles come back after a reload. |

---

## How it works

```
                 ┌──────────────────────────────────────────┐
                 │  index.html (A-Frame + WebXR, on GitHub  │
                 │  Pages). Runs in the Quest browser.      │
                 └──────┬──────────────┬───────────────┬────┘
        public market   │              │ stake lock /  │ owner-only
        data (no key)   │              │ release       │ live orders
                        ▼              ▼               ▼
          ┌─────────────────┐  ┌───────────────┐  ┌──────────────────────┐
          │ Gemini Prediction│  │ Arc testnet   │  │ server/worker.js     │
          │ Markets API      │  │ TabletopEscrow│  │ (Cloudflare Worker,  │
          │ (public)         │  │ contract      │  │ holds the Gemini key)│
          └─────────────────┘  └───────┬───────┘  └──────────┬───────────┘
                                       │ Circle CCTP          ▼
                                       ▼ (Forwarding)  Gemini order API (private)
                               ┌───────────────┐
                               │ Base Sepolia  │ ── next: deposit into Gemini
                               └───────────────┘
```

The whole app is one HTML file. There is no build step and no login.

### Gemini Prediction Markets API

Public endpoints, called directly from the page (Gemini allows it):

| Endpoint | Used for |
|---|---|
| `GET /v1/prediction-markets/categories` | The category tabs in the lobby |
| `GET /v1/prediction-markets/events?status=active&category=…&limit=12&offset=…` | The market cards, 12 at a time per tab |
| `…/events?…&category=Sports&sports_market_type=moneyline` | Sports tab and Live tab: one card per game (Gemini lists every player prop as its own event) |
| `…/events?status=active&search=…` | Search (typed or by voice: "Grok, search for bitcoin") |
| `GET /v1/prediction-markets/events/{ticker}` | Reopen one market from the Activity tab |
| `GET /v1/pubticker/{instrumentSymbol}` | Live bid and ask for each answer, every few seconds on the table |
| `GET /v2/candles/{instrumentSymbol}/1m`, `/15m`, `/1hr` | The price graph: Live, 1D and All |

Private endpoints, called only by the server with the owner's key:

| Endpoint | Used for |
|---|---|
| `POST /v1/prediction-markets/order` | Buy when you confirm a pick, sell when you cash out (limit, fill-now-or-cancel) |
| `GET /v1/prediction-markets/terms/status` | Checked when live mode is unlocked |
| `POST /v1/prediction-markets/positions` | Read the account's positions, so cash piles come back after a reload |
| `POST /v1/prediction-markets/orders/history` | The Orders list in the Activity tab |
| `POST /v1/balances` | Show the real Gemini dollar balance on the table |

Every market type Gemini offers is supported. Team-vs-team games are drawn as a court with the two teams as the pills. Yes/no and multiple-choice markets list their answers on the board; you choose an answer and pick Yes or No.

### Arc

Arc is Circle's blockchain, where USDC is the native currency. Tabletop Market uses it as the cash register: every pick's stake is locked in a contract with a public receipt, and every cash-out releases it.

**Why this matters: trust on a new site.** A brand-new app has no reputation, so people have little reason to trust it with their money. Arc changes the question from "do you trust us?" to "check for yourself":

- **Receipts no one can edit.** Every pick and every cash-out leaves a public record on Arc (what was picked, at what odds, for how much). Nobody can change or delete it afterwards, including us. If the app ever recorded something wrong, that mistake would stay public, so cheating would leave evidence.
- **Money only the user can take back.** Locked USDC is not just recorded; the contract's code decides where it can go. There is no owner and no admin key, so we cannot touch a user's stake. Only the wallet that locked it can cash it out.
- **Anyone can check.** Most users will never open the explorer themselves, the same way most diners never read a restaurant's inspection report. The trust comes from knowing that anyone can.

Limits, stated plainly: this runs on Arc's testnet with test USDC; the contract holds and returns the stake but does not pay winnings yet; and the odds written into a receipt come from Gemini through our app, so the receipt proves what was recorded, not that our app recorded it correctly.

- **Contract:** [`contracts/TabletopEscrow.sol`](contracts/TabletopEscrow.sol), deployed at `0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d` on Arc testnet (chain ID 5042002).
- **`placePick(key, oddsBps, receipt)`** locks the USDC sent with it under that pick, records the odds, and emits a readable receipt such as `Orlando vs Boston | Boston | 77% | $5.00`. In live mode the receipt also names the Gemini order number, so an onchain lock can be matched to a real trade.
- **`cashOut(key, shareBps, receipt)`** sends a share of the caller's locked USDC back to the caller. Partial cash-outs release the same share as the user lifted off the table.
- The contract has **no owner and no admin function.** Nobody, including us, can move a user's locked USDC except back to that user.
- USDC on Arc is native, so the stake is sent as the transaction's value and fees are paid in USDC too. The user never sees any of it: no wallet, no pop-up, no gas token.
- To stretch the testnet faucet (10 USDC per hour), each app dollar locks 0.01 test USDC.

The **Advanced: practice network** link on the welcome screen shows the wallet, its balance, the contract, and recent receipts with explorer links.

#### Move to Gemini: Arc to Base with Circle's CCTP

Gemini accepts USDC deposits on Base (not on Arc). So the money path from a user's Arc balance to Gemini runs through Circle's Cross-Chain Transfer Protocol:

1. **Fee quote:** `GET https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/26/6?forward=true` (Arc is CCTP domain 26, Base is 6).
2. **Approve:** the user's wallet approves Circle's TokenMessengerV2 to take the USDC (USDC's token interface on Arc).
3. **Burn on Arc:** `depositForBurnWithHook(amount, 6, recipient, USDC, 0, maxFee, 1000, hook)`. The hook data `cctp-forward` asks Circle's **Forwarding Service** to complete the transfer on Base, so the user needs nothing on Base: no second wallet, no gas token.
4. **Circle confirms and mints on Base:** the app polls `GET /v2/messages/26?transactionHash=…` until it returns the `forwardTxHash` of the mint on Base Sepolia.
5. **Deposit into Gemini:** the next step in the real product. Gemini takes USDC on Base, but only real USDC.

The practice network panel shows the four steps with a receipt link for the burn on Arc and the mint on Base. They also appear in **Activity > History** in the headset.

### Live trading (owner only)

Placing a real Gemini order needs a secret API key, which must never be in a public web page. So `server/worker.js` is a small Cloudflare Worker that holds the key and places orders for the app.

- Live mode is off by default. It is switched on from the welcome screen with a passcode only the owner knows, so nobody visiting the public link can spend the owner's money.
- Orders are limit orders with **immediate-or-cancel**, so nothing is left waiting on the book.
- The server refuses any buy over **$1**, whatever the app asks for.
- The key is created with the **Trading** role only (no withdrawals).
- Simulated odds are disabled in live mode.

**Status:** working. On Nov 17, 2026 a real $1 buy order was placed on Gemini from the app, using the owner's own funds.

### Grok, the voice assistant (xAI and ElevenLabs)

A small character floats beside the market: a dark flame with two blinking eyes. He lags behind when you move the table, sleeps when nobody needs him, and wakes up when you pat him or wave at him.

| Step | Service | Server route |
|---|---|---|
| Hear | **ElevenLabs speech-to-text** (`scribe_v2`, English, with the names on the table as key terms so team names are spelled right) | `POST /stt` |
| Think | **Grok** through the xAI chat API. The app sends the question, the last few messages, and what is on the table (market, odds, your picks). Grok answers in one to three spoken sentences plus an optional action. | `POST /ask` |
| Speak | **ElevenLabs text-to-speech** (`eleven_flash_v2_5`), streamed so he starts talking before the whole answer has downloaded | `GET /tts` |
| Sound effects | **ElevenLabs sound generation**: button clicks, a whoosh, chimes, coin clinks, ball bounces. Generated once, then cached for a year. | `GET /sfx` |

What he can do: open a category, a market (by name, searched on Gemini if needed) or the Activity tab; go back; search; simulate the odds; bring the market back in front of you ("come here"); place a pick or cash out.

Safety rules built in:
- **Nothing that moves money happens without a spoken "yes".** He reads it back first ("Put $50 on Auburn at 99%? Say yes to confirm"). The request expires after 30 seconds. Live-mode caps still apply.
- **He never chooses a side or an amount for you.** His instructions forbid recommending a pick.
- **He only answers when you say "Grok"** (or right after he has spoken to you), so people talking nearby are ignored. Asleep, he sends nothing anywhere.

### The mixed reality part

- **A-Frame 1.6 and WebXR** in the Quest browser, with passthrough so the market sits in your real room.
- **A lobby that floats, a table that appears:** the market list floats on its own. Opening a market slides it back, grows the table in, turns the pressed card into the board, and (for basketball only) draws the court and raises the hoops. Going back reverses it.
- **Odds roll like a combination lock:** each digit is its own wheel; only the digits that change turn, up for a rise and down for a fall, with a green or red flash.
- **A live price graph** with time stamps and a pulsing dot at the latest price; games show each team in its own color.
- **A lobby like a real market site:** category bar (All, Live, then Gemini's categories), search, sort, a featured live game with its graph, and a grid of cards that scrolls row by row (drag the rail with a finger).
- **A table for every kind of market:** sports get a painted floor in the teams' colors (hardwood, pitch, ice, turf or diamond) with a ball you can flick and nets that catch it; crypto gets a vault that spills coins when you shake the table; oil gets pumpjacks that gush; metals get a block mountain you can break into ingots.
- **Hand tracking:** press with a fingertip, pinch to grab, pinch the front bar to move the whole thing. Controllers work too.
- **It goes where you go:** **Follow** makes the market trail you on a soft spring (stiffer while you walk); if you walk far away, or say "Grok, come here", it glides back in front of you. The corner grip resizes everything from 0.6x to 1.8x.
- **Physics:** the market follows your hand on a spring and leans slightly when moved. The cash pile is a cone of up to 1,000 banknotes, each its own object: it drops in, bounces, sloshes when the base moves, and scoots away from a poking finger.
- **Hands:** a soft, see-through outline over your real hands, drawn with a real hand model posed from the 25 tracked joints. (It is a generic hand shape, not a scan of yours.)
- **The cash pile is the value of your pick** (shares times current odds). The size of the heap tracks it: notes drop on when the odds move your way and pop off when they move against you.
- **Cash-out by hand height:** the higher your hand above the table, the smaller the share you take (1% to 100%). The money you lift is still your pick until you let go off the court, so it keeps growing and shrinking with the odds in your hand.

---

## Trust and risks

- **Test money.** The app balance and the Arc stakes are not real money. The testnet wallet's key is stored in the browser, so it must only ever hold test USDC.
- **One wallet per device.** Each browser makes its own testnet wallet.
- **After a reload:** in live mode, positions are read back from Gemini. In test mode, picks and the test balance are saved in the browser. Locks on Arc stay in the contract and can only go back to the same wallet.
- **The bridge runs on testnets.** Arc testnet to Base Sepolia is real CCTP, but with test USDC; the deposit into Gemini is not performed.
- **The contract holds stakes; it does not pay winnings.** In the current version, profit and loss come from the market itself. A payout pool and a result reporter are the next step.
- **Odds are a midpoint.** A real order buys at the ask and sells at the bid, which can be slightly worse than the number shown.
- **Live trading uses the owner's own funds and Gemini account** and is capped at $1 per order.
- **Your voice leaves the headset.** While Grok is awake, each sentence is sent through our server to ElevenLabs (to turn it into text), and questions go to xAI. Nothing is sent while he sleeps. Our server keeps no recordings; it limits how often each visitor can call it.
- **Scores come from an unofficial ESPN feed**, which can be late, missing or change without notice. They are shown for convenience and never used for money.

### Uses we do not intend

This is a demo of a new interface for a regulated market, not a gambling product. It is not meant for anyone under 18, for anyone outside the places Gemini Predictions is offered, or for wagering on outcomes a participant can influence.

---

## Run it yourself

**The app**
```bash
python -m http.server 8123
```
Then open http://localhost:8123. Settings (table height, distance, scale, spring feel, hand style, Arc network, contract address) are in the `SETTINGS` block at the top of `index.html`.

**The contract**
On the welcome screen, open **Advanced: practice network**, fund the wallet at [faucet.circle.com](https://faucet.circle.com) (choose Arc Testnet), and press **Deploy contract**. The page compiles `contracts/TabletopEscrow.sol` in the browser (solc 0.8.26) and deploys it. Put the new address in `SETTINGS.arc.escrow`.

**The live-trading server**
1. Create a Cloudflare Worker and paste in `server/worker.js`.
2. In the Worker's **Variables and Secrets**, add `GEMINI_API_KEY`, `GEMINI_API_SECRET` and `LIVE_PASSCODE` as secrets. Optional: `MAX_ORDER_USD` (default 1), `GEMINI_SANDBOX=1` for Gemini's practice site, `GEMINI_NONCE_SECONDS=1` if the key uses a time-based nonce.
3. Put the Worker's address in `SETTINGS.serverUrl`.
4. For Grok and the sounds, also add `XAI_API_KEY` and `ELEVENLABS_API_KEY` as secrets (optional: `XAI_MODEL`, `ELEVENLABS_VOICE`). Set spending limits on both accounts.

---

## Tech stack

A-Frame 1.6, WebXR (hand tracking, passthrough), three.js, plain JavaScript, ethers.js 6, Solidity 0.8, Arc testnet, Circle CCTP, Gemini Prediction Markets API, xAI Grok API, ElevenLabs (speech-to-text, text-to-speech, sound effects), ESPN public scoreboard, Cloudflare Workers, GitHub Pages.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `contracts/TabletopEscrow.sol` | The escrow contract on Arc |
| `server/worker.js` | The private server: live Gemini orders, balance, positions and order history; Grok's hearing, thinking and voice; cached sound effects; passing Gemini's pictures through. Holds every key; none are in this repo. |

## What's next

- Let any user trade on their own Gemini account (Gemini supports OAuth with an `orders:create` scope), instead of the owner's.
- Pay winnings from the contract when a market settles, using Gemini's official result.
- Run the Arc to Base to Gemini path with real USDC on mainnet, so the money path is onchain end to end.
- A card or bank on-ramp, so a user's dollars arrive as USDC in their invisible wallet on Arc. A MoonPay checkout (test mode) is already built into the app and server; it is switched off until MoonPay enables our account.
- Restore picks after a reload from the contract's onchain record.
