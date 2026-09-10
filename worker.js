// Serveur relais complet pour l'estimateur — à coller dans Cloudflare Workers.
//
// Deux rôles :
// 1. /prices  → interroge SerpAPI (clé cachée) pour de vrais prix en ligne.
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

async function handlePrices(url, env) {
  const query = url.searchParams.get("q");
  if (!query) return jsonResponse({ error: "Paramètre 'q' manquant" }, 400);
  if (!env.SERPAPI_KEY) {
    return jsonResponse({ error: "SERPAPI_KEY non configurée côté serveur." }, 500);
  }

  const serpUrl =
    "https://serpapi.com/search.json?engine=google_shopping&q=" +
    encodeURIComponent(query) +
    "&gl=fr&hl=fr&api_key=" +
    env.SERPAPI_KEY;

  try {
    const res = await fetch(serpUrl);
    const data = await res.json();
    const results = (data.shopping_results || []).map((r) => ({
      title: r.title,
      price: r.price,
      extracted_price: r.extracted_price,
      source: r.source,
    }));
    return jsonResponse({ results });
  } catch (err) {
    return jsonResponse({ error: "Erreur en contactant SerpAPI: " + err.message }, 502);
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

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
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
