// Serveur relais complet pour l'estimateur — à coller dans Cloudflare Workers.
//
// Rôles :
// 1. /prices  → interroge SerpAPI (clé cachée) pour de vrais prix en ligne,
//    via le moteur "google_shopping_light" (version allégée, plus rapide
//    que le moteur complet — utile pour les produits très demandés qui
//    faisaient parfois traîner le scraping jusqu'à 90s).
//    Les résultats sont mis en cache (Cloudflare KV) pendant 7 jours par
//    terme de recherche, pour éviter de repayer une recherche SerpAPI
//    quand plusieurs utilisateurs cherchent le même produit.
//    La recherche SerpAPI est abandonnée après 15 secondes si elle traîne
//    quand même — l'appli bascule alors sur l'estimation par IA plutôt que
//    de faire attendre l'utilisateur.
// 2. /claude  → interroge l'API Anthropic (clé cachée) pour identifier
//    l'objet et écrire les conseils. Nécessaire car l'astuce gratuite
//    utilisée pendant les tests dans Claude ne fonctionne que là-bas, pas
//    sur un vrai site web.
// 3. /create-checkout-session → crée une session Stripe Checkout pour
//    souscrire à un des 3 abonnements (débutant/pro/premium).
// 4. /create-portal-session → crée une session du portail client Stripe,
//    pour que l'utilisateur gère/annule son abonnement lui-même.
// 5. /stripe-webhook → reçoit les événements Stripe (paiement réussi,
//    renouvellement, annulation...) et met à jour Supabase en conséquence
//    (plan, quota, compteurs). Utilise la clé service_role de Supabase
//    (jamais exposée au client) pour écrire malgré les policies RLS.
//
// Aucune clé n'est écrite ici en dur : elles sont lues depuis des variables
// d'environnement configurées dans le dashboard Cloudflare (Settings >
// Variables and Secrets) :
//   - SERPAPI_KEY
//   - ANTHROPIC_API_KEY
//   - STRIPE_SECRET_KEY
//   - STRIPE_WEBHOOK_SECRET
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Le cache utilise un KV Namespace lié au Worker sous le nom PRICE_CACHE
// (Settings > Variables and Secrets > KV Namespace Bindings).

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours
const SERPAPI_TIMEOUT_MS = 15000; // 15 secondes max avant d'abandonner

const SUPABASE_URL = "https://heykndklprjuvooqztmi.supabase.co";

// IDs des 3 prix Stripe (pas des secrets — visibles côté client de toute
// façon lors du checkout). Créés en mode test le 16/09/2026 ; à remplacer
// par les IDs équivalents en mode LIVE avant le vrai lancement.
const STRIPE_PRICES = {
  debutant: "price_1UG4ycDF5RDuMLO5ydtW0spD",
  pro: "price_1UG4ycDF5RDuMLO5oqpd3gF3",
  premium: "price_1UG4ydDF5RDuMLO59JONd0Bq",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/prices") {
      return handlePrices(url, env);
    }
    if (url.pathname === "/claude") {
      return handleClaude(request, env);
    }
    if (url.pathname === "/create-checkout-session") {
      return handleCreateCheckoutSession(request, env);
    }
    if (url.pathname === "/create-portal-session") {
      return handleCreatePortalSession(request, env);
    }
    if (url.pathname === "/stripe-webhook") {
      return handleStripeWebhook(request, env);
    }
    return jsonResponse({ error: "Route inconnue." }, 404);
  },
};

function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

// fetch() avec une limite de temps: si SerpAPI ne répond pas assez vite
// (produit très demandé, scraping lent côté Google), on abandonne plutôt
// que de faire attendre l'utilisateur 90 secondes.
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handlePrices(url, env) {
  const query = url.searchParams.get("q");
  if (!query) return jsonResponse({ error: "Paramètre 'q' manquant" }, 400);
  if (!env.SERPAPI_KEY) {
    return jsonResponse({ error: "SERPAPI_KEY non configurée côté serveur." }, 500);
  }

  const cacheKey = "prices:" + normalizeQuery(query);

  // On tente d'abord le cache (si le KV Namespace est bien lié).
  if (env.PRICE_CACHE) {
    try {
      const cached = await env.PRICE_CACHE.get(cacheKey, { type: "json" });
      if (cached) {
        return jsonResponse({ results: cached, cached: true });
      }
    } catch (e) {
      // en cas de souci de lecture du cache, on continue simplement vers SerpAPI
    }
  }

  const serpUrl =
    "https://serpapi.com/search.json?engine=google_shopping_light&q=" +
    encodeURIComponent(query) +
    "&gl=fr&hl=fr&api_key=" +
    env.SERPAPI_KEY;

  try {
    const res = await fetchWithTimeout(serpUrl, SERPAPI_TIMEOUT_MS);
    const data = await res.json();

    // SerpAPI peut répondre avec un statut 200 mais un champ "error" (clé
    // invalide, quota, requête refusée...). On distingue bien ce cas d'une
    // recherche qui a simplement trouvé 0 résultat.
    if (data.error) {
      return jsonResponse({ error: "SerpAPI: " + data.error }, 502);
    }

    const results = (data.shopping_results || []).map((r) => ({
      title: r.title,
      price: r.price,
      extracted_price: r.extracted_price,
      source: r.source,
    }));

    // On enregistre dans le cache pour les prochaines recherches identiques,
    // seulement si on a trouvé quelque chose d'exploitable.
    if (env.PRICE_CACHE && results.length > 0) {
      try {
        await env.PRICE_CACHE.put(cacheKey, JSON.stringify(results), {
          expirationTtl: CACHE_TTL_SECONDS,
        });
      } catch (e) {
        // échec d'écriture du cache: pas grave, la recherche a quand même
        // été faite et renvoyée normalement ci-dessous
      }
    }

    return jsonResponse({ results, cached: false });
  } catch (err) {
    // err.name === "AbortError" quand c'est notre propre timeout qui a
    // coupé la requête (SerpAPI trop lente à répondre).
    const timedOut = err.name === "AbortError";
    return jsonResponse(
      {
        error: timedOut
          ? "SerpAPI a mis trop de temps à répondre (recherche abandonnée après " +
            SERPAPI_TIMEOUT_MS / 1000 +
            "s)."
          : "Erreur en contactant SerpAPI: " + err.message,
      },
      timedOut ? 504 : 502
    );
  }
}

async function handleClaude(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY non configurée côté serveur." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Corps de requête JSON invalide." }, 400);
  }

  // Le modèle demandé par le client (Sonnet pour la vision, Haiku pour les
  // appels légers) est maintenant respecté au lieu d'être ignoré.
  const model = body.model || "claude-sonnet-4-6";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: body.messages,
      }),
    });
    const data = await res.json();
    return jsonResponse(data, res.status);
  } catch (err) {
    return jsonResponse({ error: "Erreur en contactant l'API Anthropic: " + err.message }, 502);
  }
}

// ============================================================================
// Abonnements Stripe
// ============================================================================

async function stripeRequest(env, method, path, params) {
  const headers = { Authorization: "Bearer " + env.STRIPE_SECRET_KEY };
  let body;
  if (params) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params).toString();
  }
  const res = await fetch("https://api.stripe.com/v1/" + path, { method, headers, body });
  const data = await res.json();
  return { status: res.status, data };
}

async function supabaseServiceRequest(env, method, path, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // pas grave, on renvoie null
  }
  return { status: res.status, data };
}

// Retrouve la clé de plan ("debutant"/"pro"/"premium") à partir d'un id de
// prix Stripe, en se basant sur STRIPE_PRICES (évite un aller-retour API).
function planKeyFromPriceId(priceId) {
  for (const [key, id] of Object.entries(STRIPE_PRICES)) {
    if (id === priceId) return key;
  }
  return null;
}

// Avec le "Flexible billing mode" de Stripe (actif sur ce compte), les
// champs current_period_start/end n'existent plus sur l'objet Subscription
// lui-même : ils sont désormais portés par chaque ligne d'abonnement
// (subscription_item), dans items.data[0]. On garde quand même un repli sur
// l'ancien emplacement au cas où un abonnement plus ancien les ait encore.
function subPeriod(sub) {
  const item = sub.items && sub.items.data && sub.items.data[0];
  const start = (item && item.current_period_start) || sub.current_period_start;
  const end = (item && item.current_period_end) || sub.current_period_end;
  return { start, end };
}

async function handleCreateCheckoutSession(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: "STRIPE_SECRET_KEY non configurée côté serveur." }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Corps de requête JSON invalide." }, 400);
  }

  const { plan, user_id, email, return_url } = body;
  const priceId = STRIPE_PRICES[plan];
  if (!priceId || !user_id || !email) {
    return jsonResponse({ error: "Paramètres manquants (plan, user_id, email requis)." }, 400);
  }

  // Récupère un stripe_customer_id existant pour cet utilisateur, sinon en
  // crée un nouveau et le stocke dans profiles.
  let customerId = null;
  const existing = await supabaseServiceRequest(
    env,
    "GET",
    `profiles?id=eq.${user_id}&select=stripe_customer_id`
  );
  if (existing.data && existing.data[0] && existing.data[0].stripe_customer_id) {
    customerId = existing.data[0].stripe_customer_id;
  } else {
    const customer = await stripeRequest(env, "POST", "customers", {
      email,
      "metadata[supabase_user_id]": user_id,
    });
    if (customer.status !== 200) {
      return jsonResponse({ error: "Erreur création client Stripe: " + JSON.stringify(customer.data) }, 502);
    }
    customerId = customer.data.id;
    await supabaseServiceRequest(env, "PATCH", `profiles?id=eq.${user_id}`, {
      stripe_customer_id: customerId,
    });
  }

  const base = return_url || "https://estimation-app-beta.vercel.app";
  const session = await stripeRequest(env, "POST", "checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: base + "?abonnement=succes",
    cancel_url: base + "?abonnement=annule",
    "subscription_data[metadata][supabase_user_id]": user_id,
    "subscription_data[metadata][plan_key]": plan,
    "managed_payments[enabled]": "false",
  });
  if (session.status !== 200) {
    return jsonResponse({ error: "Erreur création session Stripe: " + JSON.stringify(session.data) }, 502);
  }
  return jsonResponse({ url: session.data.url });
}

async function handleCreatePortalSession(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: "STRIPE_SECRET_KEY non configurée côté serveur." }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Corps de requête JSON invalide." }, 400);
  }
  const { user_id, return_url } = body;
  if (!user_id) return jsonResponse({ error: "user_id manquant." }, 400);

  const existing = await supabaseServiceRequest(
    env,
    "GET",
    `profiles?id=eq.${user_id}&select=stripe_customer_id`
  );
  const customerId = existing.data && existing.data[0] && existing.data[0].stripe_customer_id;
  if (!customerId) {
    return jsonResponse({ error: "Aucun abonnement Stripe trouvé pour cet utilisateur." }, 404);
  }

  const base = return_url || "https://estimation-app-beta.vercel.app";
  const portal = await stripeRequest(env, "POST", "billing_portal/sessions", {
    customer: customerId,
    return_url: base,
  });
  if (portal.status !== 200) {
    return jsonResponse({ error: "Erreur création session portail: " + JSON.stringify(portal.data) }, 502);
  }
  return jsonResponse({ url: portal.data.url });
}

// Vérifie la signature Stripe (HMAC-SHA256) pour s'assurer que la requête
// vient bien de Stripe et pas d'un tiers malveillant qui devinerait l'URL
// du webhook.
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = timestamp + "." + rawBody;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSig === expectedSig;
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: "STRIPE_WEBHOOK_SECRET non configurée côté serveur." }, 500);
  }
  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature");
  const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return jsonResponse({ error: "Signature invalide." }, 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return jsonResponse({ error: "JSON invalide." }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const subId = session.subscription;
        if (!subId) break;

        const sub = await stripeRequest(env, "GET", `subscriptions/${subId}`);
        if (sub.status !== 200) break;
        // Le user_id est stocké dans les metadata de l'abonnement (subscription_data.metadata
        // à la création), pas dans les metadata de la session elle-même, qui sont vides ici.
        const userId =
          (session.metadata && session.metadata.supabase_user_id) ||
          (sub.data.metadata && sub.data.metadata.supabase_user_id);
        if (!userId) break;
        const priceId = sub.data.items.data[0].price.id;
        const planKey = planKeyFromPriceId(priceId);
        const quota = parseInt(sub.data.items.data[0].price.metadata.quota_mensuel || "0", 10);
        const { start, end } = subPeriod(sub.data);

        await supabaseServiceRequest(env, "PATCH", `profiles?id=eq.${userId}`, {
          stripe_customer_id: session.customer,
          stripe_subscription_id: subId,
          plan: planKey || "gratuit",
          subscription_status: "active",
          quota_mensuel: quota,
          periode_debut: new Date(start * 1000).toISOString(),
          periode_fin: new Date(end * 1000).toISOString(),
          estimations_utilisees: 0,
          estimations_depuis_derniere_pub: 0,
          bonus_pub_disponible: false,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items.data[0].price.id;
        const planKey = planKeyFromPriceId(priceId);
        const quota = parseInt(sub.items.data[0].price.metadata.quota_mensuel || "0", 10);
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";

        await supabaseServiceRequest(env, "PATCH", `profiles?stripe_subscription_id=eq.${sub.id}`, {
          plan: status === "canceled" ? "gratuit" : planKey || "gratuit",
          subscription_status: status,
          quota_mensuel: status === "canceled" ? 0 : quota,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabaseServiceRequest(env, "PATCH", `profiles?stripe_subscription_id=eq.${sub.id}`, {
          plan: "gratuit",
          subscription_status: "canceled",
          quota_mensuel: 0,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        // Seul un renouvellement (ou la toute première facture) doit remettre
        // le compteur à zéro — pas une facture à cheval sur autre chose.
        if (
          invoice.billing_reason !== "subscription_cycle" &&
          invoice.billing_reason !== "subscription_create"
        ) {
          break;
        }
        const subId = invoice.subscription;
        if (!subId) break;
        const sub = await stripeRequest(env, "GET", `subscriptions/${subId}`);
        if (sub.status !== 200) break;
        const { start, end } = subPeriod(sub.data);

        await supabaseServiceRequest(env, "PATCH", `profiles?stripe_subscription_id=eq.${subId}`, {
          subscription_status: "active",
          periode_debut: new Date(start * 1000).toISOString(),
          periode_fin: new Date(end * 1000).toISOString(),
          estimations_utilisees: 0,
          estimations_depuis_derniere_pub: 0,
          bonus_pub_disponible: false,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;
        await supabaseServiceRequest(env, "PATCH", `profiles?stripe_subscription_id=eq.${subId}`, {
          subscription_status: "past_due",
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // On répond quand même 200 pour éviter que Stripe ne re-tente en boucle
    // sur une erreur qu'un retry ne résoudra pas, mais on log l'erreur.
    console.error("Erreur traitement webhook Stripe:", err);
  }

  return jsonResponse({ received: true });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

