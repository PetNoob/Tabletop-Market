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
     XAI_API_KEY         Grok (xAI) key, for the voice assistant's answers
     ELEVENLABS_API_KEY  ElevenLabs key, for the assistant's voice and for listening

   Optional plain settings:
     XAI_MODEL            Grok model (default grok-4.20-0309-non-reasoning)
     ELEVENLABS_VOICE     ElevenLabs voice id (default JBFqnCBsd6RMkjVDRZzb)
     MAX_ORDER_USD        biggest order in dollars (default 1)
     GEMINI_SANDBOX       "1" = use Gemini's practice site instead of the real one
     GEMINI_NONCE_SECONDS "1" = the key was created with "time-based nonce" turned on

   Gemini endpoints used here (all need the secret):
     POST /v1/prediction-markets/order         place a buy or sell
     POST /v1/prediction-markets/positions     what the account holds
     POST /v1/balances                         how many dollars the account has
     POST /v1/prediction-markets/orders/history  past orders, for the Activity tab
     GET  /v1/prediction-markets/terms/status  has the account accepted the terms
   ====================================================================== */

const ALLOWED_ORIGINS = ["https://petnoob.github.io", "http://localhost:8123"];

// the app's sound effects: name -> [what ElevenLabs should make, length in seconds (0.5 to 22)]
// change SFX_VERSION to make them all again (for example after editing a description)
const SFX_VERSION = "v1";
const SFX_LIST = {
  coin:     ["a single gold coin clinking onto a wooden table, short and crisp", 0.5],
  coins:    ["a handful of metal coins spilling and jingling onto a table", 1.2],
  bounce:   ["a basketball bouncing once on a hardwood court, indoor gym", 0.5],
  kick:     ["a soccer ball being kicked, short soft thump", 0.5],
  puck:     ["a hockey stick hitting a puck that slides on ice, short", 0.6],
  net:      ["a ball hitting the back of a goal net, soft swish", 0.7],
  smash:    ["a solid metal block breaking apart, chunky clank with small debris", 0.6],
  ingot:    ["a heavy metal ingot dropping on stone, dull thud clank", 0.5],
  goo:      ["thick black oil gushing up and splatting, gooey squelch", 0.9],
  chaching: ["a cash register cha-ching with a bell, short and bright", 0.9],
  pick:     ["a soft satisfying confirmation chime for an app, two notes rising", 0.5],
  click:    ["a soft subtle button click for a user interface", 0.5],
  door:     ["a heavy steel vault door thudding to a stop, deep metallic clunk", 0.8],
  whoosh:   ["a quick soft whoosh, short transition sound", 0.5]
};

export default {
  async fetch(request, env, ctx) {
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
      // Gemini's market pictures (bitcoin, oil barrel, team shoes and helmets). Gemini's image server does not let
      // web pages draw them in 3D, so they are passed through here with that permission added. Only Gemini images.
      if (path === "/img") {
        const u = new URL(request.url).searchParams.get("u") || "";
        if (!/^https:\/\/assets\.gemini\.com\/[A-Za-z0-9._\/-]+$/.test(u)) return reply({ error: "Only Gemini images" }, 400);
        const r = await fetch(u, { cf: { cacheTtl: 86400, cacheEverything: true } });
        if (!r.ok) return reply({ error: "image " + r.status }, 502);
        const h = new Headers(cors);
        h.set("Content-Type", r.headers.get("Content-Type") || "image/png");
        h.set("Cache-Control", "public, max-age=86400");
        return new Response(r.body, { status: 200, headers: h });
      }

      // ---------- MoonPay test-mode card deposits (the keys live only here, in Cloudflare) ----------
      // /moonpay-url?amount=25&wallet=0x...  -> a signed link to MoonPay's checkout (sandbox), and an id for this purchase
      // /moonpay-check?ext=<id>             -> what MoonPay says happened to that purchase (status and amount)
      if (path === "/moonpay-url" || path === "/moonpay-check") {
        if (!env.MOONPAY_PUBLISHABLE_KEY || !env.MOONPAY_SECRET_KEY) return reply({ error: "MoonPay keys are not set up" }, 503);
        const ip = request.headers.get("CF-Connecting-IP") || "?";
        if (!rateOk("mp:" + ip, 120)) return reply({ error: "Too many requests, try again in a bit" }, 429);
        const q = new URL(request.url).searchParams;
        if (path === "/moonpay-url") {
          const amount = Math.round(Math.min(500, Math.max(20, parseFloat(q.get("amount")) || 25)) * 100) / 100;
          const wallet = q.get("wallet") || "";
          const ext = "tm-" + crypto.randomUUID();
          const p = new URLSearchParams();
          p.set("apiKey", env.MOONPAY_PUBLISHABLE_KEY);
          p.set("currencyCode", env.MOONPAY_CURRENCY || "eth");
          p.set("baseCurrencyCode", "usd");
          p.set("baseCurrencyAmount", String(amount));
          p.set("lockAmount", "true");
          p.set("externalTransactionId", ext);
          p.set("theme", "dark");
          p.set("colorCode", "#ff8c32");
          p.set("redirectURL", (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]) + "/Tabletop-Market/?mp=1");
          // a wallet address must be signed with MoonPay's signing secret (dashboard: Developers > API keys > Request signing).
          // Without MOONPAY_SIGNING_KEY the link has no wallet and no signature, and MoonPay asks for a wallet itself.
          const signKey = env.MOONPAY_SIGNING_KEY || "";
          if (signKey && /^0x[0-9a-fA-F]{40}$/.test(wallet)) p.set("walletAddress", wallet);
          const query = "?" + p.toString();
          const host = env.MOONPAY_HOST || "https://buy-sandbox.moonpay.com";
          if (!signKey || !p.has("walletAddress")) return reply({ url: host + "/" + query, ext, amount, sandbox: /sandbox/.test(host), signed: false });
          // MoonPay checks this signature: HMAC-SHA256 of the exact query string with the signing secret, in base64
          const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(query)));
          let bin = ""; sig.forEach((b) => { bin += String.fromCharCode(b); });
          return reply({ url: host + "/" + query + "&signature=" + encodeURIComponent(btoa(bin)), ext, amount, sandbox: /sandbox/.test(host), signed: true });
        }
        const ext = q.get("ext") || "";
        if (!/^tm-[0-9a-f-]{36}$/.test(ext)) return reply({ error: "Bad purchase id" }, 400);
        const r = await fetch("https://api.moonpay.com/v1/transactions/ext/" + ext, { headers: { "Authorization": "Api-Key " + env.MOONPAY_SECRET_KEY } });
        const j = await r.json().catch(() => null);
        if (!r.ok) return reply({ error: "MoonPay: " + ((j && (j.message || j.type)) || r.status) }, 502);
        const tx = Array.isArray(j) ? j[j.length - 1] : j;
        if (!tx) return reply({ status: "not_found" });
        return reply({ status: tx.status || "unknown", amount: tx.baseCurrencyAmount, currency: tx.currency && tx.currency.code, id: tx.id });
      }

      // ---------- sound effects, made by ElevenLabs' sound generator ----------
      // Each sound is generated ONCE from a short description, then kept in Cloudflare's cache for a year,
      // so playing it again costs nothing. Only the names below can be asked for.
      if (path === "/sfx") {
        const name = new URL(request.url).searchParams.get("n") || "", def = SFX_LIST[name];
        if (!def) return reply({ error: "Unknown sound" }, 404);
        const cache = caches.default, key = new Request("https://tabletop-sfx.cache/" + name + "-" + SFX_VERSION);
        const hit = await cache.match(key);
        const send = (buf) => { const h = new Headers(cors); h.set("Content-Type", "audio/mpeg"); h.set("Cache-Control", "public, max-age=604800"); return new Response(buf, { status: 200, headers: h }); };
        if (hit) return send(await hit.arrayBuffer());
        if (!env.ELEVENLABS_API_KEY) return reply({ error: "ElevenLabs key is not set up" }, 503);
        const ip = request.headers.get("CF-Connecting-IP") || "?";
        if (!rateOk("sfx:" + ip, 60)) return reply({ error: "Too many requests, try again in a bit" }, 429);
        const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY, "Accept": "audio/mpeg" },
          body: JSON.stringify({ text: def[0], duration_seconds: def[1], prompt_influence: 0.6 })
        });
        if (!r.ok) return reply({ error: "ElevenLabs: " + (await r.text()).slice(0, 160) }, 502);
        const buf = await r.arrayBuffer();
        const store = new Response(buf.slice(0), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000" } });
        if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, store)); else await cache.put(key, store);
        return send(buf);
      }

      // ---------- the voice assistant (public, but rate limited so nobody can run up the bill) ----------
      if (path === "/stt" || path === "/ask" || path === "/tts") {
        if (request.method !== "POST" && !(path === "/tts" && request.method === "GET")) return reply({ error: "Use POST" }, 405);
        const ip = request.headers.get("CF-Connecting-IP") || "?";
        if (!rateOk(ip, 400)) return reply({ error: "Too many requests, try again in a bit" }, 429);

        // listening: audio from the headset microphone -> text (ElevenLabs Scribe)
        if (path === "/stt") {
          if (!env.ELEVENLABS_API_KEY) return reply({ error: "ElevenLabs key is not set up" }, 503);
          const buf = await request.arrayBuffer();
          if (buf.byteLength < 200) return reply({ error: "No audio" }, 400);
          if (buf.byteLength > 4000000) return reply({ error: "Audio is too long" }, 413);
          const type = request.headers.get("Content-Type") || "audio/webm";
          const fd = new FormData();
          fd.append("file", new Blob([buf], { type }), type.includes("mp4") ? "speech.mp4" : "speech.webm");
          fd.append("model_id", "scribe_v2");
          fd.append("language_code", "en");
          fd.append("no_verbatim", "true");
          fd.append("tag_audio_events", "false");
          const terms = String(new URL(request.url).searchParams.get("k") || "").split("|")
            .map((s) => s.replace(/[<>{}\[\]\\]/g, "").trim().slice(0, 50)).filter((s) => s && s.split(/\s+/).length <= 5).slice(0, 90);
          const send = (withTerms) => {
            const f = new FormData();
            for (const [k, v] of fd.entries()) f.append(k, v);
            if (withTerms) terms.forEach((s) => f.append("keyterms", s));
            return fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, body: f });
          };
          let r = await send(terms.length > 0);
          if (!r.ok && terms.length && (r.status === 400 || r.status === 422)) r = await send(false);   // if the word list is refused, try without it
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return reply({ error: "ElevenLabs: " + ((j.detail && (j.detail.message || j.detail)) || r.status) }, 502);
          return reply({ text: String(j.text || "").trim() });
        }

        const body = request.method === "GET" ? { text: new URL(request.url).searchParams.get("text") || "" } : await request.json().catch(() => ({}));

        // thinking: the question plus what is on the table -> a short spoken answer (Grok)
        if (path === "/ask") {
          if (!env.XAI_API_KEY) return reply({ error: "Grok key is not set up" }, 503);
          const question = String(body.question || "").slice(0, 400), context = String(body.context || "").slice(0, 5000);
          if (!question) return reply({ error: "No question" }, 400);
          const history = (Array.isArray(body.history) ? body.history : []).slice(-12)
            .filter((h) => h && (h.role === "user" || h.role === "assistant") && h.content)
            .map((h) => ({ role: h.role, content: String(h.content).slice(0, 500) }));
          const r = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.XAI_API_KEY },
            body: JSON.stringify({
              model: env.XAI_MODEL || "grok-4.20-0309-non-reasoning",
              max_tokens: 260, temperature: 0.4,
              messages: [{ role: "system", content: ASSISTANT_RULES }].concat(history, [
                         { role: "user", content: "What is on the table right now:\n" + context + "\n\nThe user said: " + question }])
            })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return reply({ error: "Grok: " + ((j.error && (j.error.message || j.error)) || r.status) }, 502);
          const text = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "");
          let out = { say: text.replace(/[{}"]/g, "").slice(0, 400), action: null };
          const m = text.match(/\{[\s\S]*\}/);
          if (m) { try { const p = JSON.parse(m[0]); out = { say: String(p.say || "").slice(0, 500), action: p.action || null }; } catch (e) {} }
          return reply(out);
        }

        // speaking: text -> natural voice (ElevenLabs), sent back as an mp3
        if (path === "/tts") {
          if (!env.ELEVENLABS_API_KEY) return reply({ error: "ElevenLabs key is not set up" }, 503);
          const text = String(body.text || "").slice(0, 600);
          if (!text) return reply({ error: "No text" }, 400);
          // Gigi (playful), Elli (young), Sarah (soft), Rachel (calm): the first one this account can use is spoken
          const voices = [env.ELEVENLABS_VOICE, "jBpfuIE2acCO8z3wKNLl", "MF3mGyEYCl7XYWbV9V6O", "EXAVITQu4vr4xnSDxMaL", "21m00Tcm4TlvDq8ikWAM"].filter(Boolean);
          let lastErr = "";
          for (const voice of voices) {
            const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voice) + "/stream?output_format=mp3_44100_128", {
              method: "POST",
              headers: { "Content-Type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
              body: JSON.stringify({ text, model_id: "eleven_flash_v2_5",
                                     voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true } })
            });
            if (r.ok) {
              const h = new Headers(cors); h.set("Content-Type", "audio/mpeg"); h.set("Cache-Control", "no-store");
              return new Response(r.body, { status: 200, headers: h });
            }
            lastErr = (await r.text()).slice(0, 160);
            if (r.status === 401 || r.status === 429) break;                    // a key or quota problem: other voices will not help
          }
          return reply({ error: "ElevenLabs: " + lastErr }, 502);
        }
      }

      if (path === "/" || path === "/status") {
        return reply({ ok: true, tradingConfigured: configured, unlocked, maxOrderUsd: maxUsd, sandbox: env.GEMINI_SANDBOX === "1",
                       voice: !!env.ELEVENLABS_API_KEY, grok: !!env.XAI_API_KEY, sfx: !!env.ELEVENLABS_API_KEY,
                       moonpay: !!(env.MOONPAY_PUBLISHABLE_KEY && env.MOONPAY_SECRET_KEY) });
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

      if (path === "/history") return reply(await gemini(env, "POST", "/v1/prediction-markets/orders/history", { limit: 40 }));

      // the account's real US dollar balance, so the table shows what Gemini shows
      if (path === "/balance") {
        const list = await gemini(env, "POST", "/v1/balances", {});
        const usd = (Array.isArray(list) ? list : []).find((b) => String(b.currency).toUpperCase() === "USD");
        return reply({ usd: usd ? parseFloat(usd.available) : 0, total: usd ? parseFloat(usd.amount) : 0 });
      }

      return reply({ error: "Unknown path" }, 404);
    } catch (err) {
      return reply({ error: String(err && err.message ? err.message : err) }, 502);
    }
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// at most `limit` assistant requests an hour from one address (kept in memory, so it is a soft limit)
const HITS = new Map();
function rateOk(ip, limit) {
  const now = Date.now(), list = (HITS.get(ip) || []).filter((t) => now - t < 3600000);
  if (list.length >= limit) { HITS.set(ip, list); return false; }
  list.push(now); HITS.set(ip, list);
  if (HITS.size > 5000) HITS.clear();
  return true;
}

// what the assistant may and may not do. Gemini is a regulated market, so it explains and never pushes a bet.
const ASSISTANT_RULES = `You are Grok, a small, cheerful floating flame-spirit with big eyes who lives on the user's table in Tabletop Market, a mixed reality app on a Meta Quest that shows live prediction markets from Gemini.
Your personality is warm, playful and a little cute, never sarcastic, and you keep things light.
Answer out loud: one to three short sentences, at most 60 words, plain spoken English, no lists, no markdown, no emoji.
Use the table information you are given, the conversation so far, and general knowledge. If you do not know, say so briefly.
The user's words come from speech recognition and may be slightly misheard (team or coin names especially): pick the most sensible meaning given the table, and ask a short question back only if you really cannot tell.
Prices are probabilities: 0.62 means a 62 percent chance.
Never recommend a bet, never tell the user what to pick or how much to stake, never promise or confidently predict an outcome, and never encourage betting more. You may explain what the odds mean, how they moved, what the market is about, and how to use the app.
You can act in the app, but only when the user clearly asks. The list of actions you may use is given with the table information; use exactly those shapes.
Placing a pick or cashing out needs the user to name it themselves (which side, how much, or what share). Never choose a side or an amount for them. The app will read your action back to them and ask them to say yes, so keep "say" short when you use one of those actions.
Reply with ONLY a JSON object: {"say": "<what to speak>", "action": null} where action is null or one of the listed actions.`;

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
