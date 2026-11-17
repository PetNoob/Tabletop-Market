# Tabletop Market

**A prediction market you can put on your table.**

Tabletop Market is a mixed reality web app for Meta Quest 3. A live prediction market from Gemini appears as an object on your real table: a small court with the market's odds, a price graph, and a pile of cash that shows what your pick is worth right now. You pick a side by touching it. You cash out by pinching the money and lifting it off the table. Every pick's stake is locked in a contract on Arc.

- **Live app:** https://petnoob.github.io/Tabletop-Market/
- **Escrow contract (Arc testnet):** [`0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d`](https://explorer.testnet.arc.io/address/0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d)
- **Track:** Consumer Applications
- **Bounty:** Gemini Prediction Markets

Built during the UBC 2026 Hackathon (Nov 12 to 20, 2026).

---

## Try it

**On a Meta Quest 3**
1. Open the link above in the Quest browser.
2. Press **Enter mixed reality**. The market appears on the table in front of you.
3. Pinch the small bar at the front edge to move it onto your real table.
4. Touch a category tab, then a market card.
5. Touch one of the two colored pills at the front to pick a side. Set an amount and press **Confirm**.
6. To cash out, bring your fingers to the cash pile. The height of your hand chooses how much (1% to 100%). Pinch, lift it off the court, and let go.

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
| Odds on the table | **Real.** Midpoint of Gemini's best bid and ask, refreshed every 5 seconds. |
| Price graph | **Real.** Gemini's 15-minute price history for the last 24 hours, plus live points. |
| "No" price on yes/no markets | **Approximation.** Shown as 1 minus the Yes price, not Gemini's own No price. |
| Balance in the app | **Test money.** $100 per session, kept in the page. |
| Stake locked on Arc | **Real transactions on Arc's testnet** (free test USDC, not real money). |
| "Earning 4.1% while idle" | **Preview only.** Not a real yield. |
| Simulate odds | **Simulated.** Labeled on screen whenever it is on. |
| Real orders on Gemini (live mode) | **Built, not yet working end to end.** See below. |

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
          └─────────────────┘  └───────────────┘  └──────────┬───────────┘
                                                             ▼
                                                  Gemini order API (private)
```

The whole app is one HTML file. There is no build step and no login.

### Gemini Prediction Markets API

Public endpoints, called directly from the page (Gemini allows it):

| Endpoint | Used for |
|---|---|
| `GET /v1/prediction-markets/categories` | The category tabs in the lobby |
| `GET /v1/prediction-markets/events?status=active&category=…&limit=12&offset=…` | The market cards, 12 at a time per tab |
| `GET /v1/pubticker/{instrumentSymbol}` | Live bid and ask for each answer, every 5 seconds on the table |
| `GET /v2/candles/{instrumentSymbol}/15m` | The 24-hour price graph |

Private endpoints, called only by the server with the owner's key:

| Endpoint | Used for |
|---|---|
| `POST /v1/prediction-markets/order` | Buy when you confirm a pick, sell when you cash out (limit, fill-now-or-cancel) |
| `GET /v1/prediction-markets/terms/status` | Checked when live mode is unlocked |
| `POST /v1/prediction-markets/positions` | Read the account's positions |

Every market type Gemini offers is supported. Team-vs-team games are drawn as a court with the two teams as the pills. Yes/no and multiple-choice markets list their answers on the board; you choose an answer and pick Yes or No.

### Arc

Arc is Circle's blockchain, where USDC is the native currency. Tabletop Market uses it as the cash register: every pick's stake is locked in a contract with a public receipt, and every cash-out releases it.

- **Contract:** [`contracts/TabletopEscrow.sol`](contracts/TabletopEscrow.sol), deployed at `0xB042A8BF2c3a65093967c9Ef053bFD11d145Ee0d` on Arc testnet (chain ID 5042002).
- **`placePick(key, oddsBps, receipt)`** locks the USDC sent with it under that pick, records the odds, and emits a readable receipt such as `Orlando vs Boston | Boston | 77% | $5.00`. In live mode the receipt also names the Gemini order number, so an onchain lock can be matched to a real trade.
- **`cashOut(key, shareBps, receipt)`** sends a share of the caller's locked USDC back to the caller. Partial cash-outs release the same share as the user lifted off the table.
- The contract has **no owner and no admin function.** Nobody, including us, can move a user's locked USDC except back to that user.
- USDC on Arc is native, so the stake is sent as the transaction's value and fees are paid in USDC too. The user never sees any of it: no wallet, no pop-up, no gas token.
- To stretch the testnet faucet (10 USDC per hour), each app dollar locks 0.01 test USDC.

The **Blockchain setup** link on the welcome screen shows the wallet, its balance, the contract, and recent receipts with explorer links.

### Live trading (owner only)

Placing a real Gemini order needs a secret API key, which must never be in a public web page. So `server/worker.js` is a small Cloudflare Worker that holds the key and places orders for the app.

- Live mode is off by default. It is switched on from the welcome screen with a passcode only the owner knows, so nobody visiting the public link can spend the owner's money.
- Orders are limit orders with **immediate-or-cancel**, so nothing is left waiting on the book.
- The server refuses any buy over **$1**, whatever the app asks for.
- The key is created with the **Trading** role only (no withdrawals).
- Simulated odds are disabled in live mode.

**Status:** the server and the app side are written. We have not yet been able to create the Gemini API key (the account's passkey check fails when creating keys), so no real order has been placed from the app.

### The mixed reality part

- **A-Frame 1.6 and WebXR** in the Quest browser, with passthrough so the market sits in your real room.
- **Hand tracking:** press with a fingertip, pinch to grab, pinch the front bar to move the whole thing. Controllers work too.
- **Physics:** the market follows your hand on a spring and leans slightly when moved. Each banknote in the cash pile is its own object: it drops in, bounces, sloshes when the base moves, and scoots away from a poking finger.
- **The cash pile is the value of your pick** (shares times current odds). The size of the heap tracks it: notes drop on when the odds move your way and pop off when they move against you.
- **Cash-out by hand height:** the higher your hand above the table, the smaller the share you take (1% to 100%). The money you lift is still your pick until you let go off the court, so it keeps growing and shrinking with the odds in your hand.

---

## Trust and risks

- **Test money.** The app balance and the Arc stakes are not real money. The testnet wallet's key is stored in the browser, so it must only ever hold test USDC.
- **One wallet per device.** Each browser makes its own testnet wallet.
- **Reloading forgets picks.** The app's picks are kept in the page. The USDC stays locked in the contract and can only go back to the same wallet.
- **The contract holds stakes; it does not pay winnings.** In the current version, profit and loss come from the market itself. A payout pool and a result reporter are the next step.
- **Odds are a midpoint.** A real order buys at the ask and sells at the bid, which can be slightly worse than the number shown.
- **Live trading uses the owner's own funds and Gemini account** and is capped at $1 per order.

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
On the welcome screen, open **Blockchain setup**, fund the wallet at [faucet.circle.com](https://faucet.circle.com) (choose Arc Testnet), and press **Deploy contract**. The page compiles `contracts/TabletopEscrow.sol` in the browser (solc 0.8.26) and deploys it. Put the new address in `SETTINGS.arc.escrow`.

**The live-trading server**
1. Create a Cloudflare Worker and paste in `server/worker.js`.
2. In the Worker's **Variables and Secrets**, add `GEMINI_API_KEY`, `GEMINI_API_SECRET` and `LIVE_PASSCODE` as secrets. Optional: `MAX_ORDER_USD` (default 1), `GEMINI_SANDBOX=1` for Gemini's practice site, `GEMINI_NONCE_SECONDS=1` if the key uses a time-based nonce.
3. Put the Worker's address in `SETTINGS.serverUrl`.

---

## Tech stack

A-Frame 1.6, WebXR (hand tracking, passthrough), three.js, plain JavaScript, ethers.js 6, Solidity 0.8, Arc testnet, Gemini Prediction Markets API, Cloudflare Workers, GitHub Pages.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `contracts/TabletopEscrow.sol` | The escrow contract on Arc |
| `server/worker.js` | The private server for live Gemini orders |

## What's next

- Finish real Gemini trading, then let any user trade on their own Gemini account (Gemini supports OAuth with an `orders:create` scope), instead of the owner's.
- Pay winnings from the contract when a market settles, using Gemini's official result.
- Bring USDC onto Arc with Circle's CCTP or Gateway, and move it to Gemini, so the money path is onchain end to end.
- Restore picks after a reload from the contract's onchain record.
