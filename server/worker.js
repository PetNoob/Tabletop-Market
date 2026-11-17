/* ======================================================================
   Tabletop Market - private server (runs as a Cloudflare Worker)

   Why this exists: placing a real order on Gemini needs a secret key.
   A secret can never be inside index.html, because anyone can read a web page.
   This small program holds the secret and places orders for the app.

   There are NO secrets in this file. They are typed into Cloudflare's
   "Variables and Secrets" screen by the owner and are never in the repo:

     GEMINI_API_KEY      the Gemini API key (must have the Trader role)
     GEMINI_API_SECRET   the Gemini API secret
     LIVE_PASSCODE       a long passcode. Only someone who knows it can trade.

   Optional plain settings:
     MAX_ORDER_USD        biggest order in dollars (default 1)
     GEMINI_SANDBOX       "1" = use Gemini's practice site instead of the real one
     GEMINI_NONCE_SECONDS "1" = the key was created with "time-based nonce" turned on

   Gemini endpoints used here (all need the secret):
     POST /v1/prediction-markets/order         place a buy or sell
     POST /v1/prediction-markets/positions     what the account holds
     GET  /v1/prediction-markets/terms/status  has the account accepted the terms
   ====================================================================== */

const ALLOWED_ORIGINS = ["https://petnoob.github.io", "http://localhost:8123"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-TM-Pass",
      "Vary": "Origin"
    };
    const reply = (obj, status) => new Response(JSON.stringify(obj), {
      status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, cors)
    });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const maxUsd = Math.max(0.01, parseFloat(env.MAX_ORDER_USD) || 1);
    const configured = !!(env.GEMINI_API_KEY && env.GEMINI_API_SECRET && env.LIVE_PASSCODE);
    const unlocked = configured && samePass(request.headers.get("X-TM-Pass") || "", env.LIVE_PASSCODE);

    try {
      // anyone may ask whether the server is set up. It never reveals a secret.
      if (path === "/" || path === "/status") {
        return reply({ ok: true, tradingConfigured: configured, unlocked, maxOrderUsd: maxUsd, sandbox: env.GEMINI_SANDBOX === "1" });
      }

      // everything below spends or reveals the owner's account, so it needs the passcode
      if (!configured) return reply({ error: "Trading is not set up on the server" }, 503);
      if (!unlocked) { await sleep(800); return reply({ error: "Wrong passcode" }, 401); }
      if (request.method !== "POST") return reply({ error: "Use POST" }, 405);
      const body = await request.json().catch(() => ({}));

      if (path === "/unlock") {
        const terms = await gemini(env, "GET", "/v1/prediction-markets/terms/status", {}).catch((e) => ({ error: e.message }));
        return reply({ ok: true, unlocked: true, maxOrderUsd: maxUsd, sandbox: env.GEMINI_SANDBOX === "1", terms });
      }

      if (path === "/order") {
        const symbol = String(body.symbol || ""), side = String(body.side || ""), outcome = String(body.outcome || "");
        const price = Math.round(parseFloat(body.price) * 100) / 100, quantity = Math.floor(parseFloat(body.quantity) * 100) / 100;
        if (!/^GEMI-[A-Za-z0-9._-]{3,80}$/.test(symbol)) return reply({ error: "Bad symbol" }, 400);
        if (side !== "buy" && side !== "sell") return reply({ error: "Side must be buy or sell" }, 400);
        if (outcome !== "yes" && outcome !== "no") return reply({ error: "Outcome must be yes or no" }, 400);
        if (!(price >= 0.01 && price <= 0.99)) return reply({ error: "Price must be 0.01 to 0.99" }, 400);
        if (!(quantity >= 0.01)) return reply({ error: "Quantity is too small" }, 400);
        // the safety cap: a buy can never cost more than MAX_ORDER_USD, whatever the app asks for
        if (side === "buy" && price * quantity > maxUsd + 1e-9) return reply({ error: "Order is over the $" + maxUsd + " limit" }, 400);
        if (side === "sell" && quantity > 500) return reply({ error: "Sell is too large" }, 400);
        const order = await gemini(env, "POST", "/v1/prediction-markets/order", {
          symbol, orderType: "limit", side, outcome,
          quantity: quantity.toFixed(2), price: price.toFixed(2),
          timeInForce: "immediate-or-cancel"        // fill right now at this price or better, otherwise cancel. Nothing is left waiting.
        });
        return reply(order);
      }

      if (path === "/positions") return reply(await gemini(env, "POST", "/v1/prediction-markets/positions", {}));

      return reply({ error: "Unknown path" }, 404);
    } catch (err) {
      return reply({ error: String(err && err.message ? err.message : err) }, 502);
    }
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// compare two passcodes without stopping early at the first wrong letter
function samePass(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// one signed request to Gemini's private API
async function gemini(env, method, path, fields) {
  const base = env.GEMINI_SANDBOX === "1" ? "https://api.sandbox.gemini.com" : "https://api.gemini.com";
  const nonce = env.GEMINI_NONCE_SECONDS === "1" ? Math.floor(Date.now() / 1000) : Date.now();
  const payload = btoa(JSON.stringify(Object.assign({ request: path, nonce }, fields)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.GEMINI_API_SECRET),
                                            { name: "HMAC", hash: "SHA-384" }, false, ["sign"]);
  const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const signature = Array.from(sigBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-cache",
               "X-GEMINI-APIKEY": env.GEMINI_API_KEY, "X-GEMINI-PAYLOAD": payload, "X-GEMINI-SIGNATURE": signature }
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error((data && (data.message || data.reason || data.error)) || ("Gemini said " + res.status));
  return data;
}
