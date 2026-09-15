// Serveur relais complet pour l'estimateur — à coller dans Cloudflare Workers.
//
// Deux rôles :
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
//
// Aucune des deux clés n'est écrite ici en dur : elles sont lues depuis des
// variables d'environnement configurées dans le dashboard Cloudflare
// (Settings > Variables and Secrets) :
//   - SERPAPI_KEY
//   - ANTHROPIC_API_KEY
//
// Le cache utilise un KV Namespace lié au Worker sous le nom PRICE_CACHE
// (Settings > Variables and Secrets > KV Namespace Bindings).

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours
const SERPAPI_TIMEOUT_MS = 15000; // 15 secondes max avant d'abandonner

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
    return jsonResponse({ error: "Route inconnue. Utilise /prices ou /claude." }, 404);
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

