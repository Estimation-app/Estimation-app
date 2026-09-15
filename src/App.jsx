import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, Upload, Loader2, Tag, RotateCcw, History, Trash2, X, Mail, LogOut, Eye, EyeOff, Mic, MicOff } from "lucide-react";

// Ton serveur relais (Cloudflare Worker) — cache les clés API et évite le
// blocage CORS d'un appel direct depuis le navigateur.
const PROXY_URL = "https://dark-lake-8ef1.dyloo999.workers.dev";

// Identifiants Supabase (comptes + base de données). Contrairement aux clés
// SerpAPI/Anthropic, la clé "anon" est PUBLIQUE par conception — elle est
// protégée par les règles de sécurité (RLS) côté base de données, pas en
// la cachant. Remplace ces deux valeurs par les tiennes (Settings > API
// dans ton projet Supabase).
const SUPABASE_URL = "https://heykndklprjuvooqztmi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HFixMx_zGtcvHw6wqAUKBA_66uuJkBZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [image, setImage] = useState(null); // { dataUrl, mediaType, base64 }
  const [details, setDetails] = useState(""); // précisions manuelles optionnelles
  const [status, setStatus] = useState("idle"); // idle | analyzing | pricing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null); // conservé pour compat, non utilisé directement

  // Message vocal pour dicter les précisions (Web Speech API, native au
  // navigateur — pas d'appel serveur, gratuit). Support variable selon les
  // navigateurs (bon sur Chrome/Android, plus limité sur Safari/iOS).
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const detailsBeforeListeningRef = useRef("");

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = detailsBeforeListeningRef.current;
      setDetails((base ? base + " " : "") + transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  function toggleVoiceInput() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      detailsBeforeListeningRef.current = details.trim();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // start() peut lever une erreur si déjà démarré; on ignore
      }
    }
  }

  // Compte utilisateur (optionnel) — permet un historique illimité,
  // synchronisé entre appareils. Sans compte, l'historique reste local
  // (limité, propre à cet appareil) comme avant.
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState("idle"); // idle | sending | sent | signup_sent
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function sendMagicLink() {
    if (!authEmail.trim()) return;
    setAuthStatus("sending");
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setAuthStatus("idle");
    } else {
      setAuthStatus("sent");
    }
  }

  async function signUpWithPassword() {
    if (!authEmail.trim() || !authPassword) return;
    setAuthStatus("sending");
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setAuthStatus("idle");
    } else {
      setAuthStatus("signup_sent");
    }
  }

  async function signInWithPassword() {
    if (!authEmail.trim() || !authPassword) return;
    setAuthStatus("sending");
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) {
      setAuthError(error.message);
      setAuthStatus("idle");
    }
    // en cas de succès, onAuthStateChange met "user" à jour automatiquement
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("idle"); // idle | saving | done
  const [passwordError, setPasswordError] = useState(null);

  // Modes véhicule / immobilier: certaines infos (kilométrage, année,
  // ville, surface) ne sont jamais visibles sur une photo. On les demande
  // via un petit formulaire avant l'estimation, plutôt que de deviner.
  const [pendingIdentification, setPendingIdentification] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ annee: "", kilometrage: "", etat: "bon état" });
  const [realEstateForm, setRealEstateForm] = useState({ ville: "", surface: "", pieces: "" });

  async function setAccountPassword() {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("6 caractères minimum.");
      return;
    }
    setPasswordStatus("saving");
    setPasswordError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordStatus("idle");
    } else {
      setPasswordStatus("done");
      setNewPassword("");
    }
  }

  const HISTORY_KEY = "estimateur_historique";
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // Une fois connecté, on charge l'historique complet depuis Supabase
  // (illimité, synchronisé) à la place de l'historique local.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("estimations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) {
        setHistory(
          data.map((d) => ({
            id: d.id,
            date: d.created_at,
            image: d.image,
            objet: d.objet,
            categorie: d.categorie,
            prix_bas: d.prix_bas,
            prix_haut: d.prix_haut,
            confiance: d.confiance,
          }))
        );
      }
    })();
  }, [user]);

  async function addToHistory(entry) {
    if (user) {
      try {
        await supabase.from("estimations").insert({
          user_id: user.id,
          objet: entry.objet,
          categorie: entry.categorie,
          prix_bas: entry.prix_bas,
          prix_haut: entry.prix_haut,
          confiance: entry.confiance,
          image: entry.image,
        });
        // On recharge simplement en préfixant localement (évite un aller-retour)
        setHistory((prev) => [entry, ...prev].slice(0, 200));
      } catch (e) {
        // silencieux: l'entrée reste au moins visible localement ci-dessous
        setHistory((prev) => [entry, ...prev].slice(0, 200));
      }
      return;
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 15);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch (e) {
        // stockage plein: on garde en mémoire pour cette session sans persister
      }
      return next;
    });
  }

  async function removeFromHistory(id) {
    if (user && typeof id === "string") {
      try {
        await supabase.from("estimations").delete().eq("id", id);
      } catch (e) {}
    }
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (!user) {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  }

  async function clearHistory() {
    if (user) {
      try {
        await supabase.from("estimations").delete().eq("user_id", user.id);
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch (e) {}
    }
    setHistory([]);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setResult(null);
    setStatus("idle");

    const isHeic =
      /\.hei[cf]$/i.test(file.name || "") || /heic|heif/i.test(file.type || "");
    if (isHeic) {
      setError(
        "Ce fichier est au format HEIC (photos iPhone), pas encore géré par ce prototype de test. " +
          "Solution rapide : Réglages → Appareil photo → Formats → \"Le plus compatible\" sur ton iPhone, " +
          "puis reprends la photo. La vraie app pourra lire le HEIC nativement."
      );
      return;
    }

    try {
      if (window.createImageBitmap) {
        const bitmap = await createImageBitmap(file, {
          resizeWidth: 900,
          resizeQuality: "medium",
        });
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        const base64 = dataUrl.split(",")[1];
        setImage({
          dataUrl,
          mediaType: "image/jpeg",
          base64,
          debug: "redimensionnée, " + Math.round((base64.length * 3) / 4 / 1024) + " Ko",
        });
        return;
      }
    } catch (err) {
      // on tente le repli simple ci-dessous
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setError("Impossible de lire le fichier sélectionné.");
    };
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const match = dataUrl.match(/^data:([^;]+);base64,/);
      let mediaType = match ? match[1] : "";
      if (!allowed.includes(mediaType)) mediaType = "image/jpeg";
      setImage({
        dataUrl,
        mediaType,
        base64,
        debug:
          "NON redimensionnée (repli), " + Math.round((base64.length * 3) / 4 / 1024) + " Ko",
      });
    };
    reader.readAsDataURL(file);
  }

  async function readBody(res) {
    if (res.body && res.body.getReader) {
      try {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) result += decoder.decode(value, { stream: true });
        }
        result += decoder.decode();
        if (result) return result;
      } catch (e) {
        // on retente avec .text() ci-dessous
      }
    }
    try {
      return await res.text();
    } catch (e) {
      return "";
    }
  }

  async function callClaude(messages, model = "claude-sonnet-4-6") {
    let res;
    try {
      res = await fetch(PROXY_URL + "/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          messages,
        }),
      });
    } catch (e) {
      throw new Error("Impossible de contacter l'API (réseau). " + e.message);
    }

    const rawText = await readBody(res);

    let data = null;
    const braceStart = rawText.indexOf("{");
    if (braceStart !== -1) {
      try {
        data = JSON.parse(rawText.slice(braceStart));
      } catch (e) {
        data = null;
      }
    }

    if (data?.error) {
      throw new Error("Erreur API: " + data.error.message);
    }
    if (data?.stop_reason === "max_tokens") {
      throw new Error("Réponse coupée (max_tokens atteint).");
    }
    if (data?.content) {
      const text = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      if (text) return text;
    }

    const match = rawText.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (match) {
      try {
        return JSON.parse('"' + match[1] + '"');
      } catch (e) {
        // on tombe dans l'erreur générale ci-dessous
      }
    }

    throw new Error(
      "Réponse illisible/tronquée de l'API (statut " + res.status + "). Contenu brut: " +
        rawText.slice(0, 400)
    );
  }

  function extractJson(text) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Pas de JSON trouvé dans la réponse: " + text.slice(0, 300));
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      throw new Error("JSON invalide: " + text.slice(0, 300));
    }
  }

  // Interroge le serveur relais pour une requête donnée, renvoie les prix
  // trouvés (liste vide si rien de concluant — pas d'exception ici).
  async function fetchMarketPricesOnce(query) {
    const url = PROXY_URL + "/prices?q=" + encodeURIComponent(query);
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new Error("Impossible de contacter le serveur relais: " + e.message);
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Réponse du serveur relais illisible (statut " + res.status + ").");
    }
    if (data.error) {
      throw new Error("Erreur serveur relais: " + data.error);
    }
    const results = data.results || [];
    const prices = results
      .map((r) => r.extracted_price)
      .filter((p) => typeof p === "number" && p > 0)
      .sort((a, b) => a - b);
    return { results: results.slice(0, 12), prices };
  }

  // Deux tentatives: d'abord un terme générique (marché du neuf, plus de
  // résultats sur Google Shopping), puis en repli avec "occasion" ajouté
  // si la première ne renvoie rien.
  async function fetchMarketPrices(query) {
    const first = await fetchMarketPricesOnce(query);
    if (first.prices.length >= 1) return { ...first, queryUsed: query };

    const second = await fetchMarketPricesOnce(query + " occasion");
    return { ...second, queryUsed: query + " occasion" };
  }

  async function estimate() {
    if (!image) return;
    setError(null);
    try {
      setStatus("analyzing");
      const idText = await callClaude([
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            {
              type: "text",
              text:
                "Tu regardes une photo. D'abord détermine le type de sujet: (a) un objet du quotidien à estimer pour une revente d'occasion, (b) un être vivant (humain ou animal), (c) un véhicule (voiture, moto, scooter...), (d) un bien immobilier (maison ou appartement, vu de l'extérieur ou l'intérieur). " +
                "Réponds UNIQUEMENT en JSON, sans texte autour, avec ce format exact: " +
                '{"type_sujet": "objet" ou "etre_vivant" ou "vehicule" ou "immobilier", "objet": "nom précis de l\'objet (marque/modèle si visible) OU description brève et neutre de l\'être vivant OU description du véhicule OU description du bien immobilier", "recherche": "2 à 4 mots-clés génériques pour chercher ce produit sur un moteur de shopping (vide si pas type objet)", "categorie": "catégorie générale", "etat": "état apparent en une phrase courte", "etat_note": "neuf / très bon état / bon état / état moyen / abîmé", "marque": "marque du véhicule si type_sujet=vehicule, sinon vide", "modele": "modèle du véhicule si type_sujet=vehicule, sinon vide", "annee": nombre (année du véhicule si clairement identifiable, sinon null), "type_bien": "maison ou appartement si type_sujet=immobilier, sinon vide"}' +
                (details.trim()
                  ? ` L'utilisateur précise en plus: "${details.trim()}". Utilise ces précisions en priorité sur ce que tu vois sur la photo si elles se contredisent (ex: la contenance exacte, un défaut caché), et intègre-les dans "objet" et "recherche".`
                  : ""),
            },
          ],
        },
      ]);
      const identification = extractJson(idText);

      // Mode humoristique: un être vivant n'est pas à vendre. On saute la
      // recherche de vraies annonces et on demande à Claude une estimation
      // volontairement absurde, avec un style qui change à chaque fois pour
      // garder l'effet de surprise.
      if (identification.type_sujet === "etre_vivant") {
        setStatus("pricing");
        const humorStyles = [
          "commissaire-priseur très sérieux et pince-sans-rire qui garde un ton pro malgré l'absurdité",
          "présentateur télé survolté façon brocante TV, enthousiaste et exagéré",
          "rapport financier froid et chiffré, avec des termes d'analyste absurdement sérieux",
          "copain sympa et complice, ton léger, un peu taquin",
          "expert d'art hautain qui parle de l'objet comme d'une œuvre muséale",
        ];
        const chosenStyle = humorStyles[Math.floor(Math.random() * humorStyles.length)];

        const humorText = await callClaude(
          [
            {
              role: "user",
              content:
                `Sujet identifié sur une photo: ${identification.objet}. ` +
                `Adopte ce style pour ta réponse: ${chosenStyle}. ` +
                "Génère une estimation de prix volontairement fictive et humoristique (les êtres vivants ne sont pas à vendre, c'est un gag). " +
                "Inclus une courte blague ou remarque drôle et bienveillante liée à ce sujet précis (jamais méchante, jamais dégradante, rien sur l'apparence physique d'une personne). " +
                "Glisse aussi, sur un ton léger, le rappel que ce n'est bien sûr pas à vendre pour de vrai (les animaux sont des êtres sensibles protégés par la loi, pas des biens; et un humain encore moins). " +
                'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "la blague/remarque, 1 à 2 phrases", "rappel": "le rappel légal/éthique tourné avec humour, 1 phrase"}',
            },
          ],
          "claude-haiku-4-5-20251001"
        );
        const humor = extractJson(humorText);

        const finalResult = {
          ...identification,
          prix_bas: humor.prix_bas,
          prix_haut: humor.prix_haut,
          commentaire: humor.commentaire,
          rappel: humor.rappel,
          confiance: "humour",
          source: "estim' mode 'estimer tout, même n'importe quoi' 🎭",
        };
        setResult(finalResult);
        setStatus("done");
        addToHistory({
          id: Date.now(),
          date: new Date().toISOString(),
          image: image.dataUrl,
          objet: finalResult.objet,
          categorie: finalResult.categorie,
          prix_bas: finalResult.prix_bas,
          prix_haut: finalResult.prix_haut,
          confiance: finalResult.confiance,
        });
        return;
      }

      // Véhicule: le kilométrage et l'année exacte ne sont jamais visibles
      // sur une photo. On met l'estimation en pause et on demande ces infos
      // via un petit formulaire avant de continuer.
      if (identification.type_sujet === "vehicule") {
        setPendingIdentification(identification);
        setVehicleForm((prev) => ({
          ...prev,
          annee: identification.annee ? String(identification.annee) : prev.annee,
        }));
        setStatus("vehicule_form");
        return;
      }

      // Immobilier: la ville et la surface ne sont jamais devinables sur
      // une photo. Même principe: formulaire de précision avant estimation.
      if (identification.type_sujet === "immobilier") {
        setPendingIdentification(identification);
        setStatus("immobilier_form");
        return;
      }

      setStatus("pricing");
      let pricing;
      try {
        const searchTerm = identification.recherche || identification.objet;
        const { results, prices } = await fetchMarketPrices(searchTerm);

        if (prices.length >= 1) {
          // Filtrage de pertinence: on ne garde que les annonces qui
          // correspondent vraiment au même produit (même format/taille/
          // modèle), pour éviter de mélanger un parfum 30ml avec un 100ml
          // par exemple.
          const listingsForReview = results
            .map((r, i) => `${i}: "${r.title}" — ${r.price || r.extracted_price + " €"}`)
            .join("\n");

          const filterText = await callClaude([
            {
              role: "user",
              content:
                `Objet identifié avec précision: "${identification.objet}" (${identification.etat_note}). ` +
                `Voici des annonces trouvées en ligne pour une recherche proche:\n${listingsForReview}\n\n` +
                "Indique UNIQUEMENT les numéros des annonces qui correspondent vraiment au MÊME produit " +
                "(même modèle, même taille/format/volume si applicable — pas juste la même marque ou catégorie). " +
                "Exclus tout ce qui est un format, coloris ou modèle différent. " +
                'Réponds UNIQUEMENT en JSON: {"indices_pertinents": [0, 2]} (liste vide si rien ne correspond vraiment).',
            },
          ], "claude-haiku-4-5-20251001");
          const filterResult = extractJson(filterText);
          const relevantIndices = Array.isArray(filterResult.indices_pertinents)
            ? filterResult.indices_pertinents
            : [];

          const relevantResults = relevantIndices
            .map((i) => results[i])
            .filter((r) => r && typeof r.extracted_price === "number" && r.extracted_price > 0);
          const relevantPrices = relevantResults
            .map((r) => r.extracted_price)
            .sort((a, b) => a - b);

          if (relevantPrices.length === 0) {
            throw new Error(
              "Des annonces ont été trouvées mais aucune ne correspond précisément au même produit (même format/modèle)."
            );
          }

          const usedResults = relevantResults;
          const usedPrices = relevantPrices;
          const usedSource =
            "estimation basée sur " + usedPrices.length + " prix neuf(s) correspondant vraiment au produit";

          const prix_neuf_bas = usedPrices[0];
          const prix_neuf_haut = usedPrices[usedPrices.length - 1];

          const conseilText = await callClaude([
            {
              role: "user",
              content:
                `Objet: ${identification.objet}, état: ${identification.etat_note}. ` +
                `Prix neufs trouvés en ligne pour ce produit précis (référence marché, pas spécifiquement occasion): ${usedPrices.join(", ")} €` +
                ` (${usedPrices.length} annonce(s) au total). ` +
                "À partir de ce prix neuf de référence et de l'état de l'objet, estime une fourchette de revente d'OCCASION réaliste (Leboncoin/Vinted), " +
                "une estimation pour la revente en brocante/vide-grenier (souvent moins cher), et un conseil de vente pratique en une phrase. " +
                "Compare aussi ce prix neuf trouvé à ta connaissance générale du prix de vente officiel/habituel de ce produit: s'il te semble anormalement bas ou haut " +
                "(ex: promo exceptionnelle, erreur de prix, produit différent malgré le nom), signale-le brièvement dans \"alerte\" (sinon renvoie une chaîne vide). " +
                'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "prix_brocante": "...", "conseil": "...", "alerte": "..."}',
            },
          ], "claude-haiku-4-5-20251001");
          const extra = extractJson(conseilText);

          pricing = {
            prix_bas: extra.prix_bas,
            prix_haut: extra.prix_haut,
            prix_neuf_bas,
            prix_neuf_haut,
            prix_brocante: extra.prix_brocante,
            conseil: extra.conseil,
            alerte: extra.alerte || null,
            confiance:
              usedPrices.length >= 4 ? "haute" : usedPrices.length >= 2 ? "moyenne" : "basse",
            source: usedSource,
            listings: usedResults,
          };
        } else {
          throw new Error("Pas assez d'annonces trouvées pour cet objet.");
        }
      } catch (marketError) {
        const priceText = await callClaude([
          {
            role: "user",
            content:
              `Objet d'occasion identifié: ${identification.objet} (catégorie: ${identification.categorie}). ` +
              `État: ${identification.etat} (${identification.etat_note}). ` +
              "En te basant sur ta connaissance générale du marché de l'occasion en France, donne une estimation de prix réaliste. " +
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre, "prix_haut": nombre, "prix_brocante": "...", "conseil": "..."}',
          },
        ], "claude-haiku-4-5-20251001");
        const fallback = extractJson(priceText);
        pricing = {
          ...fallback,
          confiance: "basse",
          source: "estimation IA (annonces réelles indisponibles: " + marketError.message + ")",
          listings: [],
        };
      }

      const finalResult = { ...identification, ...pricing };
      setResult(finalResult);
      setStatus("done");
      addToHistory({
        id: Date.now(),
        date: new Date().toISOString(),
        image: image.dataUrl,
        objet: finalResult.objet,
        categorie: finalResult.categorie,
        prix_bas: finalResult.prix_bas,
        prix_haut: finalResult.prix_haut,
        confiance: finalResult.confiance,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "L'estimation a échoué. Réessaie avec une autre photo.");
      setStatus("error");
    }
  }

  function reset() {
    setImage(null);
    setDetails("");
    setResult(null);
    setError(null);
    setStatus("idle");
    setPendingIdentification(null);
    setVehicleForm({ annee: "", kilometrage: "", etat: "bon état" });
    setRealEstateForm({ ville: "", surface: "", pieces: "" });
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }

  async function estimateVehicule() {
    if (!pendingIdentification) return;
    setError(null);
    setStatus("pricing");
    try {
      const infoText =
        `Véhicule identifié sur une photo: ${pendingIdentification.objet}` +
        (pendingIdentification.marque
          ? ` (marque: ${pendingIdentification.marque}${pendingIdentification.modele ? ", modèle: " + pendingIdentification.modele : ""})`
          : "") +
        `. Année: ${vehicleForm.annee || "non précisée"}. ` +
        `Kilométrage: ${vehicleForm.kilometrage ? vehicleForm.kilometrage + " km" : "non précisé"}. ` +
        `État général déclaré par le propriétaire: ${vehicleForm.etat}. `;

      const text = await callClaude(
        [
          {
            role: "user",
            content:
              infoText +
              "En te basant sur ta connaissance générale du marché de l'occasion automobile en France, donne une estimation de prix réaliste pour ce véhicule avec ces caractéristiques. " +
              "Si l'année ou le kilométrage manquent, base-toi sur une hypothèse raisonnable pour un véhicule de ce type et signale-le clairement dans \"hypothese\" (sinon chaîne vide). " +
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "1 à 2 phrases sur la cote de ce véhicule", "hypothese": "..."}',
          },
        ],
        "claude-haiku-4-5-20251001"
      );
      const data = extractJson(text);
      const finalResult = {
        ...pendingIdentification,
        prix_bas: data.prix_bas,
        prix_haut: data.prix_haut,
        commentaire: data.commentaire,
        hypothese: data.hypothese || null,
        confiance: "indicative",
        source: "estimation IA véhicule — indicative, pas d'annonces réelles comparées",
      };
      setResult(finalResult);
      setStatus("done");
      addToHistory({
        id: Date.now(),
        date: new Date().toISOString(),
        image: image.dataUrl,
        objet: finalResult.objet,
        categorie: finalResult.categorie,
        prix_bas: finalResult.prix_bas,
        prix_haut: finalResult.prix_haut,
        confiance: finalResult.confiance,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "L'estimation du véhicule a échoué.");
      setStatus("error");
    }
  }

  async function estimateImmobilier() {
    if (!pendingIdentification) return;
    setError(null);
    setStatus("pricing");
    try {
      const infoText =
        `Bien immobilier identifié sur une photo: ${pendingIdentification.objet}` +
        (pendingIdentification.type_bien ? ` (${pendingIdentification.type_bien})` : "") +
        `. Ville ou secteur: ${realEstateForm.ville || "non précisé"}. ` +
        `Surface: ${realEstateForm.surface ? realEstateForm.surface + " m²" : "non précisée"}. ` +
        `Nombre de pièces: ${realEstateForm.pieces || "non précisé"}. `;

      const text = await callClaude(
        [
          {
            role: "user",
            content:
              infoText +
              "En te basant sur ta connaissance générale du marché immobilier français, donne une estimation de prix très approximative pour ce bien. " +
              "Précise bien qu'il s'agit d'un ordre de grandeur très large, sans visite ni données précises du marché local. " +
              "Si la ville ou la surface manquent, base-toi sur une hypothèse raisonnable et signale-le clairement dans \"hypothese\" (sinon chaîne vide). " +
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "1 à 2 phrases sur l\'estimation", "hypothese": "..."}',
          },
        ],
        "claude-haiku-4-5-20251001"
      );
      const data = extractJson(text);
      const finalResult = {
        ...pendingIdentification,
        prix_bas: data.prix_bas,
        prix_haut: data.prix_haut,
        commentaire: data.commentaire,
        hypothese: data.hypothese || null,
        confiance: "indicative",
        source: "estimation IA immobilier — très approximative, sans données de marché local",
      };
      setResult(finalResult);
      setStatus("done");
      addToHistory({
        id: Date.now(),
        date: new Date().toISOString(),
        image: image.dataUrl,
        objet: finalResult.objet,
        categorie: finalResult.categorie,
        prix_bas: finalResult.prix_bas,
        prix_haut: finalResult.prix_haut,
        confiance: finalResult.confiance,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "L'estimation du bien immobilier a échoué.");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#E4DCC8",
        fontFamily: "'Courier New', monospace",
        color: "#2B241C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px 60px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .brand { font-family: 'Fraunces', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        button { font-family: inherit; cursor: pointer; }
        .btn-primary {
          background: #B4432C;
          color: #F3EDDD;
          border: none;
          padding: 14px 22px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          transition: transform 0.15s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.55; }
        .btn-ghost {
          background: transparent;
          color: #6B6154;
          border: 1px solid #B7AC96;
          padding: 10px 16px;
          border-radius: 3px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-mic {
          background: transparent;
          color: #6B6154;
          border: 1px solid #B7AC96;
          border-radius: 3px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-mic.listening {
          background: #B4432C;
          color: #F3EDDD;
          border-color: #B4432C;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(180, 67, 44, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(180, 67, 44, 0); }
        }
        .drop-zone {
          border: 2px dashed #A99C82;
          border-radius: 4px;
          width: 100%;
          aspect-ratio: 4/3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #6B6154;
          background: #EFE9D9;
          text-align: center;
        }
        .tag-card {
          background: #F6F1E3;
          border: 1px solid #C9BD9F;
          border-radius: 2px;
          position: relative;
          padding: 26px 22px 22px;
          width: 100%;
        }
        .tag-card::before {
          content: "";
          position: absolute;
          top: -9px;
          left: 24px;
          width: 18px;
          height: 18px;
          background: #E4DCC8;
          border: 1px solid #C9BD9F;
          border-radius: 50%;
        }
        .password-field {
          position: relative;
          width: 100%;
        }
        .password-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 4px;
          display: flex;
          align-items: center;
          color: #8A7C63;
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <header style={{ marginBottom: 24, position: "relative" }}>
          <button
            className="btn-ghost"
            onClick={() => setShowHistory(true)}
            style={{ position: "absolute", top: 0, right: 0 }}
            aria-label="voir l'historique"
          >
            <History size={14} /> {history.length > 0 ? history.length : ""}
          </button>
          <div
            className="mono"
            style={{ fontSize: 12, letterSpacing: "0.08em", color: "#8A7C63", marginBottom: 6 }}
          >
            estim' — v0
          </div>
          <h1
            className="brand"
            style={{ fontSize: 32, fontWeight: 600, margin: 0, lineHeight: 1.1 }}
          >
            Ça vaut combien,
            <br />
            ce truc ?
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, color: "#6B6154", lineHeight: 1.5 }}>
            Prends l'objet en photo. Estimation du prix de revente en France,
            façon Leboncoin ou brocante.
          </p>
        </header>

        {!image && (
          <label className="drop-zone" htmlFor="photo-input">
            <Camera size={30} strokeWidth={1.5} />
            <div style={{ fontSize: 14 }}>Ajouter une photo</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>appareil photo ou galerie</div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <span className="btn-ghost" style={{ marginTop: 6, pointerEvents: "none" }}>
              <Upload size={14} /> choisir un fichier
            </span>
          </label>
        )}

        {error && !image && (
          <div
            className="mono"
            style={{
              fontSize: 12,
              color: "#B4432C",
              background: "#F6E4DE",
              border: "1px solid #E0B5A8",
              borderRadius: 3,
              padding: "10px 12px",
              wordBreak: "break-word",
              lineHeight: 1.5,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}

        {image && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <img
              src={image.dataUrl}
              alt="objet à estimer"
              style={{
                width: "100%",
                aspectRatio: "4/3",
                objectFit: "cover",
                borderRadius: 4,
                border: "1px solid #C9BD9F",
              }}
            />
            {image.debug && (
              <div className="mono" style={{ fontSize: 11, color: "#A99C82" }}>
                debug: {image.debug} · type: {image.mediaType}
              </div>
            )}

            {status === "idle" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label className="mono" style={{ fontSize: 12, color: "#6B6154" }}>
                    Précisions (optionnel) — contenance, état, modèle exact...
                  </label>
                  {isListening && (
                    <span className="mono" style={{ fontSize: 11, color: "#B4432C" }}>
                      ● écoute…
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="ex: flacon de 100ml, léger éclat sur le bord"
                    rows={2}
                    style={{
                      flex: 1,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      padding: "10px 12px",
                      borderRadius: 3,
                      border: "1px solid #B7AC96",
                      background: "#F6F1E3",
                      color: "#2B241C",
                      resize: "vertical",
                    }}
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      className={"btn-mic" + (isListening ? " listening" : "")}
                      onClick={toggleVoiceInput}
                      aria-label={isListening ? "arrêter la dictée vocale" : "dicter les précisions"}
                      title={isListening ? "Arrêter" : "Dicter à l'oral"}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
              </div>
            )}

            {status !== "done" && status !== "vehicule_form" && status !== "immobilier_form" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={estimate} disabled={status === "analyzing" || status === "pricing"}>
                  {status === "analyzing" && (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      Identification…
                    </>
                  )}
                  {status === "pricing" && (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Estimation du prix…
                    </>
                  )}
                  {(status === "idle" || status === "error") && (
                    <>
                      <Tag size={16} />
                      Estimer sa valeur
                    </>
                  )}
                </button>
                <button className="btn-ghost" onClick={reset} aria-label="changer de photo">
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {status === "vehicule_form" && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8A7C63", marginBottom: 10 }}>
                  🚗 quelques précisions sur le véhicule
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      Année
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.annee}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, annee: e.target.value }))}
                      placeholder="ex: 2018"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      Kilométrage
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.kilometrage}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, kilometrage: e.target.value }))}
                      placeholder="ex: 85000"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      État général
                    </label>
                    <select
                      value={vehicleForm.etat}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, etat: e.target.value }))}
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="excellent état">excellent état</option>
                      <option value="bon état">bon état</option>
                      <option value="état moyen">état moyen</option>
                      <option value="à réviser / défauts visibles">à réviser / défauts visibles</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn-primary" onClick={estimateVehicule}>
                    <Tag size={16} />
                    Estimer
                  </button>
                  <button className="btn-ghost" onClick={reset} aria-label="changer de photo">
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            )}

            {status === "immobilier_form" && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8A7C63", marginBottom: 10 }}>
                  🏠 quelques précisions sur le bien
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      Ville ou secteur
                    </label>
                    <input
                      type="text"
                      value={realEstateForm.ville}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, ville: e.target.value }))}
                      placeholder="ex: Rennes centre"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      Surface (m²)
                    </label>
                    <input
                      type="number"
                      value={realEstateForm.surface}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, surface: e.target.value }))}
                      placeholder="ex: 65"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: "#6B6154", display: "block", marginBottom: 4 }}>
                      Nombre de pièces (optionnel)
                    </label>
                    <input
                      type="number"
                      value={realEstateForm.pieces}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, pieces: e.target.value }))}
                      placeholder="ex: 3"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#F6F1E3",
                        color: "#2B241C",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn-primary" onClick={estimateImmobilier}>
                    <Tag size={16} />
                    Estimer
                  </button>
                  <button className="btn-ghost" onClick={reset} aria-label="changer de photo">
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  color: "#B4432C",
                  background: "#F6E4DE",
                  border: "1px solid #E0B5A8",
                  borderRadius: 3,
                  padding: "10px 12px",
                  wordBreak: "break-word",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {result && status === "done" && result.type_sujet === "etre_vivant" && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8A7C63", marginBottom: 4 }}>
                  🎭 mode "estimer tout, même n'importe quoi"
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                  {result.objet}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#B4432C",
                    marginBottom: 14,
                  }}
                >
                  {result.prix_bas}–{result.prix_haut} €
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #C9BD9F",
                    paddingTop: 12,
                    fontSize: 14,
                    color: "#2B241C",
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                >
                  {result.commentaire}
                </div>
                <div style={{ fontSize: 12, color: "#6B6154", fontStyle: "italic", lineHeight: 1.5 }}>
                  {result.rappel}
                </div>
              </div>
            )}

            {result && status === "done" && (result.type_sujet === "vehicule" || result.type_sujet === "immobilier") && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8A7C63", marginBottom: 4 }}>
                  {result.type_sujet === "vehicule" ? "🚗 estimation véhicule" : "🏠 estimation immobilière"} · indicative
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                  {result.objet}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#B4432C",
                    marginBottom: 14,
                  }}
                >
                  {result.prix_bas}–{result.prix_haut} €
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #C9BD9F",
                    paddingTop: 12,
                    fontSize: 14,
                    color: "#2B241C",
                    lineHeight: 1.6,
                    marginBottom: result.hypothese ? 10 : 14,
                  }}
                >
                  {result.commentaire}
                </div>
                {result.hypothese && (
                  <div style={{ fontSize: 12, color: "#8A7C63", fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 }}>
                    Hypothèse : {result.hypothese}
                  </div>
                )}
                <div className="mono" style={{ fontSize: 11, color: "#A99C82", lineHeight: 1.6 }}>
                  {result.source}
                </div>
              </div>
            )}

            {result && status === "done" && (!result.type_sujet || result.type_sujet === "objet") && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8A7C63", marginBottom: 4 }}>
                  {result.categorie}
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                  {result.objet}
                </div>
                <div style={{ fontSize: 13, color: "#6B6154", marginBottom: 16 }}>
                  {result.etat} · <em>{result.etat_note}</em>
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#B4432C",
                    marginBottom: 4,
                  }}
                >
                  {result.prix_bas}–{result.prix_haut} €
                </div>
                <div style={{ fontSize: 13, color: "#6B6154", marginBottom: 14 }}>
                  estimation d'occasion
                  {result.prix_neuf_bas != null &&
                    ` (basée sur un neuf à ${result.prix_neuf_bas}–${result.prix_neuf_haut} € en ligne)`}
                </div>

                {result.alerte && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "#B4432C",
                      background: "#F6E4DE",
                      border: "1px solid #E0B5A8",
                      borderRadius: 3,
                      padding: "10px 12px",
                      marginBottom: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠ {result.alerte}
                  </div>
                )}

                {result.listings && result.listings.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px dashed #C9BD9F",
                      paddingTop: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#8A7C63", marginBottom: 6 }}>
                      annonces retenues (même produit) :
                    </div>
                    {result.listings.map((l, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "#4A4335",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "3px 0",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.title}
                        </span>
                        <span className="mono" style={{ flexShrink: 0, color: "#B4432C" }}>
                          {l.price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    borderTop: "1px dashed #C9BD9F",
                    paddingTop: 12,
                    fontSize: 13,
                    color: "#4A4335",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>En brocante :</strong> {result.prix_brocante}
                </div>
                <div style={{ fontSize: 13, color: "#4A4335", marginTop: 8, lineHeight: 1.5 }}>
                  <strong>Conseil :</strong> {result.conseil}
                </div>

                <div
                  className="mono"
                  style={{ fontSize: 11, color: "#A99C82", marginTop: 16, lineHeight: 1.6 }}
                >
                  confiance: {result.confiance} · {result.source}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showHistory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 10,
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#E4DCC8",
              width: "100%",
              maxWidth: 420,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "8px 8px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 className="brand" style={{ fontSize: 20, margin: 0 }}>
                Historique
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {history.length > 0 && (
                  <button
                    className="mono"
                    onClick={clearHistory}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#8A7C63",
                      fontSize: 12,
                      textDecoration: "underline",
                    }}
                  >
                    tout effacer
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  style={{ background: "none", border: "none", padding: 4 }}
                  aria-label="fermer"
                >
                  <X size={20} color="#6B6154" />
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#F6F1E3",
                border: "1px solid #C9BD9F",
                borderRadius: 3,
                padding: 12,
                marginBottom: 16,
              }}
            >
              {user ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#4A4335" }}>
                      Connecté : <strong>{user.email}</strong>
                      <div className="mono" style={{ fontSize: 11, color: "#8A7C63", marginTop: 2 }}>
                        historique illimité, synchronisé
                      </div>
                    </div>
                    <button className="btn-ghost" onClick={signOut} style={{ flexShrink: 0 }}>
                      <LogOut size={14} /> déconnexion
                    </button>
                  </div>

                  <div style={{ borderTop: "1px dashed #C9BD9F", marginTop: 10, paddingTop: 10 }}>
                    {passwordStatus === "done" ? (
                      <p style={{ fontSize: 12, color: "#4A4335", margin: 0 }}>
                        Mot de passe défini ! Tu peux maintenant l'utiliser pour te connecter.
                      </p>
                    ) : (
                      <div>
                        <p style={{ fontSize: 11, color: "#8A7C63", marginTop: 0, marginBottom: 6 }}>
                          Définir un mot de passe (pour te reconnecter sans lien par email) :
                        </p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <div className="password-field">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="nouveau mot de passe"
                              style={{
                                width: "100%",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 12,
                                padding: "8px 34px 8px 10px",
                                borderRadius: 3,
                                border: "1px solid #B7AC96",
                                background: "#fff",
                                boxSizing: "border-box",
                              }}
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowNewPassword((v) => !v)}
                              aria-label={showNewPassword ? "masquer le mot de passe" : "afficher le mot de passe"}
                            >
                              {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <button
                            className="btn-ghost"
                            onClick={setAccountPassword}
                            disabled={passwordStatus === "saving"}
                            style={{ flexShrink: 0 }}
                          >
                            définir
                          </button>
                        </div>
                        {passwordError && (
                          <p style={{ fontSize: 11, color: "#B4432C", marginTop: 6, marginBottom: 0 }}>
                            {passwordError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : authStatus === "sent" ? (
                <p style={{ fontSize: 12, color: "#4A4335", margin: 0 }}>
                  Lien envoyé ! Vérifie ta boîte mail ({authEmail}) et clique dessus pour te connecter.
                </p>
              ) : authStatus === "signup_sent" ? (
                <p style={{ fontSize: 12, color: "#4A4335", margin: 0 }}>
                  Compte créé ! Vérifie ta boîte mail ({authEmail}) et clique sur le lien de confirmation pour
                  activer ton compte, puis reviens te connecter avec ton mot de passe.
                </p>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: "#4A4335", marginTop: 0, marginBottom: 8 }}>
                    Connecte-toi pour un historique illimité, synchronisé entre appareils (optionnel).
                  </p>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="ton@email.com"
                    style={{
                      width: "100%",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      padding: "8px 10px",
                      borderRadius: 3,
                      border: "1px solid #B7AC96",
                      background: "#fff",
                      marginBottom: 6,
                      boxSizing: "border-box",
                    }}
                  />
                  <div className="password-field" style={{ marginBottom: 8 }}>
                    <input
                      type={showAuthPassword ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="mot de passe"
                      style={{
                        width: "100%",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        padding: "8px 34px 8px 10px",
                        borderRadius: 3,
                        border: "1px solid #B7AC96",
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowAuthPassword((v) => !v)}
                      aria-label={showAuthPassword ? "masquer le mot de passe" : "afficher le mot de passe"}
                    >
                      {showAuthPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn-ghost"
                      onClick={signInWithPassword}
                      disabled={authStatus === "sending"}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      se connecter
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={signUpWithPassword}
                      disabled={authStatus === "sending"}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      créer un compte
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      margin: "10px 0",
                      color: "#8A7C63",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ flex: 1, height: 1, background: "#C9BD9F" }} />
                    ou
                    <div style={{ flex: 1, height: 1, background: "#C9BD9F" }} />
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={sendMagicLink}
                    disabled={authStatus === "sending" || !authEmail.trim()}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Mail size={14} /> recevoir un lien de connexion (sans mot de passe)
                  </button>
                  {authError && (
                    <p style={{ fontSize: 11, color: "#B4432C", marginTop: 6, marginBottom: 0 }}>{authError}</p>
                  )}
                </div>
              )}
            </div>

            {history.length === 0 && (
              <p className="mono" style={{ fontSize: 13, color: "#8A7C63" }}>
                Aucune estimation pour l'instant.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    background: "#F6F1E3",
                    border: "1px solid #C9BD9F",
                    borderRadius: 3,
                    padding: 8,
                  }}
                >
                  <img
                    src={h.image}
                    alt={h.objet}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.objet}
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: "#8A7C63" }}>
                      {h.prix_bas}–{h.prix_haut} € ·{" "}
                      {new Date(h.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromHistory(h.id)}
                    style={{ background: "none", border: "none", padding: 4, flexShrink: 0 }}
                    aria-label="supprimer"
                  >
                    <Trash2 size={16} color="#B4432C" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
