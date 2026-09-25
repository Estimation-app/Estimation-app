import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, Upload, Loader2, Tag, RotateCcw, History, Trash2, X, Mail, LogOut, Eye, EyeOff, Mic, MicOff, Sparkles, PlayCircle, CreditCard, Menu, Search, TrendingUp, TrendingDown, Globe, ChevronRight, ChevronLeft, ExternalLink, Moon, Share2, Trophy, Flame, Link2, Lock, Copy, Gift, BarChart3, Smile, User } from "lucide-react";
import logoWordmarkLight from "./assets/logo-wordmark-light.png";
import logoWordmarkDark from "./assets/logo-wordmark.png";

// Ton serveur relais (Cloudflare Worker) — cache les clés API et évite le
// blocage CORS d'un appel direct depuis le navigateur.
const PROXY_URL = "https://dark-lake-8ef1.dyloo999.workers.dev";

// Étiquettes affichées pour chaque source de prix (annonces réelles),
// utilisées à la fois dans le détail par plateforme et sur chaque annonce.
const SOURCE_LABELS = {
  leboncoin: "Leboncoin",
  vinted: "Vinted",
  ebay: "eBay",
  ebaySold: "eBay (vendu)",
};

// Plateformes vers lesquelles on renvoie pour créer une annonce (bouton
// "Générer une annonce"). On n'utilise pas les logos officiels (fichiers
// image sous droits/marque déposée) mais un petit badge rond dans la
// couleur de marque de chaque site, pour un rendu "icône" reconnaissable
// sans dépendre d'assets externes ni de droits d'image.
const SELL_PLATFORMS = [
  { label: "Leboncoin", url: "https://www.leboncoin.fr/deposer-une-annonce", color: "#EC5B23", mono: "lbc" },
  { label: "Vinted", url: "https://www.vinted.fr/items/new", color: "#09B1BA", mono: "V" },
  { label: "eBay", url: "https://www.ebay.fr/sl/sell", color: "#2D2A26", mono: "eB" },
];

// Identifiants Supabase (comptes + base de données). Contrairement aux clés
// SerpAPI/Anthropic, la clé "anon" est PUBLIQUE par conception — elle est
// protégée par les règles de sécurité (RLS) côté base de données, pas en
// la cachant. Remplace ces deux valeurs par les tiennes (Settings > API
// dans ton projet Supabase).
const SUPABASE_URL = "https://heykndklprjuvooqztmi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HFixMx_zGtcvHw6wqAUKBA_66uuJkBZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Les 3 abonnements payants (voir STRIPE_PRICES dans worker.js pour les IDs
// de prix réels côté serveur — le front n'envoie que la clé du plan).
const PLANS = [
  { key: "debutant", label: "Starter", price: "2,99 €/mois", quota: 20 },
  { key: "pro", label: "Pro", price: "9,99 €/mois", quota: 100 },
  { key: "premium", label: "Premium", price: "19,99 €/mois", quota: 300 },
];

// "Habillages" débloqués au fil des estimations (fonctionne comme les
// badges de "Ma collection", mais change carrément l'accent visuel de toute
// l'appli à la place de l'orange, en plus du choix fond clair/sombre). Le
// premier ("defaut") correspond à l'orange de marque habituel — il n'est
// jamais verrouillé. Chaque palier a sa propre teinte + une variante plus
// foncée (dégradés type bouton) et plus claire (surbrillance).
const GRADES = [
  { key: "defaut", threshold: 0, label: "Estim' classique", emoji: "🟠", accent: "#F2662E", accentDark: "#E0501D", accentLight: "#FF8A52", glow: 0 },
  { key: "bronze", threshold: 100, label: "Bronze", emoji: "🥉", accent: "#C97A3D", accentDark: "#8C5225", accentLight: "#E7A876", glow: 0.16 },
  { key: "argent", threshold: 500, label: "Argent", emoji: "🥈", accent: "#8B98A6", accentDark: "#5C6773", accentLight: "#F1F5F9", glow: 0.22 },
  { key: "or", threshold: 1000, label: "Or", emoji: "🥇", accent: "#D4A017", accentDark: "#96700D", accentLight: "#F6D978", glow: 0.3 },
  { key: "diamant", threshold: 5000, label: "Diamant", emoji: "💎", accent: "#4FC3E8", accentDark: "#1E7FA3", accentLight: "#D6F6FF", glow: 0.4 },
];

// Convertit un hex ("#RRGGBB") en triplet "r, g, b" pour construire des
// rgba(...) dynamiques (bordures/fonds translucides) à partir de l'accent
// actif, quel que soit le palier débloqué.
function hexToRgbString(hex) {
  const clean = (hex || "").replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

// "Fonds" débloqués au fil des GÉNÉRATIONS D'ANNONCE (et non des
// estimations comme pour les habillages — on génère bien moins d'annonces
// que d'estimations, donc les paliers sont volontairement beaucoup plus
// bas). Le premier ("bleu") correspond au fond navy/blanc habituel — il
// n'est jamais verrouillé et ne modifie rien (voir la logique de pt.* plus
// bas : on ne touche aux dégradés de fond que pour les autres teintes).
// Chaque teinte fournit 3 tons pour le mode sombre et 3 pour le mode clair,
// utilisés pour reconstruire dynamiquement pageBg/sheetBg/headerBg/etc.
// "bleu" et "blanc" sont les deux fonds historiques (l'ancienne bascule
// fond sombre/clair du menu, désormais fusionnée ici) : toujours débloqués,
// jamais retouchés (mode "dark"/"light" = les thèmes PANEL_THEMES existants
// tels quels). Les couleurs suivantes sont volontairement saturées/vives
// (pas de pastel délavé) pour bien se voir, sur le même principe que le
// bleu nuit d'origine — seules les grandes surfaces (page/panneaux/header/
// carte résultat/écran de chargement/zone photo) sont retouchées, via un
// dégradé base → mid → high propre à chaque teinte (voir plus bas dans le
// composant, juste avant `const pt = ...`).
const BG_SKINS = [
  { key: "bleu", threshold: 0, label: "Bleu nuit", emoji: "🔵", mode: "dark", base: "#0A1220", mid: "#152238", high: "#26374E" },
  { key: "blanc", threshold: 0, label: "Blanc", emoji: "⚪", mode: "light", base: "#E9EDF2", mid: "#F4F6F9", high: "#D7DEE6" },
  { key: "vert", threshold: 10, label: "Vert", emoji: "🟢", mode: "dark", base: "#051A10", mid: "#0F3D26", high: "#17824C" },
  { key: "jaune", threshold: 40, label: "Jaune", emoji: "🟡", mode: "dark", base: "#1F1605", mid: "#4D3800", high: "#8A6800" },
  { key: "marron", threshold: 90, label: "Marron", emoji: "🟤", mode: "dark", base: "#1C120A", mid: "#442A17", high: "#7A4A26" },
  { key: "rouge", threshold: 180, label: "Rouge", emoji: "🔴", mode: "dark", base: "#210609", mid: "#6E1620", high: "#B22B3A" },
  { key: "violet", threshold: 320, label: "Violet", emoji: "🟣", mode: "dark", base: "#180A28", mid: "#3F1768", high: "#6D2FB0" },
  // "Platine" : palier ultime ("masterclass" demandé) — argenté/brillant,
  // avec des nuances qui tirent vers le bleu-cyan du grade "diamant" (voir
  // GRADES plus haut) pour rappeler la pierre précieuse sans le copier.
  // Seul palier avec `glow` (halo lumineux) et petits glyphes "incrustés"
  // (voir le bloc `activeBgSkin.key === "platine"` dans le header).
  { key: "platine", threshold: 500, label: "Platine", emoji: "💠", mode: "dark", base: "#10141B", mid: "#5A6C82", high: "#D9F3FF", glow: 0.4 },
];
// Progression réelle des paliers à débloquer (le "blanc" est un fond
// alternatif toujours disponible, pas une récompense — il ne fait donc pas
// partie de l'échelle utilisée pour calculer le palier le plus haut
// atteint / le prochain palier, sinon il court-circuiterait "bleu" comme
// fond "le plus haut débloqué" par défaut puisque les deux ont le seuil 0).
const BG_PROGRESSION = BG_SKINS.filter((sk) => sk.key !== "blanc");

// Teintes de peau au choix pour l'avatar public — identitaires, pas des
// récompenses : toujours toutes disponibles, jamais à débloquer (contrairement
// aux coiffures/couleurs/vêtements/accessoires, voir AVATAR_WARDROBE plus bas
// dans le composant App(), qui dépend des stats de l'utilisateur).
const AVATAR_SKIN_TONES = ["#F6D8C0", "#E8B99A", "#C98F6B", "#9C6644", "#6B4226", "#4A2C17"];

// Avatar "vignette" : un buste (tête + épaules, sans bras/jambes) en 2D —
// c'est LA représentation de l'avatar utilisée partout (icône du header,
// classement, garde-robe, aperçu du panneau) : on a abandonné à la fois le
// personnage entier (bras/jambes) et la piste "vraie 3D" (three.js n'est
// pas installable ici, et le rendu obtenu ne convainquait pas) pour se
// concentrer sur UNE vignette 2D mais bien plus détaillée : visage avec
// iris/pupille/reflet/sourcils/nez/lèvres pleines (pas juste deux points et
// un trait), et un catalogue beaucoup plus large de coiffures/accessoires.
// Un léger dégradé radial sur la tête/le buste garde le rendu "figurine"
// avec un peu de relief. "gender" ne change que la largeur des épaules —
// jamais le catalogue d'habillage disponible.
function AvatarSVG({
  skin = AVATAR_SKIN_TONES[1],
  hairStyle = "court",
  hairColor = "#2B2B2B",
  topColor = "#5C6773",
  accessory = "aucun",
  gender = "homme",
  size = 96,
}) {
  const gradId = "avshade-" + Math.abs(
    (skin + hairStyle + hairColor + topColor + accessory + gender).split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
  );
  const isRainbowHair = hairColor === "rainbow";
  const isGoldTop = topColor === "gold";
  const hairFill = isRainbowHair ? `url(#${gradId}-rainbow)` : hairColor;
  const bodyFill = isGoldTop ? `url(#${gradId}-gold)` : topColor;
  const isFemme = gender === "femme";

  // Buste (épaules + haut du buste, coupé au cadre) : plus étroit pour
  // "femme", plus carré pour "homme" — même principe que l'ancienne
  // silhouette du torse, mais on s'arrête aux épaules.
  const shoulderHalf = isFemme ? 29 : 33;
  const neckHalf = 9;
  const bustTopY = 80;
  const bustBottomY = 120;
  const bustPath = `M${50 - neckHalf},${bustTopY} Q${50 - shoulderHalf},${bustTopY} ${50 - shoulderHalf},${bustTopY + 15} L${50 - shoulderHalf},${bustBottomY} L${50 + shoulderHalf},${bustBottomY} L${50 + shoulderHalf},${bustTopY + 15} Q${50 + shoulderHalf},${bustTopY} ${50 + neckHalf},${bustTopY} Z`;

  // Casque de cheveux par défaut (dessus/devant) : sert de base à toutes
  // les coiffures sauf "chauve" (rien), "afro" (son propre halo, dessiné
  // derrière la tête) et "mohawk" (bande centrale seule, côtés rasés).
  // Chaque style ajoute ensuite ses propres formes par-dessus cette base.
  const showDefaultCap = hairStyle !== "chauve" && hairStyle !== "afro" && hairStyle !== "mohawk";

  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="26%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
        {isRainbowHair && (
          <linearGradient id={gradId + "-rainbow"} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5C7A" />
            <stop offset="25%" stopColor="#FFC85C" />
            <stop offset="50%" stopColor="#5CE87A" />
            <stop offset="75%" stopColor="#5CB8FF" />
            <stop offset="100%" stopColor="#C05CFF" />
          </linearGradient>
        )}
        {isGoldTop && (
          <linearGradient id={gradId + "-gold"} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F6D978" />
            <stop offset="50%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#96700D" />
          </linearGradient>
        )}
      </defs>

      {/* Cheveux (partie arrière) — seul "afro" a besoin d'un halo qui
          dépasse le contour de la tête, dessiné avant elle. */}
      {hairStyle === "afro" && <circle cx="50" cy="32" r="32" fill={hairFill} />}

      {/* Buste */}
      <path d={bustPath} fill={bodyFill} />
      {/* Cou */}
      <rect x={50 - neckHalf} y="62" width={neckHalf * 2} height="22" fill={skin} />
      {/* Oreilles */}
      <circle cx="24" cy="46" r="5.5" fill={skin} />
      <circle cx="76" cy="46" r="5.5" fill={skin} />
      {/* Tête */}
      <circle cx="50" cy="44" r="25" fill={skin} />

      {/* --- Cheveux (dessus/devant) — AVANT le visage, pour que les yeux
          restent toujours visibles par-dessus (une coiffure ne doit jamais
          recouvrir le regard). --- */}
      {showDefaultCap && <ellipse cx="50" cy="31" rx="27" ry="19" fill={hairFill} />}
      {hairStyle === "longs" && (
        <>
          <rect x="17" y="28" width="11" height="66" rx="5.5" fill={hairFill} />
          <rect x="72" y="28" width="11" height="66" rx="5.5" fill={hairFill} />
        </>
      )}
      {hairStyle === "ondules" && (
        <>
          <path d="M20,28 Q30,40 20,50 Q30,62 20,74 Q30,86 22,98 L32,98 Q26,86 34,74 Q26,62 34,50 Q26,40 34,28 Z" fill={hairFill} />
          <path d="M80,28 Q70,40 80,50 Q70,62 80,74 Q70,86 78,98 L68,98 Q74,86 66,74 Q74,62 66,50 Q74,40 66,28 Z" fill={hairFill} />
        </>
      )}
      {hairStyle === "carre" && (
        <>
          <rect x="22" y="28" width="10" height="32" rx="5" fill={hairFill} />
          <rect x="68" y="28" width="10" height="32" rx="5" fill={hairFill} />
        </>
      )}
      {hairStyle === "queue" && (
        <>
          <path d="M67,18 Q80,28 74,55 Q70,72 63,60 Q70,40 61,22 Z" fill={hairFill} />
          <rect x="62" y="20" width="9" height="4.5" rx="2.2" fill="#2B2B2B" opacity="0.55" />
        </>
      )}
      {hairStyle === "chignon" && <circle cx="50" cy="13" r="9.5" fill={hairFill} />}
      {hairStyle === "frange" && <path d="M27,31 Q50,38 73,31 L73,36 Q50,31 27,36 Z" fill={hairFill} />}
      {hairStyle === "boucles" &&
        [
          [21, 31], [29, 16], [42, 9], [58, 9], [71, 16], [79, 31],
        ].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="7.6" fill={hairFill} />)}
      {hairStyle === "mohawk" && <path d="M46,2 L54,2 L58,27 L50,19 L42,27 Z" fill={hairFill} />}

      {/* --- Visage détaillé (toujours par-dessus les cheveux) : sourcils,
          yeux (blanc + iris + pupille + reflet), nez (ombre subtile),
          joues, bouche pleine --- */}
      <path d="M35,37 Q41,33 47,36.5" stroke={hairFill} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M53,36.5 Q59,33 65,37" stroke={hairFill} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      {[41, 59].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy="44" rx="5.2" ry="3.6" fill="#FFFFFF" />
          <circle cx={ex} cy="44.3" r="2.7" fill="#3A2A1E" />
          <circle cx={ex} cy="44.3" r="1.3" fill="#0B0B0B" />
          <circle cx={ex - 1} cy="43.3" r="0.6" fill="#FFFFFF" />
        </g>
      ))}
      <path d="M49,45 Q46.5,51 49,53" stroke="#00000030" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <ellipse cx="47.3" cy="53.3" rx="1" ry="0.7" fill="#00000025" />
      <ellipse cx="51.5" cy="53.3" rx="1" ry="0.7" fill="#00000025" />
      <ellipse cx="33" cy="53" rx="5" ry="3.4" fill="#FF8A7A" opacity="0.14" />
      <ellipse cx="67" cy="53" rx="5" ry="3.4" fill="#FF8A7A" opacity="0.14" />
      <path d="M43,58.5 Q50,57.5 57,58.5 Q50,66 43,58.5 Z" fill="#C97A6E" stroke="#A65C52" strokeWidth="0.6" />

      {/* Ombre/relief global (tête + buste) */}
      <circle cx="50" cy="44" r="25" fill={`url(#${gradId})`} />
      <path d={bustPath} fill={`url(#${gradId})`} />

      {/* --- Accessoires — toujours par-dessus tout le reste --- */}
      {accessory === "bandeau" && <rect x="24" y="35" width="52" height="6" rx="3" fill="#B22B3A" />}
      {accessory === "bandana" && (
        <>
          <path d="M24,35 Q24,15 50,13 Q76,15 76,35 Q50,27 24,35 Z" fill="#B22B3A" />
          <circle cx="76" cy="31" r="4" fill="#8C1F2B" />
        </>
      )}
      {accessory === "bonnet" && (
        <>
          <path d="M23,32 Q23,7 50,7 Q77,7 77,32 L77,33 L23,33 Z" fill="#6D2FB0" />
          <rect x="21" y="30" width="58" height="8" rx="4" fill="#5A2591" />
        </>
      )}
      {accessory === "casquette" && (
        <>
          <path d="M23,34 Q23,9 50,8 Q77,9 77,34 Q50,24 23,34 Z" fill="#29394F" />
          <ellipse cx="32" cy="34" rx="16" ry="5" fill="#1E2C3D" />
        </>
      )}
      {accessory === "lunettes" && (
        <>
          <circle cx="41" cy="44" r="7" fill="none" stroke="#152238" strokeWidth="2" />
          <circle cx="59" cy="44" r="7" fill="none" stroke="#152238" strokeWidth="2" />
          <line x1="48" y1="44" x2="52" y2="44" stroke="#152238" strokeWidth="2" />
        </>
      )}
      {accessory === "soleil" && (
        <>
          <circle cx="41" cy="44" r="7.5" fill="#1A1A1A" stroke="#0B0B0B" strokeWidth="1.5" />
          <circle cx="59" cy="44" r="7.5" fill="#1A1A1A" stroke="#0B0B0B" strokeWidth="1.5" />
          <line x1="48.5" y1="44" x2="51.5" y2="44" stroke="#0B0B0B" strokeWidth="2" />
          <circle cx="38.5" cy="41.5" r="1.3" fill="#FFFFFF" opacity="0.5" />
          <circle cx="56.5" cy="41.5" r="1.3" fill="#FFFFFF" opacity="0.5" />
        </>
      )}
      {accessory === "bijoux" && (
        <>
          <circle cx="24" cy="54" r="2.2" fill="#D4A017" />
          <circle cx="76" cy="54" r="2.2" fill="#D4A017" />
        </>
      )}
      {accessory === "foulard" && (
        <>
          <path d="M38,78 Q50,89 62,78 L62,87 Q50,97 38,87 Z" fill="#17824C" />
          <path d="M58,85 L67,93 L60,95 Z" fill="#12613A" />
        </>
      )}
      {accessory === "loupe" && (
        <>
          <circle cx="79" cy="101" r="8" fill="none" stroke="#D4A017" strokeWidth="3" />
          <line x1="85" y1="107" x2="93" y2="115" stroke="#8C5225" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {accessory === "couronne" && (
        <path d="M28,20 L35,4 L43,16 L50,2 L57,16 L65,4 L72,20 Z" fill="#D4A017" stroke="#96700D" strokeWidth="1" />
      )}
      {accessory === "medaille" && (
        <>
          <circle cx="61" cy="99" r="8" fill="#D4A017" stroke="#96700D" strokeWidth="1.5" />
          <text x="61" y="103" textAnchor="middle" fontSize="9" fill="#4A3500">★</text>
        </>
      )}
    </svg>
  );
}

// Sous-catégories affichées (triées de A à Z) dans le menu "Rechercher un
// produit". Purement pour orienter la recherche — le texte de la catégorie
// est simplement ajouté à la requête envoyée au serveur, qui interroge les
// mêmes sources (Leboncoin / Vinted / eBay) que le reste de l'app.
const PRODUCT_CATEGORIES = [
  { key: "bijoux", label: "Bijoux" },
  { key: "chaussures", label: "Chaussures" },
  { key: "cuisine", label: "Cuisine (électroménager & ustensiles)" },
  { key: "decoration", label: "Décoration" },
  { key: "electronique", label: "Électronique & high-tech" },
  { key: "immobilier", label: "Immobilier" },
  { key: "instruments", label: "Instruments de musique" },
  { key: "jeux", label: "Jeux & jouets" },
  { key: "livres", label: "Livres & BD" },
  { key: "maroquinerie", label: "Maroquinerie & sacs" },
  { key: "mobilier", label: "Mobilier" },
  { key: "montres", label: "Montres" },
  { key: "objets_quotidien", label: "Objets du quotidien" },
  { key: "outillage", label: "Outillage & bricolage" },
  { key: "puericulture", label: "Puériculture" },
  { key: "sport", label: "Sport & loisirs" },
  { key: "vehicules", label: "Véhicules (voiture, moto…)" },
  { key: "velos", label: "Vélos" },
  { key: "vetements", label: "Vêtements" },
  { key: "vin", label: "Vin & spiritueux" },
];

// Adresse de contact du support client, affichée dans le menu.
const CONTACT_EMAIL = "estim.app.contact@gmail.com";

// Traductions : volet volontairement limité au nouveau menu/panneaux et à
// une poignée de textes très visibles (accroche, écran de chargement,
// libellé "estimation d'occasion") plutôt qu'à l'intégralité de l'app.
const LANGUAGES = [
  { key: "fr", label: "Français", flag: "🇫🇷" },
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "es", label: "Español", flag: "🇪🇸" },
];

// Thème de TOUTE l'application (header, hero, zone photo, écrans de
// chargement, cartes de résultat, formulaires véhicule/immobilier,
// historique, connexion, abonnement...) : "dark" (navy, par défaut) ou
// "light". Tout ce qui est bleu marine en mode dark devient blanc/clair en
// mode light et inversement — seul l'orange (couleur de marque) reste
// inchangé dans les deux thèmes. Choix mémorisé (voir menuTheme plus bas
// dans le composant) et modifiable via les deux pastilles du menu.
const PANEL_THEMES = {
  dark: {
    pageBg: "#0A1220",
    topBarGradient: "linear-gradient(90deg, #152238 0%, #29394F 35%, #F2662E 100%)",
    headerBg: "linear-gradient(135deg, #04060C 0%, #152238 52%, #2E4159 100%)",
    menuBtnBorder: "rgba(238, 241, 245, 0.35)",
    menuBtnBg: "rgba(255, 255, 255, 0.06)",
    menuBtnColor: "#EEF1F5",
    dropZoneBg: "radial-gradient(circle at 50% 32%, #29394F 0%, #152238 72%)",
    dropZoneText: "#EEF1F5",
    loadingBg: "linear-gradient(160deg, #1B2A45 0%, #152238 100%)",
    loadingBorder: "#29394F",
    loadingText: "#EEF1F5",
    resultCardBg: "linear-gradient(135deg, #04060C 0%, #152238 52%, #2E4159 100%)",
    formCardBg: "rgba(255, 255, 255, 0.06)",
    formCardBorder: "1px solid rgba(255, 255, 255, 0.14)",
    sheetBg: "linear-gradient(160deg, #0A1220 0%, #152238 45%, #26374E 100%)",
    grabBg: "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, #F2662E 100%)",
    titleColor: "#FFFFFF",
    closeColor: "#B9C3D1",
    rowBg: "rgba(255, 255, 255, 0.06)",
    rowBorder: "1px solid rgba(255, 255, 255, 0.14)",
    rowText: "#EEF1F5",
    chevronColor: "#7C8BA3",
    subText: "#B9C3D1",
    errorColor: "#FF9466",
    inputBg: "rgba(255, 255, 255, 0.08)",
    inputBorder: "1px solid rgba(255, 255, 255, 0.25)",
    inputText: "#FFFFFF",
    cardBg: "rgba(255, 255, 255, 0.06)",
    cardBorder: "1px solid rgba(255, 255, 255, 0.14)",
    cardImgBg: "rgba(255, 255, 255, 0.04)",
    cardImgIcon: "#5E7092",
    cardTitleColor: "#EEF1F5",
    chipBorder: "1px solid rgba(255, 255, 255, 0.18)",
    chipBg: "rgba(255, 255, 255, 0.06)",
    chipText: "#C9D3E0",
    dashedBorder: "1px dashed rgba(255, 255, 255, 0.18)",
    langUnselectedBorder: "1px solid rgba(255, 255, 255, 0.16)",
    langUnselectedBg: "rgba(255, 255, 255, 0.04)",
    ghostBorder: "rgba(255, 255, 255, 0.3)",
    ghostColor: "#EEF1F5",
    ghostBg: "rgba(255, 255, 255, 0.06)",
    strongColor: "#FFFFFF",
  },
  light: {
    pageBg: "#E9EDF2",
    topBarGradient: "linear-gradient(90deg, #D7DEE6 0%, #93A4BC 35%, #F2662E 100%)",
    headerBg: "linear-gradient(135deg, #FFFFFF 0%, #F4F6F9 55%, #E9EDF2 100%)",
    menuBtnBorder: "rgba(21, 34, 56, 0.18)",
    menuBtnBg: "rgba(21, 34, 56, 0.05)",
    menuBtnColor: "#152238",
    dropZoneBg: "radial-gradient(circle at 50% 32%, #F4F6F9 0%, #E9EDF2 72%)",
    dropZoneText: "#29394F",
    loadingBg: "linear-gradient(160deg, #FFFFFF 0%, #F4F6F9 100%)",
    loadingBorder: "#D7DEE6",
    loadingText: "#152238",
    resultCardBg: "linear-gradient(135deg, #FFFFFF 0%, #F4F6F9 55%, #E9EDF2 100%)",
    formCardBg: "#F4F6F9",
    formCardBorder: "1px solid #D7DEE6",
    sheetBg: "#E9EDF2",
    grabBg: "linear-gradient(90deg, #152238 0%, #F2662E 100%)",
    titleColor: "#152238",
    closeColor: "#42536A",
    rowBg: "#F4F6F9",
    rowBorder: "1px solid #D7DEE6",
    rowText: "#29394F",
    chevronColor: "#93A4BC",
    subText: "#647A93",
    errorColor: "#F2662E",
    inputBg: "#FFFFFF",
    inputBorder: "1px solid #A9B7C6",
    inputText: "#152238",
    cardBg: "#F4F6F9",
    cardBorder: "1px solid #D7DEE6",
    cardImgBg: "#E9EDF2",
    cardImgIcon: "#B9C3D1",
    cardTitleColor: "#29394F",
    chipBorder: "1px solid #D7DEE6",
    chipBg: "#FFFFFF",
    chipText: "#647A93",
    dashedBorder: "1px dashed #D7DEE6",
    langUnselectedBorder: "1px solid #D7DEE6",
    langUnselectedBg: "#FFFFFF",
    ghostBorder: "#A9B7C6",
    ghostColor: "#42536A",
    ghostBg: "transparent",
    strongColor: "#152238",
  },
};

const TRANSLATIONS = {
  fr: {
    hero_title_1: "Une photo. Un prix.",
    hero_title_2: "Direct.",
    hero_subtitle:
      "Dégaine ton téléphone : le prix de revente réel, façon Leboncoin ou brocante, en quelques secondes chrono.",
    drop_zone_title: "Ajouter une photo",
    drop_zone_sub: "appareil photo ou galerie",
    loading_analyzing: "Identification de l'objet…",
    loading_pricing: "Recherche des prix sur Leboncoin, Vinted, eBay…",
    used_price_label: "estimation d'occasion",
    menu_title: "Menu",
    menu_my_estimates: "Mes Estim'",
    menu_search_product: "Rechercher un produit",
    menu_trending: "Produits du moment",
    menu_leaderboard: "Classement",
    menu_collection: "Ma collection",
    menu_avatar: "Avatar",
    menu_subscription: "Abonnement",
    menu_contact: "Contact",
    menu_language: "Langue",
    menu_display: "Affichage",
    theme_dark: "Fond bleu",
    theme_light: "Fond blanc",
    menu_logout: "Déconnexion",
    search_choose_category: "Choisis une catégorie",
    search_placeholder: "Rechercher un produit…",
    search_button: "Rechercher",
    search_loading: "Recherche en cours…",
    search_empty: "Aucun résultat pour l'instant. Essaie une autre recherche.",
    search_error: "Erreur pendant la recherche.",
    search_sort_relevance: "Pertinence",
    search_sort_price_asc: "Prix croissant",
    search_sort_price_desc: "Prix décroissant",
    search_sort_date: "Plus récent",
    back: "Retour",
    trending_title: "Produits du moment",
    trending_subtitle: "Les annonces les plus vues sur Leboncoin, Vinted et eBay, sélectionnées par l'IA.",
    trending_loading: "Chargement des produits du moment…",
    trending_empty: "Rien à afficher pour l'instant.",
    trending_count_suffix: "produits trouvés",
    trending_page_label: "Page",
    category_trending_title: "Tendances dans cette catégorie",
    category_trending_subtitle: "Mis à jour régulièrement à partir d'annonces Leboncoin, Vinted et eBay, sélectionnées par l'IA.",
    category_trending_loading: "Chargement des tendances…",
    category_trending_empty: "Rien à afficher pour l'instant.",
    leaderboard_title: "Classement",
    leaderboard_subtitle: "Les meilleurs estimateurs, par nombre d'estimations et par nombre d'annonces générées.",
    leaderboard_tab_estimations: "Estimations",
    leaderboard_tab_ads: "Annonces générées",
    leaderboard_period_month: "Ce mois-ci",
    leaderboard_period_total: "Total",
    leaderboard_loading: "Chargement du classement…",
    leaderboard_empty: "Personne dans ce classement pour l'instant.",
    leaderboard_you: "toi",
    leaderboard_pseudo_label: "Ton pseudo public",
    leaderboard_pseudo_placeholder: "pseudo (3-20 caractères)",
    leaderboard_pseudo_save: "Enregistrer",
    leaderboard_pseudo_saved: "Pseudo enregistré !",
    leaderboard_pseudo_login_required: "Connecte-toi (depuis « Mes estimes ») pour apparaître dans le classement sous ton propre pseudo.",
    subscription_title: "Abonnement",
    subscription_current: "Abonnement en cours",
    subscription_free: "Gratuit",
    subscription_manage: "gérer",
    subscription_subscribe: "s'abonner",
    subscription_login_required: "Connecte-toi (depuis « Mes estimes ») pour gérer ton abonnement.",
    subscription_remaining_paid: "estimations restantes ce mois",
    subscription_remaining_free: "estimation(s) gratuite(s) restante(s) ce mois",
    subscription_plans_title: "Nos abonnements :",
    contact_title: "Contact",
    contact_text: "Une question, un souci, une suggestion ? Écris-nous :",
    language_title: "Langue",
    card_estimate_button: "Estimer",
    card_estimate_title: "Générer une estimation à partir de cette annonce",
    listing_seed_badge: "Estimation basée sur une annonce en ligne",
    listing_seed_link: "Voir l'annonce d'origine",
    reestimate_badge: "Réestimation à partir de ton historique — pour voir si le prix a bougé",
  },
  en: {
    hero_title_1: "One photo. One price.",
    hero_title_2: "Instantly.",
    hero_subtitle:
      "Grab your phone: the real resale price, flea-market or classifieds style, in a few seconds.",
    drop_zone_title: "Add a photo",
    drop_zone_sub: "camera or gallery",
    loading_analyzing: "Identifying the item…",
    loading_pricing: "Searching prices on Leboncoin, Vinted, eBay…",
    used_price_label: "second-hand estimate",
    menu_title: "Menu",
    menu_my_estimates: "My Estim'",
    menu_search_product: "Search a product",
    menu_trending: "Trending products",
    menu_leaderboard: "Leaderboard",
    menu_collection: "My collection",
    menu_avatar: "Avatar",
    menu_subscription: "Subscription",
    menu_contact: "Contact",
    menu_language: "Language",
    menu_display: "Display",
    theme_dark: "Blue background",
    theme_light: "White background",
    menu_logout: "Log out",
    search_choose_category: "Choose a category",
    search_placeholder: "Search a product…",
    search_button: "Search",
    search_loading: "Searching…",
    search_empty: "No results yet. Try another search.",
    search_error: "Search error.",
    search_sort_relevance: "Relevance",
    search_sort_price_asc: "Price: low to high",
    search_sort_price_desc: "Price: high to low",
    search_sort_date: "Newest",
    back: "Back",
    trending_title: "Trending products",
    trending_subtitle: "The most viewed listings on Leboncoin, Vinted and eBay, curated by AI.",
    trending_loading: "Loading trending products…",
    trending_empty: "Nothing to show yet.",
    trending_count_suffix: "products found",
    trending_page_label: "Page",
    category_trending_title: "Trending in this category",
    category_trending_subtitle: "Regularly refreshed from Leboncoin, Vinted and eBay listings, curated by AI.",
    category_trending_loading: "Loading trends…",
    category_trending_empty: "Nothing to show yet.",
    leaderboard_title: "Leaderboard",
    leaderboard_subtitle: "The top estimators, by number of estimations and by number of ads generated.",
    leaderboard_tab_estimations: "Estimations",
    leaderboard_tab_ads: "Ads generated",
    leaderboard_period_month: "This month",
    leaderboard_period_total: "Total",
    leaderboard_loading: "Loading leaderboard…",
    leaderboard_empty: "No one on this leaderboard yet.",
    leaderboard_you: "you",
    leaderboard_pseudo_label: "Your public username",
    leaderboard_pseudo_placeholder: "username (3-20 characters)",
    leaderboard_pseudo_save: "Save",
    leaderboard_pseudo_saved: "Username saved!",
    leaderboard_pseudo_login_required: "Sign in (from “My estimates”) to appear on the leaderboard under your own username.",
    subscription_title: "Subscription",
    subscription_current: "Current plan",
    subscription_free: "Free",
    subscription_manage: "manage",
    subscription_subscribe: "subscribe",
    subscription_login_required: "Sign in (from “My estimates”) to manage your subscription.",
    subscription_remaining_paid: "estimates left this month",
    subscription_remaining_free: "free estimate(s) left this month",
    subscription_plans_title: "Our plans:",
    contact_title: "Contact",
    contact_text: "A question, an issue, a suggestion? Write to us:",
    language_title: "Language",
    card_estimate_button: "Estimate",
    card_estimate_title: "Generate an estimate from this listing",
    listing_seed_badge: "Estimate based on an online listing",
    listing_seed_link: "View the original listing",
    reestimate_badge: "Re-checked from your history — to see if the price has moved",
  },
  es: {
    hero_title_1: "Una foto. Un precio.",
    hero_title_2: "Al instante.",
    hero_subtitle:
      "Saca el móvil: el precio real de reventa, estilo mercadillo o anuncios, en pocos segundos.",
    drop_zone_title: "Añadir una foto",
    drop_zone_sub: "cámara o galería",
    loading_analyzing: "Identificando el objeto…",
    loading_pricing: "Buscando precios en Leboncoin, Vinted, eBay…",
    used_price_label: "estimación de segunda mano",
    menu_title: "Menú",
    menu_my_estimates: "Mis Estim'",
    menu_search_product: "Buscar un producto",
    menu_trending: "Productos del momento",
    menu_leaderboard: "Clasificación",
    menu_collection: "Mi colección",
    menu_avatar: "Avatar",
    menu_subscription: "Suscripción",
    menu_contact: "Contacto",
    menu_language: "Idioma",
    menu_display: "Apariencia",
    theme_dark: "Fondo azul",
    theme_light: "Fondo blanco",
    menu_logout: "Cerrar sesión",
    search_choose_category: "Elige una categoría",
    search_placeholder: "Buscar un producto…",
    search_button: "Buscar",
    search_loading: "Buscando…",
    search_empty: "Sin resultados por ahora. Prueba otra búsqueda.",
    search_error: "Error en la búsqueda.",
    search_sort_relevance: "Relevancia",
    search_sort_price_asc: "Precio: menor a mayor",
    search_sort_price_desc: "Precio: mayor a menor",
    search_sort_date: "Más reciente",
    back: "Volver",
    trending_title: "Productos del momento",
    trending_subtitle: "Los anuncios más vistos en Leboncoin, Vinted y eBay, seleccionados por IA.",
    trending_loading: "Cargando productos del momento…",
    trending_empty: "Nada que mostrar por ahora.",
    trending_count_suffix: "productos encontrados",
    trending_page_label: "Página",
    category_trending_title: "Tendencias en esta categoría",
    category_trending_subtitle: "Actualizado regularmente a partir de anuncios de Leboncoin, Vinted y eBay, seleccionados por IA.",
    category_trending_loading: "Cargando tendencias…",
    category_trending_empty: "Nada que mostrar por ahora.",
    leaderboard_title: "Clasificación",
    leaderboard_subtitle: "Los mejores estimadores, por número de estimaciones y por número de anuncios generados.",
    leaderboard_tab_estimations: "Estimaciones",
    leaderboard_tab_ads: "Anuncios generados",
    leaderboard_period_month: "Este mes",
    leaderboard_period_total: "Total",
    leaderboard_loading: "Cargando clasificación…",
    leaderboard_empty: "Nadie en esta clasificación todavía.",
    leaderboard_you: "tú",
    leaderboard_pseudo_label: "Tu nombre público",
    leaderboard_pseudo_placeholder: "nombre (3-20 caracteres)",
    leaderboard_pseudo_save: "Guardar",
    leaderboard_pseudo_saved: "¡Nombre guardado!",
    leaderboard_pseudo_login_required: "Inicia sesión (desde «Mis estimaciones») para aparecer en la clasificación con tu propio nombre.",
    subscription_title: "Suscripción",
    subscription_current: "Plan actual",
    subscription_free: "Gratis",
    subscription_manage: "gestionar",
    subscription_subscribe: "suscribirse",
    subscription_login_required: "Inicia sesión (desde «Mis estimaciones») para gestionar tu suscripción.",
    subscription_remaining_paid: "estimaciones restantes este mes",
    subscription_remaining_free: "estimación(es) gratuita(s) restante(s) este mes",
    subscription_plans_title: "Nuestros planes:",
    contact_title: "Contacto",
    contact_text: "¿Una pregunta, un problema, una sugerencia? Escríbenos:",
    language_title: "Idioma",
    card_estimate_button: "Estimar",
    card_estimate_title: "Generar una estimación a partir de este anuncio",
    listing_seed_badge: "Estimación basada en un anuncio en línea",
    listing_seed_link: "Ver el anuncio original",
    reestimate_badge: "Reestimación desde tu historial — para ver si el precio cambió",
  },
};

// Petite jauge 0–10 réutilisée dans l'onglet "statistiques" du résultat :
// titre centré en haut, un rail au milieu, et un curseur (avec sa note)
// qui se positionne le long du rail selon la valeur — de "difficile" côté
// gauche à "facile" côté droit (ou "pas rare" / "rare" pour la rareté).
// `value` peut être null/undefined si l'IA ne l'a pas renvoyée (ex: anciens
// résultats de l'historique) — dans ce cas on affiche le rail vide, sans curseur.
function Gauge({ label, value, lowLabel, highLabel, theme = "dark", accent = "#F2662E", accentRgb = "242, 102, 46" }) {
  const pt = PANEL_THEMES[theme] || PANEL_THEMES.dark;
  const v = typeof value === "number" && !isNaN(value) ? Math.max(0, Math.min(10, value)) : null;
  const pct = v !== null ? v * 10 : null;
  return (
    <div style={{ marginBottom: 26 }}>
      <div
        className="mono"
        style={{
          textAlign: "center",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: pt.strongColor,
          marginBottom: 18,
        }}
      >
        {label}
      </div>

      <div style={{ position: "relative", height: 30, margin: "0 9px" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 3,
            background:
              theme === "light"
                ? `linear-gradient(90deg, rgba(21,34,56,0.12) 0%, rgba(${accentRgb},0.45) 100%)`
                : `linear-gradient(90deg, rgba(255,255,255,0.16) 0%, rgba(${accentRgb},0.45) 100%)`,
            border: `1px solid ${pt.rowBorder.replace("1px solid ", "")}`,
          }}
        />
        {pct !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${pct}%`,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#FFFFFF",
                background: accent,
                borderRadius: 8,
                padding: "2px 6px",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 6px rgba(21, 34, 56, 0.25)",
              }}
            >
              {v}/10
            </span>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: accent,
                border: "3px solid #FFFFFF",
                boxShadow: "0 2px 6px rgba(21, 34, 56, 0.35)",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0 0" }}>
        <span className="mono" style={{ fontSize: 11, color: pt.chevronColor }}>{lowLabel}</span>
        <span className="mono" style={{ fontSize: 11, color: pt.chevronColor }}>{highLabel}</span>
      </div>
    </div>
  );
}

// Découpe un texte sur plusieurs lignes centrées dans un <canvas> (pas
// d'équivalent natif à fillText multi-lignes) — utilisé par shareResult()
// pour composer la carte visuelle partageable.
function canvasWrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = (text || "").split(" ");
  const lines = [];
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  const kept = lines.slice(0, maxLines);
  const startY = y - ((kept.length - 1) * lineHeight) / 2;
  kept.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

// Générateur pseudo-aléatoire déterministe (même seed = toujours le même
// résultat) — sert à "zoomer" dans la tendance IA (annuelle) sans que la
// courbe ne saute à chaque re-rendu ni ne soit identique pour tout le monde.
function seededRandom(seedStr) {
  let h = 0;
  const s = String(seedStr || "estim");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return function () {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h % 10000) / 10000;
  };
}

// Interpole `count` points entre v0 et v1, avec un peu de bruit déterministe
// (ancré exactement sur v0/v1 aux extrémités) pour donner un tracé crédible
// plutôt qu'une ligne droite parfaite quand on "zoome" dans un segment.
function interpolateSegment(v0, v1, count, seedStr) {
  const rand = seededRandom(seedStr);
  const span = Math.abs(v1 - v0) || Math.max(1, Math.abs(v0 || 1) * 0.05);
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const base = v0 + (v1 - v0) * t;
    const noise = (rand() - 0.5) * span * 0.35 * Math.sin(Math.PI * t);
    points.push(base + noise);
  }
  return points;
}

// Construit les points du graphique pour une période donnée ("1j" à
// "total") à partir des indices annuels renvoyés par l'IA (tendance sur 10
// ans). Les périodes courtes (1j/1s/1m) "zooment" dans la fin de la courbe
// longue plutôt que d'inventer une donnée indépendante — comme un vrai
// graphique boursier qui n'a qu'UNE série de prix, juste regardée à des
// résolutions différentes.
function buildTrendSeries(yearlyIndices, rangeKey, seedStr, priceAvg) {
  const idx = (yearlyIndices || []).filter((n) => typeof n === "number" && !isNaN(n));
  if (idx.length < 2) return null;
  const n = idx.length;
  const values = idx.map((v) => priceAvg * (v / 100));
  const yearsAgoLabel = (k) => (k <= 0 ? "auj." : `-${k} an${k > 1 ? "s" : ""}`);

  if (rangeKey === "10a" || rangeKey === "total") {
    return values.map((v, i) => ({ label: yearsAgoLabel(n - 1 - i), value: v }));
  }
  if (rangeKey === "5a") {
    const start = Math.max(0, n - 6);
    return values.slice(start).map((v, i) => ({ label: yearsAgoLabel(n - 1 - (start + i)), value: v }));
  }

  const last = values[n - 1];
  const prev = values[n - 2] !== undefined ? values[n - 2] : last;
  const monthSeg = interpolateSegment(prev, last, 11, seedStr + "|1a");

  if (rangeKey === "1a") {
    return monthSeg.map((v, i) => ({
      label: i === monthSeg.length - 1 ? "auj." : `-${monthSeg.length - 1 - i} mois`,
      value: v,
    }));
  }

  const daySeg = interpolateSegment(
    monthSeg[monthSeg.length - 2],
    monthSeg[monthSeg.length - 1],
    29,
    seedStr + "|1m"
  );
  if (rangeKey === "1m") {
    return daySeg.map((v, i) => ({
      label: i === daySeg.length - 1 ? "auj." : `j-${daySeg.length - 1 - i}`,
      value: v,
    }));
  }
  if (rangeKey === "1s") {
    const weekSeg = daySeg.slice(-7);
    return weekSeg.map((v, i) => ({
      label: i === weekSeg.length - 1 ? "auj." : `j-${weekSeg.length - 1 - i}`,
      value: v,
    }));
  }
  // "1j" : la dernière journée uniquement — variation intra-journée quasi
  // nulle pour ce type d'objet, on le dit clairement dans l'appelant plutôt
  // que d'inventer un vrai signal.
  const lastDay = daySeg[daySeg.length - 1];
  const prevDay = daySeg[daySeg.length - 2] !== undefined ? daySeg[daySeg.length - 2] : lastDay;
  const hourSeg = interpolateSegment(prevDay, lastDay, 7, seedStr + "|1j");
  return hourSeg.map((v, i) => ({
    label: i === hourSeg.length - 1 ? "maint." : `-${(hourSeg.length - 1 - i) * 3}h`,
    value: v,
  }));
}

const TREND_RANGES = [
  { key: "1j", label: "1J" },
  { key: "1s", label: "1S" },
  { key: "1m", label: "1M" },
  { key: "1a", label: "1A" },
  { key: "5a", label: "5A" },
  { key: "10a", label: "10A" },
  { key: "total", label: "Total" },
];

// Petit graphique de tendance façon "trading" (ligne + zone dégradée, vert
// si ça monte, rouge si ça baisse, curseur tactile/souris avec info-bulle) —
// aucune dépendance externe, tout en SVG à la main. Utilisé pour la tendance
// de marché IA (onglet "Statistiques" d'un résultat) et pour la valeur de la
// collection dans le temps (panneau "Ma collection").
function PriceEvolutionChart({ points, theme = "dark", height = 130, unit = "€", formatValue }) {
  const pt = PANEL_THEMES[theme] || PANEL_THEMES.dark;
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);
  const W = 320;
  const H = height;
  const PADX = 6;
  const PADY = 14;

  const clean = (points || []).filter((p) => typeof p.value === "number" && !isNaN(p.value));
  if (clean.length < 2) return null;

  const values = clean.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(1, max * 0.1) || 1;

  const xAt = (i) => PADX + (i * (W - 2 * PADX)) / Math.max(clean.length - 1, 1);
  const yAt = (v) => H - PADY - ((v - min) / range) * (H - 2 * PADY);

  const linePath = clean.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(clean.length - 1).toFixed(1)} ${H - PADY} L ${xAt(0).toFixed(1)} ${H - PADY} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const up = last >= first;
  const color = up ? "#4ADE80" : "#F87171";
  const deltaPct = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;

  const fmt = formatValue || ((v) => `${Math.round(v)} ${unit}`);

  function handleMove(clientX) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let nearestDist = Infinity;
    clean.forEach((_, i) => {
      const d = Math.abs(xAt(i) - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? clean[hoverIndex] : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
            color,
            background: up ? "rgba(74, 222, 128, 0.14)" : "rgba(248, 113, 113, 0.14)",
            borderRadius: 8,
            padding: "3px 8px",
          }}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {deltaPct > 0 ? "+" : ""}
          {deltaPct}%
        </div>
        {hovered && (
          <div className="mono" style={{ fontSize: 11, color: pt.subText }}>
            {hovered.label} · <strong style={{ color: pt.strongColor }}>{fmt(hovered.value)}</strong>
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: "block", touchAction: "pan-y" }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`priceEvoGrad-${theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PADX}
          y1={H - PADY}
          x2={W - PADX}
          y2={H - PADY}
          stroke={pt.rowBorder.replace("1px solid ", "")}
          strokeWidth="1"
        />

        <path d={areaPath} fill={`url(#priceEvoGrad-${theme})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hoverIndex !== null && (
          <>
            <line
              x1={xAt(hoverIndex)}
              y1={PADY / 2}
              x2={xAt(hoverIndex)}
              y2={H - PADY}
              stroke={pt.chevronColor}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={xAt(hoverIndex)} cy={yAt(clean[hoverIndex].value)} r="4" fill={color} stroke={pt.pageBg} strokeWidth="2" />
          </>
        )}

        {hoverIndex === null && (
          <circle
            cx={xAt(clean.length - 1)}
            cy={yAt(clean[clean.length - 1].value)}
            r="4"
            fill={color}
            stroke={pt.pageBg}
            strokeWidth="2"
          />
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span className="mono" style={{ fontSize: 10, color: pt.chevronColor }}>{clean[0].label}</span>
        <span className="mono" style={{ fontSize: 10, color: pt.chevronColor }}>{clean[clean.length - 1].label}</span>
      </div>
    </div>
  );
}

// Carte cliquable pour une annonce réelle (image + titre + prix + badge de
// plateforme), utilisée à la fois par "Rechercher un produit" et "Produits
// du moment" — clique = ouvre la vraie annonce d'origine dans un nouvel
// onglet (aucune donnée n'est recréée/fabriquée, on relie juste vers elle).
function ProductCard({ item, theme = "dark", onEstimate, estimateLabel, estimateTitle, accent = "#F2662E" }) {
  if (!item || !item.link) return null;
  const pt = PANEL_THEMES[theme] || PANEL_THEMES.dark;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: pt.cardBg,
        border: pt.cardBorder,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textDecoration: "none",
        }}
      >
        <div style={{ position: "relative", width: "100%", paddingTop: "100%", background: pt.cardImgBg }}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.title || ""}
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tag size={22} color={pt.cardImgIcon} />
            </div>
          )}
          {item.source && SOURCE_LABELS[item.source] && (
            <span
              className="mono"
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#FFFFFF",
                background: "rgba(21, 34, 56, 0.78)",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              {SOURCE_LABELS[item.source]}
            </span>
          )}
        </div>
        <div style={{ padding: "8px 9px 6px" }}>
          <div
            style={{
              fontSize: 12,
              color: pt.cardTitleColor,
              lineHeight: 1.3,
              marginBottom: 4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.title}
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: accent }}>
            {item.price || (item.extracted_price ? item.extracted_price + " €" : "")}
          </div>
        </div>
      </a>
      {onEstimate && (
        <button
          type="button"
          onClick={() => onEstimate(item)}
          title={estimateTitle}
          className="mono"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            margin: "0 9px 9px",
            padding: "6px 8px",
            borderRadius: 7,
            border: pt.chipBorder,
            background: pt.chipBg,
            color: pt.chipText,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: "pointer",
          }}
        >
          <Sparkles size={11} /> {estimateLabel}
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState(null); // { dataUrl, mediaType, base64 }
  // Quand une estimation est lancée depuis une annonce déjà en ligne (bouton
  // "Estimer" sur une carte de résultat) plutôt que depuis une photo prise
  // par l'utilisateur: on garde ici le titre/prix/source/lien de cette
  // annonce d'origine, pour sauter l'étape d'identification par photo et
  // pour rappeler à l'IA de prix que ce prix affiché n'est pas forcément un
  // prix de vente réel.
  const [listingSeed, setListingSeed] = useState(null); // { title, price, sourcePlatform, link, image, category }
  const [details, setDetails] = useState(""); // précisions manuelles optionnelles
  const [status, setStatus] = useState("idle"); // idle | analyzing | pricing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [resultTab, setResultTab] = useState("estimation"); // estimation | statistiques
  const [trendRange, setTrendRange] = useState("5a"); // période affichée sur la courbe de tendance
  const [correctionOpen, setCorrectionOpen] = useState(false); // affiche le champ "corriger un détail"
  const [correctionInput, setCorrectionInput] = useState(""); // texte de la correction en cours de saisie
  const [adText, setAdText] = useState(null); // { titre, description } | null — annonce générée par l'IA
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState(null);
  const [adCopied, setAdCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState(null); // null | "generating" | "downloaded"
  const [referralCopied, setReferralCopied] = useState(false);

  function referralLink() {
    if (!user) return "";
    return `${window.location.origin}/?ref=${user.id.slice(0, 8)}`;
  }
  function copyReferralLink() {
    const link = referralLink();
    if (!link) return;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setReferralCopied(true);
        setTimeout(() => setReferralCopied(false), 2000);
      })
      .catch(() => {});
  }
  async function shareReferralLink() {
    const link = referralLink();
    if (!link) return;
    const text = "Estime la valeur de revente de tes objets en une photo avec estim' !";
    if (navigator.share) {
      try {
        await navigator.share({ title: "estim'", text, url: link });
      } catch (e) {}
    } else {
      copyReferralLink();
    }
  }
  const [adGenCount, setAdGenCount] = useState(0); // nb de générations/régénérations d'annonce pour l'estimation en cours (max 3, pour éviter un abus d'appels IA gratuits)
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

  // Abonnement / quota (rempli depuis la table "profiles", tenue à jour
  // côté serveur par le Worker via les webhooks Stripe).
  const [profile, setProfile] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState(null);
  const [adWatching, setAdWatching] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // clé du plan en cours de traitement
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "plan, subscription_status, quota_mensuel, estimations_utilisees, gratuit_utilisees, gratuit_pubs_vues, bonus_pub_disponible, stripe_customer_id, pseudo, avatar_skin, avatar_hair_style, avatar_hair_color, avatar_top_color, avatar_accessory, avatar_gender"
      )
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) setProfile(data);
  }

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user]);

  // Vérifie et consomme un crédit d'estimation côté serveur (impossible à
  // tricher depuis le navigateur). Renvoie {allowed: true} si l'estimation
  // peut continuer, sinon {allowed: false, ...} avec de quoi afficher le
  // paywall (quota épuisé, offre de pub bonus, etc.).
  async function checkQuota(watchedAd = false) {
    const { data, error } = await supabase.rpc("consume_estimation", { p_watched_ad: watchedAd });
    if (user) loadProfile(user.id);
    if (error) {
      return { allowed: false, reason: "erreur", message: error.message };
    }
    return data;
  }

  async function startCheckout(planKey) {
    if (!user) return;
    setCheckoutLoading(planKey);
    try {
      const res = await fetch(PROXY_URL + "/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          user_id: user.id,
          email: user.email,
          return_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Erreur lors de la création du paiement.");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setPaywallInfo((prev) => ({ ...(prev || {}), message: e.message || "Erreur lors de la création du paiement." }));
      setCheckoutLoading(null);
    }
  }

  async function openBillingPortal() {
    if (!user) return;
    setPortalLoading(true);
    try {
      const res = await fetch(PROXY_URL + "/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, return_url: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Erreur lors de l'ouverture du portail.");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur lors de l'ouverture du portail d'abonnement.");
      setPortalLoading(false);
    }
  }

  // Pas encore de vraie régie publicitaire branchée: simulation d'un
  // visionnage de pub (3 secondes) qui débloque ensuite le bonus/crédit
  // gratuit côté serveur, exactement comme le ferait une vraie pub validée.
  async function watchAdForBonus() {
    setAdWatching(true);
    await new Promise((r) => setTimeout(r, 3000));
    const quota = await checkQuota(true);
    setAdWatching(false);
    if (quota.allowed) {
      setShowPaywall(false);
      setPaywallInfo(null);
      await runEstimationCore();
    } else {
      setPaywallInfo(quota);
    }
  }

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

  // Menu principal (☰) : historique, recherche produit, tendances,
  // abonnement, contact, langue, déconnexion.
  const [showMenu, setShowMenu] = useState(false);

  // Langue de l'interface (persistée localement) — volet de traduction
  // volontairement limité, voir TRANSLATIONS plus haut.
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("estim_lang") || "fr";
    } catch (e) {
      return "fr";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("estim_lang", lang);
    } catch (e) {}
  }, [lang]);
  function t(key) {
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
  }

  // Nombre total d'estimations jamais réalisées (à vie, ne redescend
  // jamais même si l'historique visible est limité ou vidé) — sert à
  // débloquer les "habillages" (bronze/argent/or/diamant). Mis en cache en
  // local et recalé sur Supabase (comptage exact) à la connexion, en
  // gardant toujours le plus grand des deux valeurs.
  const [lifetimeEstimations, setLifetimeEstimations] = useState(() => {
    try {
      return parseInt(localStorage.getItem("estim_lifetime_count") || "0", 10) || 0;
    } catch (e) {
      return 0;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("estim_lifetime_count", String(lifetimeEstimations));
    } catch (e) {}
  }, [lifetimeEstimations]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count, error } = await supabase
        .from("estimations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!error && typeof count === "number") {
        setLifetimeEstimations((prev) => Math.max(prev, count));
      }
    })();
  }, [user]);

  function gradeForCount(n) {
    let g = GRADES[0];
    for (const gr of GRADES) {
      if (n >= gr.threshold) g = gr;
    }
    return g;
  }
  const highestUnlockedGrade = gradeForCount(lifetimeEstimations);
  const nextGrade = GRADES.find((g) => g.threshold > lifetimeEstimations) || null;

  // Palier choisi par l'utilisateur (peut revenir à un palier déjà débloqué
  // moins "haut" s'il préfère ce style) — bascule automatiquement sur le
  // tout dernier palier débloqué dès qu'un nouveau seuil est franchi, avec
  // un petit message de félicitations.
  const [selectedGradeKey, setSelectedGradeKey] = useState(() => {
    try {
      return localStorage.getItem("estim_grade") || null;
    } catch (e) {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (selectedGradeKey) localStorage.setItem("estim_grade", selectedGradeKey);
    } catch (e) {}
  }, [selectedGradeKey]);
  const prevGradeKeyRef = useRef(highestUnlockedGrade.key);
  const [gradeUnlockToast, setGradeUnlockToast] = useState(null);
  useEffect(() => {
    if (highestUnlockedGrade.key !== prevGradeKeyRef.current) {
      prevGradeKeyRef.current = highestUnlockedGrade.key;
      if (highestUnlockedGrade.key !== "defaut") {
        setSelectedGradeKey(highestUnlockedGrade.key);
        setGradeUnlockToast(highestUnlockedGrade);
        setTimeout(() => setGradeUnlockToast(null), 5000);
      }
    }
  }, [highestUnlockedGrade.key]);

  // Exception personnelle (compte de Dylan uniquement) : peut sélectionner
  // n'importe quel habillage pour l'aperçu, même non débloqué. N'affecte que
  // le style affiché sur SON compte — le vrai compteur/seuils de déblocage
  // restent inchangés pour tout le monde (y compris pour lui).
  const isOwnerPreview = !!(user && user.email && user.email.toLowerCase() === "dyloo999@gmail.com");

  const activeGrade =
    (selectedGradeKey &&
      GRADES.find((g) => g.key === selectedGradeKey && (g.threshold <= lifetimeEstimations || isOwnerPreview))) ||
    highestUnlockedGrade;
  const accent = activeGrade.accent;
  const accentDark = activeGrade.accentDark;
  const accentLight = activeGrade.accentLight;
  const accentRgb = hexToRgbString(activeGrade.accent);

  // Nombre total de générations (et régénérations) d'annonce jamais
  // demandées — sert à débloquer les "fonds" de couleur (même principe que
  // lifetimeEstimations pour les habillages, mais rien n'est persisté côté
  // Supabase ici : aucune table ne garde trace des générations d'annonce,
  // donc uniquement du local, propre à l'appareil).
  const [lifetimeAdGenerations, setLifetimeAdGenerations] = useState(() => {
    try {
      return parseInt(localStorage.getItem("estim_lifetime_adgen") || "0", 10) || 0;
    } catch (e) {
      return 0;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("estim_lifetime_adgen", String(lifetimeAdGenerations));
    } catch (e) {}
  }, [lifetimeAdGenerations]);

  function bgSkinForCount(n) {
    let b = BG_PROGRESSION[0];
    for (const sk of BG_PROGRESSION) {
      if (n >= sk.threshold) b = sk;
    }
    return b;
  }
  const highestUnlockedBgSkin = bgSkinForCount(lifetimeAdGenerations);
  const nextBgSkin = BG_PROGRESSION.find((sk) => sk.threshold > lifetimeAdGenerations) || null;

  const [selectedBgSkinKey, setSelectedBgSkinKey] = useState(() => {
    try {
      const stored = localStorage.getItem("estim_bg_skin");
      if (stored) return stored;
      // Migration : l'ancienne bascule fond sombre/clair du menu a fusionné
      // dans les "fonds" — qui avait choisi le fond clair garde "blanc".
      return localStorage.getItem("estim_menu_theme") === "light" ? "blanc" : null;
    } catch (e) {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (selectedBgSkinKey) localStorage.setItem("estim_bg_skin", selectedBgSkinKey);
    } catch (e) {}
  }, [selectedBgSkinKey]);
  const prevBgSkinKeyRef = useRef(highestUnlockedBgSkin.key);
  const [bgSkinUnlockToast, setBgSkinUnlockToast] = useState(null);
  useEffect(() => {
    if (highestUnlockedBgSkin.key !== prevBgSkinKeyRef.current) {
      prevBgSkinKeyRef.current = highestUnlockedBgSkin.key;
      if (highestUnlockedBgSkin.key !== "bleu") {
        setSelectedBgSkinKey(highestUnlockedBgSkin.key);
        setBgSkinUnlockToast(highestUnlockedBgSkin);
        setTimeout(() => setBgSkinUnlockToast(null), 5000);
      }
    }
  }, [highestUnlockedBgSkin.key]);

  const activeBgSkin =
    (selectedBgSkinKey &&
      BG_SKINS.find((sk) => sk.key === selectedBgSkinKey && (sk.threshold <= lifetimeAdGenerations || isOwnerPreview))) ||
    highestUnlockedBgSkin;
  // Utilisé pour le halo et les petits glyphes "incrustés" du palier
  // "platine" (voir header plus bas) — calculé une fois ici, indépendant
  // du système de halo existant (`activeGrade.glow`) lié aux habillages.
  const bgSkinAccentRgb = hexToRgbString(activeBgSkin.high);

  // Le thème clair/sombre est désormais entièrement dérivé du fond choisi
  // ("blanc" → light, tout le reste → dark) — il n'y a plus de bascule
  // séparée dans le menu, voir BG_SKINS plus haut.
  const menuTheme = activeBgSkin.mode;
  const pt = { ...(PANEL_THEMES[menuTheme] || PANEL_THEMES.dark) };
  // Fond de couleur débloqué : on ne retouche que les grandes surfaces
  // (page, panneaux, header, carte résultat, écran de chargement, zone
  // photo) — "bleu" et "blanc" restent strictement identiques à avant.
  if (activeBgSkin.key !== "bleu" && activeBgSkin.key !== "blanc") {
    pt.pageBg = activeBgSkin.base;
    pt.sheetBg = `linear-gradient(160deg, ${activeBgSkin.base} 0%, ${activeBgSkin.mid} 45%, ${activeBgSkin.high} 100%)`;
    pt.headerBg = `linear-gradient(135deg, #04060C 0%, ${activeBgSkin.mid} 52%, ${activeBgSkin.high} 100%)`;
    pt.resultCardBg = pt.headerBg;
    pt.loadingBg = `linear-gradient(160deg, ${activeBgSkin.high} 0%, ${activeBgSkin.mid} 100%)`;
    pt.loadingBorder = activeBgSkin.high;
    pt.dropZoneBg = `radial-gradient(circle at 50% 32%, ${activeBgSkin.mid} 0%, ${activeBgSkin.base} 72%)`;
  }
  // Le haut de l'appli (bandeau + poignée des panneaux) se termine toujours
  // sur l'accent actif: c'est ce qui donne l'impression que "tout change"
  // visuellement d'un palier à l'autre, sans toucher au fond navy/clair.
  pt.topBarGradient =
    menuTheme === "light"
      ? `linear-gradient(90deg, #D7DEE6 0%, #93A4BC 35%, ${accent} 100%)`
      : `linear-gradient(90deg, #152238 0%, #29394F 35%, ${accent} 100%)`;
  pt.grabBg =
    menuTheme === "light"
      ? `linear-gradient(90deg, #152238 0%, ${accent} 100%)`
      : `linear-gradient(90deg, rgba(255,255,255,0.4) 0%, ${accent} 100%)`;

  // "Rechercher un produit" : catégorie choisie puis recherche texte libre,
  // résultats = vraies annonces (image cliquable → lien direct vers
  // Leboncoin / Vinted / eBay), via le même moteur de recherche que le
  // reste de l'app (worker.js : /search-products).
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchCategory, setSearchCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // Tri des résultats : pertinence (ordre renvoyé) | prix croissant/décroissant
  // | plus récent (uniquement fiable pour Leboncoin, seule source à exposer
  // une vraie date de publication en recherche — voir searchLeboncoin dans
  // worker.js ; les annonces sans date connue sont reléguées en fin de liste).
  const [searchSort, setSearchSort] = useState("pertinence");
  const SEARCH_SORT_OPTIONS = [
    { key: "pertinence", label: "search_sort_relevance" },
    { key: "price_asc", label: "search_sort_price_asc" },
    { key: "price_desc", label: "search_sort_price_desc" },
    { key: "date_desc", label: "search_sort_date" },
  ];
  function sortSearchItems(items) {
    const arr = [...items];
    if (searchSort === "price_asc") {
      arr.sort((a, b) => (a.extracted_price ?? Infinity) - (b.extracted_price ?? Infinity));
    } else if (searchSort === "price_desc") {
      arr.sort((a, b) => (b.extracted_price ?? -Infinity) - (a.extracted_price ?? -Infinity));
    } else if (searchSort === "date_desc") {
      arr.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : -Infinity;
        const db = b.date ? new Date(b.date).getTime() : -Infinity;
        return db - da;
      });
    }
    return arr;
  }

  async function runProductSearch(query) {
    const q = (query || "").trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(PROXY_URL + "/search-products?q=" + encodeURIComponent(q));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de recherche.");
      setSearchResults(data);
    } catch (e) {
      console.error(e);
      setSearchError(e.message || t("search_error"));
    } finally {
      setSearchLoading(false);
    }
  }

  // Tendances PAR CATÉGORIE (dans "Rechercher un produit", affiché tant que
  // l'utilisateur n'a pas lancé sa propre recherche texte) — même principe
  // que "Produits du moment" mais restreint à la catégorie choisie
  // (worker.js : /trending-category). Mis en cache ici par clé de catégorie
  // pour éviter de recharger si l'utilisateur navigue entre catégories.
  const [catTrendingCache, setCatTrendingCache] = useState({}); // { [catKey]: items[] }
  const [catTrendingLoadingKey, setCatTrendingLoadingKey] = useState(null);
  const [catTrendingError, setCatTrendingError] = useState(null);

  async function loadCategoryTrending(cat) {
    if (!cat || catTrendingCache[cat.key] || catTrendingLoadingKey === cat.key) return;
    setCatTrendingLoadingKey(cat.key);
    setCatTrendingError(null);
    try {
      const res = await fetch(PROXY_URL + "/trending-category?cat=" + encodeURIComponent(cat.key));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
      setCatTrendingCache((prev) => ({ ...prev, [cat.key]: data.items || [] }));
    } catch (e) {
      console.error(e);
      setCatTrendingError(e.message || "Erreur de chargement.");
    } finally {
      setCatTrendingLoadingKey(null);
    }
  }
  useEffect(() => {
    if (searchCategory) loadCategoryTrending(searchCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCategory]);

  // "Produits du moment" : sélection IA des annonces les plus vues,
  // rafraîchie côté serveur toutes les 12h (worker.js : /trending).
  const [showTrending, setShowTrending] = useState(false);
  const [trendingItems, setTrendingItems] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState(null);
  // Pagination côté front — la liste renvoyée par le serveur est déjà
  // classée des produits les plus demandés aux moins demandés (voir
  // handleTrending dans worker.js), on la découpe simplement par pages.
  const [trendingPage, setTrendingPage] = useState(1);
  const TRENDING_PAGE_SIZE = 12;

  async function loadTrending() {
    if (trendingItems !== null || trendingLoading) return;
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const res = await fetch(PROXY_URL + "/trending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
      setTrendingItems(data.items || []);
      setTrendingPage(1);
    } catch (e) {
      console.error(e);
      setTrendingError(e.message || "Erreur de chargement.");
    } finally {
      setTrendingLoading(false);
    }
  }

  // "Classement" : nombre d'estimations et nombre d'annonces générées,
  // chacun en "ce mois-ci" et "total" — 4 combinaisons, calculées côté
  // Supabase (fonctions leaderboard_estimations / leaderboard_ad_generations,
  // voir supabase_schema.sql) et mises en cache ici par combinaison pour
  // éviter de recharger à chaque changement d'onglet.
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState("estimations"); // estimations | annonces
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("month"); // month | total
  const [leaderboardCache, setLeaderboardCache] = useState({}); // { "estimations:month": [...] }
  const [leaderboardLoadingKey, setLeaderboardLoadingKey] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [pseudoInput, setPseudoInput] = useState("");
  const [pseudoSaving, setPseudoSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState(null);
  const [pseudoSavedFlash, setPseudoSavedFlash] = useState(false);

  async function loadLeaderboard(type, period, limit = 20) {
    const cacheKey = `${type}:${period}:${limit}`;
    if (leaderboardCache[cacheKey] || leaderboardLoadingKey === cacheKey) return;
    setLeaderboardLoadingKey(cacheKey);
    setLeaderboardError(null);
    try {
      const fn = type === "annonces" ? "leaderboard_ad_generations" : "leaderboard_estimations";
      const { data, error } = await supabase.rpc(fn, { p_period: period, p_limit: limit });
      if (error) throw new Error(error.message);
      setLeaderboardCache((prev) => ({ ...prev, [cacheKey]: data || [] }));
    } catch (e) {
      console.error(e);
      setLeaderboardError(e.message || "Erreur de chargement.");
    } finally {
      setLeaderboardLoadingKey(null);
    }
  }
  useEffect(() => {
    if (showLeaderboard) loadLeaderboard(leaderboardType, leaderboardPeriod, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLeaderboard, leaderboardType, leaderboardPeriod]);
  useEffect(() => {
    if (showLeaderboard) setPseudoInput((profile && profile.pseudo) || "");
  }, [showLeaderboard, profile]);
  // Panneau "Avatar" — état d'ouverture déclaré ici (tôt) car le prochain
  // effet en a besoin dans son tableau de dépendances ; le reste de l'état
  // de l'avatar (peau/coiffure/couleurs/accessoire) est déclaré plus bas,
  // juste après AVATAR_WARDROBE dont il dépend.
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  // Panneau "Profil" — connexion/compte + accès à l'avatar, ouvert depuis
  // l'icône en haut à droite du header (plus dans le menu hamburger).
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  // Vérifie si l'utilisateur figure ACTUELLEMENT dans le top 100 du
  // classement total des estimations — sert au déblocage de l'accessoire
  // "médaille" le plus rare de l'avatar (voir WARDROBE plus bas). Version
  // volontairement simplifiée ("top 100 en ce moment") plutôt qu'un vrai
  // suivi "3 mois d'affilée", qui demanderait une tâche planifiée côté
  // serveur pour enregistrer un historique mensuel — non fait pour l'instant.
  useEffect(() => {
    if (showAvatarPanel && user) loadLeaderboard("estimations", "total", 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAvatarPanel, user]);
  const top100TotalRows = leaderboardCache["estimations:total:100"];
  const isTop100Total = !!(user && top100TotalRows && top100TotalRows.some((r) => r.user_id === user.id));

  const PSEUDO_ERROR_LABELS = {
    longueur_invalide: "3 à 20 caractères.",
    caracteres_invalides: "Lettres, chiffres, espaces, apostrophes et tirets uniquement.",
    deja_pris: "Ce pseudo est déjà pris.",
    profil_introuvable: "Connecte-toi pour choisir un pseudo.",
  };
  async function savePseudo() {
    if (!user || pseudoSaving) return;
    const value = pseudoInput.trim();
    if (!value) return;
    setPseudoSaving(true);
    setPseudoError(null);
    try {
      const { data, error } = await supabase.rpc("set_pseudo", { p_pseudo: value });
      if (error) throw new Error(error.message);
      if (data && data.ok) {
        setProfile((prev) => (prev ? { ...prev, pseudo: data.pseudo } : prev));
        setPseudoSavedFlash(true);
        setTimeout(() => setPseudoSavedFlash(false), 2500);
        // Le pseudo peut avoir changé le classement (nouvel affichage) —
        // on vide le cache pour forcer un rechargement à la prochaine vue.
        setLeaderboardCache({});
      } else {
        setPseudoError(PSEUDO_ERROR_LABELS[data && data.reason] || "Erreur, réessaie.");
      }
    } catch (e) {
      console.error(e);
      setPseudoError("Erreur, réessaie.");
    } finally {
      setPseudoSaving(false);
    }
  }

  // "Abonnement" (accessible à tout moment depuis le menu, pas seulement
  // quand le quota est épuisé) et "Contact" (mail de support statique).
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [showContact, setShowContact] = useState(false);
  // "Affichage" (Habillage + Fonds) : auparavant toujours déplié directement
  // dans le menu (prenait beaucoup de place) — maintenant un panneau à part,
  // masqué comme les autres entrées du menu (historique, classement, etc.).
  const [showDisplayPanel, setShowDisplayPanel] = useState(false);

  // "Ma collection" (panneau) : juste l'état d'ouverture ici — les calculs
  // (valeur totale, badges, streak...) sont plus bas, une fois `history`
  // déclaré (ils en dépendent directement).
  const [showCollection, setShowCollection] = useState(false);
  // Détail des objets scannés, triés du plus cher au moins cher — ouvert en
  // tapant sur le compteur "Objets scannés" dans "Ma collection".
  const [showScannedObjectsList, setShowScannedObjectsList] = useState(false);
  const isPremiumPlan = !!(profile && profile.plan !== "gratuit" && profile.subscription_status === "active");

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

  // "Ma collection" : panneau gamification/portefeuille (valeur totale,
  // badges, streak, courbe de valeur dans le temps) — calculé côté client à
  // partir de l'historique existant, pas de nouvel appel serveur. Doit
  // rester APRÈS la déclaration de `history` juste au-dessus (dépend
  // directement dessus).
  // On exclut les estimations "humour" (être vivant: humain/animal — voir
  // `type_sujet === "etre_vivant"` dans runEstimationCore, qui génère un
  // prix volontairement fictif marqué `confiance: "humour"`) des calculs
  // de valeur de la collection : ce ne sont pas des objets réellement
  // estimés, leur prix n'a aucun sens à additionner avec de vraies estimations.
  const numericHistory = history.filter(
    (h) => typeof h.prix_bas === "number" && typeof h.prix_haut === "number" && h.date && h.confiance !== "humour"
  );
  // Nombre d'objets réellement scannés pour la carte "Objets scannés" de
  // "Ma collection" — même exclusion des estimations "humour" que ci-dessus,
  // pour ne jamais compter un humain/animal comme un objet.
  const scannedObjectsCount = history.filter((h) => h.confiance !== "humour").length;
  const portfolioValue = numericHistory.reduce((sum, h) => sum + (h.prix_bas + h.prix_haut) / 2, 0);
  const portfolioBestFind = numericHistory.reduce(
    (best, h) => Math.max(best, (h.prix_bas + h.prix_haut) / 2),
    0
  );
  // Même liste d'objets réels, triée du plus cher au moins cher (prix moyen
  // = (prix_bas + prix_haut) / 2) — pour le détail affiché quand on tape sur
  // le compteur "Objets scannés" dans "Ma collection", afin de justifier la
  // "Valeur estimée" affichée juste à côté.
  const portfolioSortedByValueDesc = [...numericHistory].sort(
    (a, b) => (b.prix_bas + b.prix_haut) / 2 - (a.prix_bas + a.prix_haut) / 2
  );
  const portfolioSortedAsc = [...numericHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  let portfolioRunning = 0;
  const portfolioChartPoints = portfolioSortedAsc.map((h) => {
    portfolioRunning += (h.prix_bas + h.prix_haut) / 2;
    return {
      label: new Date(h.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      value: portfolioRunning,
    };
  });
  const portfolioStreak = (() => {
    const days = new Set(history.map((h) => new Date(h.date).toDateString()));
    let streak = 0;
    const cursor = new Date();
    while (days.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  })();
  // Le plus grand nombre d'estimations faites en une seule journée — pour le
  // badge "plusieurs estimations d'affilée dans la même journée" (distinct
  // du streak ci-dessus, qui compte des JOURS consécutifs).
  const portfolioMaxPerDay = (() => {
    const counts = {};
    history.forEach((h) => {
      if (!h.date) return;
      const key = new Date(h.date).toDateString();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.values(counts).reduce((m, c) => Math.max(m, c), 0);
  })();
  // Catalogue des badges/"gadgets" affichés dans "Ma collection" — en
  // faisant des estimations, en générant des annonces, en se connectant
  // plusieurs jours de suite, ou en enchaînant plusieurs estimations le même
  // jour. Distinct du catalogue d'habillage de l'avatar (AVATAR_WARDROBE plus
  // bas), qui réutilise les mêmes stats mais pour un tout autre usage
  // (coiffure/couleurs/accessoire du personnage, pas des icônes de badge).
  const COLLECTION_BADGES = [
    { id: "first", emoji: "🎉", label: "Premier scan", test: () => history.length >= 1 },
    { id: "five", emoji: "📸", label: "5 estimations", test: () => history.length >= 5 },
    { id: "ten", emoji: "🔥", label: "10 estimations", test: () => history.length >= 10 },
    { id: "fifty", emoji: "🏆", label: "50 estimations", test: () => history.length >= 50 },
    { id: "streak3", emoji: "⚡", label: "3 jours de suite", test: () => portfolioStreak >= 3 },
    { id: "streak7", emoji: "🌟", label: "7 jours de suite", test: () => portfolioStreak >= 7 },
    { id: "streak30", emoji: "👑", label: "30 jours de suite", test: () => portfolioStreak >= 30 },
    { id: "powerday5", emoji: "🚀", label: "5 estimations en 1 jour", test: () => portfolioMaxPerDay >= 5 },
    { id: "bigfind", emoji: "💰", label: "Trouvaille à +200 €", test: () => portfolioBestFind >= 200 },
    { id: "collector500", emoji: "📦", label: "Collection à 500 €", test: () => portfolioValue >= 500 },
    { id: "collector2000", emoji: "💎", label: "Collection à 2000 €", test: () => portfolioValue >= 2000 },
    { id: "adgen10", emoji: "📣", label: "10 annonces générées", test: () => lifetimeAdGenerations >= 10 },
    { id: "adgen50", emoji: "📢", label: "50 annonces générées", test: () => lifetimeAdGenerations >= 50 },
  ];

  // Panneau "Avatar" : un vrai petit personnage (tête + corps, façon Habbo)
  // à personnaliser — peau (toujours libre), coiffure, couleur de cheveux,
  // couleur de vêtement, et un accessoire (casquette/lunettes/loupe/
  // couronne/médaille...). Chaque option (hors peau) se débloque en
  // remplissant un défi (estimations, annonces générées, jours de suite,
  // classement...) — les mêmes règles pour tout le monde, gratuit ou abonné
  // (l'abonnement ne change que le quota d'estimations, pas l'avatar).
  // Accessible depuis le menu ET depuis "Classement" (à côté du pseudo).
  const AVATAR_WARDROBE = {
    hairStyle: [
      { id: "chauve", label: "Chauve", free: true },
      { id: "court", label: "Court", free: true },
      { id: "frange", label: "Frange", free: true },
      { id: "longs", label: "Longs", test: () => lifetimeEstimations >= 15, hint: "dès 15 estimations" },
      { id: "carre", label: "Carré", test: () => portfolioStreak >= 4, hint: "4 jours de suite" },
      { id: "boucles", label: "Bouclés", test: () => portfolioStreak >= 5, hint: "5 jours de suite" },
      { id: "queue", label: "Queue de cheval", test: () => lifetimeAdGenerations >= 15, hint: "15 annonces générées" },
      { id: "chignon", label: "Chignon", test: () => lifetimeEstimations >= 45, hint: "dès 45 estimations" },
      { id: "mohawk", label: "Mohawk", test: () => lifetimeEstimations >= 75, hint: "dès 75 estimations" },
      { id: "ondules", label: "Longs ondulés", test: () => lifetimeEstimations >= 200, hint: "dès 200 estimations" },
      { id: "afro", label: "Afro", test: () => lifetimeAdGenerations >= 30, hint: "30 annonces générées" },
    ],
    hairColor: [
      { id: "noir", hex: "#1A1A1A", label: "Noir", free: true },
      { id: "chatain", hex: "#5C3A21", label: "Châtain", free: true },
      { id: "blond", hex: "#D9B26F", label: "Blond", free: true },
      { id: "roux", hex: "#B5502A", label: "Roux", free: true },
      { id: "gris", hex: "#9CA3AF", label: "Gris", free: true },
      { id: "bleu", hex: "#3B82C4", label: "Bleu", test: () => portfolioStreak >= 7, hint: "7 jours de suite" },
      { id: "rose", hex: "#E85D9E", label: "Rose", test: () => lifetimeAdGenerations >= 40, hint: "40 annonces générées" },
      { id: "arcenciel", hex: "rainbow", label: "Arc-en-ciel", test: () => lifetimeEstimations >= 5000, hint: "dès 5000 estimations" },
    ],
    topColor: [
      { id: "gris", hex: "#5C6773", label: "Gris", free: true },
      { id: "blanc", hex: "#E9EDF2", label: "Blanc", free: true },
      { id: "marine", hex: "#29394F", label: "Marine", free: true },
      { id: "beige", hex: "#C9AD8F", label: "Beige", free: true },
      { id: "rouge", hex: "#B22B3A", label: "Rouge", test: () => lifetimeEstimations >= 10, hint: "dès 10 estimations" },
      { id: "vert", hex: "#17824C", label: "Vert", test: () => lifetimeEstimations >= 25, hint: "dès 25 estimations" },
      { id: "violet", hex: "#6D2FB0", label: "Violet", test: () => lifetimeAdGenerations >= 20, hint: "20 annonces générées" },
      { id: "jaune", hex: "#D4A017", label: "Jaune", test: () => portfolioBestFind >= 200, hint: "trouvaille à +200 €" },
      { id: "or", hex: "gold", label: "Doré", test: () => lifetimeEstimations >= 1000, hint: "dès 1000 estimations" },
    ],
    accessory: [
      { id: "aucun", label: "Aucun", free: true },
      { id: "bonnet", label: "Bonnet", test: () => lifetimeEstimations >= 5, hint: "dès 5 estimations" },
      { id: "bandeau", label: "Bandeau", test: () => portfolioStreak >= 3, hint: "3 jours de suite" },
      { id: "bandana", label: "Bandana", test: () => portfolioStreak >= 4, hint: "4 jours de suite" },
      { id: "casquette", label: "Casquette", test: () => lifetimeEstimations >= 20, hint: "dès 20 estimations" },
      { id: "lunettes", label: "Lunettes", test: () => lifetimeAdGenerations >= 10, hint: "10 annonces générées" },
      { id: "bijoux", label: "Boucles d'oreilles", test: () => lifetimeAdGenerations >= 15, hint: "15 annonces générées" },
      { id: "soleil", label: "Lunettes de soleil", test: () => lifetimeEstimations >= 35, hint: "dès 35 estimations" },
      { id: "foulard", label: "Foulard", test: () => lifetimeEstimations >= 60, hint: "dès 60 estimations" },
      { id: "loupe", label: "Loupe d'enquêteur", test: () => lifetimeEstimations >= 50, hint: "dès 50 estimations" },
      { id: "couronne", label: "Couronne", test: () => lifetimeEstimations >= 1000, hint: "dès 1000 estimations" },
      // Version simplifiée du défi "top 100 du mois, 3 mois d'affilée"
      // demandé : ici, être ACTUELLEMENT dans le top 100 du classement total
      // des estimations (voir isTop100Total plus haut) — un vrai suivi
      // "3 mois d'affilée" demanderait une tâche planifiée côté serveur pour
      // enregistrer un historique mensuel, pas encore en place.
      { id: "medaille", label: "Médaille top 100", test: () => isTop100Total, hint: "top 100 du classement" },
    ],
  };
  const AVATAR_DEFAULTS = {
    skin: AVATAR_SKIN_TONES[1],
    hairStyle: "court",
    hairColor: "noir",
    topColor: "gris",
    accessory: "aucun",
    gender: "homme",
  };
  function avatarWardrobeUnlocked(category, id) {
    const item = AVATAR_WARDROBE[category].find((it) => it.id === id);
    return !!item && (item.free || item.test());
  }
  const [avatarSkinInput, setAvatarSkinInput] = useState(AVATAR_DEFAULTS.skin);
  const [avatarHairStyleInput, setAvatarHairStyleInput] = useState(AVATAR_DEFAULTS.hairStyle);
  const [avatarHairColorInput, setAvatarHairColorInput] = useState(AVATAR_DEFAULTS.hairColor);
  const [avatarTopColorInput, setAvatarTopColorInput] = useState(AVATAR_DEFAULTS.topColor);
  const [avatarAccessoryInput, setAvatarAccessoryInput] = useState(AVATAR_DEFAULTS.accessory);
  const [avatarGenderInput, setAvatarGenderInput] = useState(AVATAR_DEFAULTS.gender);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarSavedFlash, setAvatarSavedFlash] = useState(false);
  useEffect(() => {
    if (showAvatarPanel) {
      setAvatarSkinInput((profile && profile.avatar_skin) || AVATAR_DEFAULTS.skin);
      setAvatarHairStyleInput((profile && profile.avatar_hair_style) || AVATAR_DEFAULTS.hairStyle);
      setAvatarHairColorInput((profile && profile.avatar_hair_color) || AVATAR_DEFAULTS.hairColor);
      setAvatarTopColorInput((profile && profile.avatar_top_color) || AVATAR_DEFAULTS.topColor);
      setAvatarAccessoryInput((profile && profile.avatar_accessory) || AVATAR_DEFAULTS.accessory);
      setAvatarGenderInput((profile && profile.avatar_gender) || AVATAR_DEFAULTS.gender);
      setAvatarError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAvatarPanel, profile]);
  // isOwnerPreview (défini plus haut, pour l'habillage/les fonds) permet
  // aussi à ce compte d'essayer — sans réellement les débloquer pour de
  // vrai — toutes les coiffures/couleurs/accessoires de l'avatar, à titre
  // exceptionnel, exactement comme pour l'habillage et les fonds.
  function pickAvatarItem(category, id) {
    if (!avatarWardrobeUnlocked(category, id) && !isOwnerPreview) return;
    if (category === "hairStyle") setAvatarHairStyleInput(id);
    else if (category === "hairColor") setAvatarHairColorInput(id);
    else if (category === "topColor") setAvatarTopColorInput(id);
    else if (category === "accessory") setAvatarAccessoryInput(id);
  }
  function avatarSwatchBg(hex) {
    if (hex === "rainbow") return "linear-gradient(135deg, #FF5C7A 0%, #FFC85C 25%, #5CE87A 50%, #5CB8FF 75%, #C05CFF 100%)";
    if (hex === "gold") return "linear-gradient(135deg, #F6D978 0%, #D4A017 50%, #96700D 100%)";
    return hex;
  }
  const avatarHairColorHex = (AVATAR_WARDROBE.hairColor.find((h) => h.id === avatarHairColorInput) || {}).hex || "#1A1A1A";
  const avatarTopColorHex = (AVATAR_WARDROBE.topColor.find((h) => h.id === avatarTopColorInput) || {}).hex || "#5C6773";
  const avatarDirty =
    !!profile &&
    (avatarSkinInput !== (profile.avatar_skin || AVATAR_DEFAULTS.skin) ||
      avatarHairStyleInput !== (profile.avatar_hair_style || AVATAR_DEFAULTS.hairStyle) ||
      avatarHairColorInput !== (profile.avatar_hair_color || AVATAR_DEFAULTS.hairColor) ||
      avatarTopColorInput !== (profile.avatar_top_color || AVATAR_DEFAULTS.topColor) ||
      avatarAccessoryInput !== (profile.avatar_accessory || AVATAR_DEFAULTS.accessory) ||
      avatarGenderInput !== (profile.avatar_gender || AVATAR_DEFAULTS.gender));
  async function saveAvatar() {
    if (!user || avatarSaving) return;
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      const { data, error } = await supabase.rpc("set_avatar", {
        p_skin: avatarSkinInput,
        p_hair_style: avatarHairStyleInput,
        p_hair_color: avatarHairColorInput,
        p_top_color: avatarTopColorInput,
        p_accessory: avatarAccessoryInput,
        p_gender: avatarGenderInput,
      });
      if (error) throw new Error(error.message);
      if (data && data.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatar_skin: data.avatar_skin,
                avatar_hair_style: data.avatar_hair_style,
                avatar_hair_color: data.avatar_hair_color,
                avatar_top_color: data.avatar_top_color,
                avatar_accessory: data.avatar_accessory,
                avatar_gender: data.avatar_gender,
              }
            : prev
        );
        setAvatarSavedFlash(true);
        setTimeout(() => setAvatarSavedFlash(false), 2500);
        // L'avatar peut avoir changé l'affichage du classement — on vide le
        // cache pour forcer un rechargement à la prochaine vue.
        setLeaderboardCache({});
      } else {
        setAvatarError("Erreur, réessaie.");
      }
    } catch (e) {
      console.error(e);
      setAvatarError("Erreur, réessaie.");
    } finally {
      setAvatarSaving(false);
    }
  }

  // Bloc connexion / compte (email+mot de passe, lien magique, plan,
  // parrainage, mot de passe) — affiché dans le panneau "Profil" (icône en
  // haut à droite du header). Simple fonction plutôt qu'un composant séparé :
  // elle lit l'état du composant App() par fermeture, pas de props/hooks.
  function renderAccountBlock() {
    return (
      <div
        style={{
          background: pt.rowBg,
          border: pt.rowBorder,
          borderRadius: 3,
          padding: 12,
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
              <div style={{ fontSize: 12, color: pt.rowText }}>
                Connecté : <strong>{user.email}</strong>
                <div className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 2 }}>
                  historique illimité, synchronisé
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={() => {
                  signOut();
                  setShowProfilePanel(false);
                }}
                style={{ flexShrink: 0 }}
              >
                <LogOut size={14} /> déconnexion
              </button>
            </div>

            {profile && (
              <div style={{ borderTop: pt.dashedBorder, marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: pt.rowText }}>
                    Plan :{" "}
                    <strong>
                      {profile.plan !== "gratuit" && profile.subscription_status === "active"
                        ? PLANS.find((p) => p.key === profile.plan)?.label || profile.plan
                        : "Gratuit"}
                    </strong>
                    <div className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 2 }}>
                      {profile.plan !== "gratuit" && profile.subscription_status === "active"
                        ? `${Math.max(0, profile.quota_mensuel - profile.estimations_utilisees)}/${profile.quota_mensuel} estimations restantes ce mois`
                        : `${Math.max(0, 3 - profile.gratuit_utilisees)} estimation(s) gratuite(s) restante(s) ce mois`}
                    </div>
                  </div>
                  {profile.stripe_customer_id ? (
                    <button
                      className="btn-ghost"
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      style={{ flexShrink: 0 }}
                    >
                      <CreditCard size={14} /> {portalLoading ? "…" : "gérer"}
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setPaywallInfo(null);
                        setShowPaywall(true);
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      <Sparkles size={14} /> s'abonner
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Créer/personnaliser l'avatar : juste en dessous des infos de
                compte, comme demandé, accessible d'un tap depuis ce même
                panneau "Profil". */}
            <div style={{ borderTop: pt.dashedBorder, marginTop: 10, paddingTop: 10 }}>
              <button
                onClick={() => {
                  setShowProfilePanel(false);
                  setShowAvatarPanel(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  background: `rgba(${accentRgb}, 0.1)`,
                  border: `1px solid rgba(${accentRgb}, 0.3)`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <AvatarSVG
                  skin={(profile && profile.avatar_skin) || AVATAR_DEFAULTS.skin}
                  hairStyle={(profile && profile.avatar_hair_style) || AVATAR_DEFAULTS.hairStyle}
                  hairColor={
                    (AVATAR_WARDROBE.hairColor.find((h) => h.id === ((profile && profile.avatar_hair_color) || AVATAR_DEFAULTS.hairColor)) || {}).hex ||
                    "#1A1A1A"
                  }
                  topColor={
                    (AVATAR_WARDROBE.topColor.find((h) => h.id === ((profile && profile.avatar_top_color) || AVATAR_DEFAULTS.topColor)) || {}).hex ||
                    "#5C6773"
                  }
                  accessory={(profile && profile.avatar_accessory) || AVATAR_DEFAULTS.accessory}
                  gender={(profile && profile.avatar_gender) || AVATAR_DEFAULTS.gender}
                  size={34}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: pt.rowText }}>
                    {profile && profile.avatar_hair_style ? "Personnaliser mon avatar" : "Créer mon avatar"}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: pt.subText }}>
                    corps, coiffure, couleurs, accessoires à débloquer
                  </span>
                </span>
                <ChevronRight size={14} color={pt.chevronColor} />
              </button>
            </div>

            <div style={{ borderTop: pt.dashedBorder, marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Gift size={14} color={accent} />
                <span style={{ fontSize: 12, fontWeight: 600, color: pt.rowText }}>Parraine un ami</span>
              </div>
              <p style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 8 }}>
                Partage ton lien avec un proche pour lui faire découvrir estim'.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-ghost" onClick={shareReferralLink} style={{ flex: 1, justifyContent: "center" }}>
                  <Share2 size={14} /> partager mon lien
                </button>
                <button className="btn-ghost" onClick={copyReferralLink} style={{ flexShrink: 0 }} aria-label="copier le lien">
                  {referralCopied ? "copié !" : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ borderTop: pt.dashedBorder, marginTop: 10, paddingTop: 10 }}>
              {passwordStatus === "done" ? (
                <p style={{ fontSize: 12, color: pt.rowText, margin: 0 }}>
                  Mot de passe défini ! Tu peux maintenant l'utiliser pour te connecter.
                </p>
              ) : (
                <div>
                  <p style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 6 }}>
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
                          border: pt.inputBorder,
                          background: pt.inputBg,
                          color: pt.inputText,
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
                    <p style={{ fontSize: 11, color: accent, marginTop: 6, marginBottom: 0 }}>
                      {passwordError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : authStatus === "sent" ? (
          <p style={{ fontSize: 12, color: pt.rowText, margin: 0 }}>
            Lien envoyé ! Vérifie ta boîte mail ({authEmail}) et clique dessus pour te connecter.
          </p>
        ) : authStatus === "signup_sent" ? (
          <p style={{ fontSize: 12, color: pt.rowText, margin: 0 }}>
            Compte créé ! Vérifie ta boîte mail ({authEmail}) et clique sur le lien de confirmation pour
            activer ton compte, puis reviens te connecter avec ton mot de passe.
          </p>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: pt.rowText, marginTop: 0, marginBottom: 8 }}>
              Connecte-toi pour sauvegarder ton historique, débloquer ton avatar personnalisable et apparaître au classement (optionnel).
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
                border: pt.inputBorder,
                background: pt.inputBg,
                color: pt.inputText,
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
                  border: pt.inputBorder,
                  background: pt.inputBg,
                  color: pt.inputText,
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
                color: pt.subText,
                fontSize: 11,
              }}
            >
              <div style={{ flex: 1, height: 1, background: pt.rowBorder.replace("1px solid ", "") }} />
              ou
              <div style={{ flex: 1, height: 1, background: pt.rowBorder.replace("1px solid ", "") }} />
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
              <p style={{ fontSize: 11, color: accent, marginTop: 6, marginBottom: 0 }}>{authError}</p>
            )}
          </div>
        )}
      </div>
    );
  }

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
    // Compte à vie pour les paliers d'habillage (bronze/argent/or/diamant) —
    // jamais décrémenté, y compris si l'historique est ensuite vidé.
    setLifetimeEstimations((prev) => prev + 1);
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
    setResultTab("estimation");
    setCorrectionOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
    setStatus("idle");
    setListingSeed(null); // on repart d'une vraie photo, plus d'une annonce

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

  async function callClaude(messages, model = "claude-sonnet-4-6", temperature) {
    let res;
    try {
      const body = { model, max_tokens: 1000, messages };
      if (typeof temperature === "number") body.temperature = temperature;
      res = await fetch(PROXY_URL + "/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // Interroge le serveur relais /prices-multi (Leboncoin + Vinted + eBay en
  // parallèle) pour une requête donnée. Renvoie les résultats bruts par
  // plateforme (liste vide si rien de concluant — pas d'exception ici).
  async function fetchRealListingsOnce(query) {
    const url = PROXY_URL + "/prices-multi?q=" + encodeURIComponent(query);
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
    const pickResults = (entry) => ((entry && entry.results) || []).slice(0, 15);
    const bySource = {
      leboncoin: pickResults(data.leboncoin),
      vinted: pickResults(data.vinted),
      ebay: pickResults(data.ebay),
      ebaySold: pickResults(data.ebaySold),
    };
    const errors = {
      leboncoin: (data.leboncoin && data.leboncoin.error) || null,
      vinted: (data.vinted && data.vinted.error) || null,
      ebay: (data.ebay && data.ebay.error) || null,
      ebaySold: (data.ebaySold && data.ebaySold.error) || null,
    };
    const total =
      bySource.leboncoin.length + bySource.vinted.length + bySource.ebay.length + bySource.ebaySold.length;
    return { bySource, errors, total };
  }

  // Deux tentatives: d'abord le terme identifié tel quel, puis en repli
  // avec "occasion" ajouté si la première ne renvoie rien du tout.
  async function fetchRealListings(query) {
    const first = await fetchRealListingsOnce(query);
    if (first.total >= 1) return { ...first, queryUsed: query };

    const second = await fetchRealListingsOnce(query + " occasion");
    return { ...second, queryUsed: query + " occasion" };
  }

  // Point d'entrée du bouton "Estimer": vérifie/consomme le quota côté
  // serveur avant de dépenser un appel IA. runEstimationCore() ci-dessous
  // contient l'estimation elle-même (inchangée) et est aussi appelée
  // directement après le visionnage d'une pub bonus, puisque le crédit est
  // alors déjà consommé par checkQuota(true).
  async function estimate(detailsOverride) {
    if (!image && !listingSeed) return;
    setError(null);
    if (!user) {
      setError("Connecte-toi pour lancer une estimation (3 gratuites par mois, sans carte bancaire).");
      setShowHistory(true);
      return;
    }
    const quota = await checkQuota(false);
    if (!quota.allowed) {
      setPaywallInfo(quota);
      setShowPaywall(true);
      return;
    }
    await runEstimationCore(detailsOverride);
  }

  // Point d'entrée du bouton "Estimer" affiché sur une carte de résultat
  // (Rechercher un produit / Produits du moment): au lieu de partir d'une
  // photo, on part d'une annonce déjà en ligne (titre, prix demandé,
  // plateforme). On ferme tous les panneaux de menu ouverts pour révéler
  // l'écran principal (même écran de résultat qu'une estimation photo),
  // on mémorise l'annonce d'origine dans listingSeed, et on lance
  // directement runEstimationCore — en lui passant l'annonce en paramètre
  // plutôt que de compter sur le state "listingSeed"/"image" (qui ne
  // seraient pas encore à jour à ce point à cause du batching de React).
  async function estimateFromListing(item) {
    if (!item) return;
    setError(null);
    if (!user) {
      setError("Connecte-toi pour lancer une estimation (3 gratuites par mois, sans carte bancaire).");
      setShowHistory(true);
      return;
    }
    const quota = await checkQuota(false);
    if (!quota.allowed) {
      setPaywallInfo(quota);
      setShowPaywall(true);
      return;
    }

    setShowMenu(false);
    setShowProductSearch(false);
    setShowTrending(false);
    setShowSubscriptionPanel(false);
    setShowContact(false);
    setDetails("");
    setResult(null);
    setResultTab("estimation");
    setCorrectionOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);

    const seed = {
      title: item.title || "",
      price:
        typeof item.extracted_price === "number" && item.extracted_price > 0 ? item.extracted_price : null,
      sourcePlatform: item.source || null,
      link: item.link || null,
      image: item.image || null,
      category: (searchCategory && searchCategory.label) || null,
      // true quand on relance une estimation depuis "Mes Estim'" (bouton
      // "Réestimer") plutôt que depuis une vraie annonce en ligne — sert
      // juste à adapter le petit badge affiché sur la carte de résultat.
      fromHistory: !!item.fromHistory,
    };
    setListingSeed(seed);
    setImage({ dataUrl: item.image || null, mediaType: null, base64: null, debug: null });

    await runEstimationCore("", seed);
  }

  // Relance une estimation à partir d'une entrée déjà dans l'historique, pour
  // voir si le prix a bougé depuis — un substitut léger à une vraie alerte de
  // prix automatique (pas d'infra de notifications push côté serveur).
  async function reestimateFromHistory(h) {
    setShowHistory(false);
    await estimateFromListing({
      title: h.objet,
      extracted_price: null,
      source: null,
      link: null,
      image: h.image,
      fromHistory: true,
    });
  }

  // Permet de corriger un détail après coup (ex: l'IA a estimé "grande
  // taille" alors que c'est une petite peluche) sans reprendre de photo:
  // on ajoute la précision au texte existant et on relance une estimation
  // complète (nouvelle identification + nouvelle recherche de prix), pour
  // que le prix reste cohérent avec le détail corrigé. Consomme un crédit
  // d'estimation comme un nouvel essai, via estimate().
  async function applyCorrection() {
    const text = correctionInput.trim();
    if (!text) return;
    const merged = (details.trim() ? details.trim() + " " : "") + text;
    setDetails(merged);
    setCorrectionInput("");
    setCorrectionOpen(false);
    await estimate(merged);
  }

  // Génère un titre + une description prêts à coller sur Leboncoin/Vinted/
  // eBay, à partir du résultat déjà estimé (pas de nouvel appel de
  // recherche d'annonces, juste un texte de vente). L'utilisateur copie le
  // texte puis clique sur le lien du site pour créer son annonce lui-même
  // (aucune de ces plateformes n'ouvre la création d'annonce à une appli
  // tierce sans partenariat, donc on ne peut pas publier automatiquement).
  async function generateAd() {
    if (!result) return;
    if (adGenCount >= 3) return; // limite de 3 générations/régénérations par estimation
    setAdGenCount((c) => c + 1);
    setAdLoading(true);
    setAdError(null);
    setAdCopied(false);
    try {
      const adTextRaw = await callClaude(
        [
          {
            role: "user",
            content:
              `Objet: ${result.objet} (${result.categorie}). État: ${result.etat} (${result.etat_note}). ` +
              `Estimation de revente d'occasion: ${result.prix_bas}–${result.prix_haut} €. ` +
              "Rédige une annonce de vente prête à publier sur Leboncoin, Vinted ou eBay pour cet objet d'occasion : " +
              "un titre court et accrocheur (60 caractères maximum), et une description de vente honnête et convaincante " +
              "(3 à 5 phrases : mentionne l'état, met en avant les points forts, précise que le prix est à négocier). " +
              "Ne jamais inventer de caractéristiques ou mentir sur l'état. " +
              'Réponds UNIQUEMENT en JSON: {"titre": "...", "description": "..."}',
          },
        ],
        "claude-haiku-4-5-20251001"
      );
      const parsed = extractJson(adTextRaw);
      setAdText({ titre: parsed.titre || "", description: parsed.description || "" });
      setLifetimeAdGenerations((prev) => prev + 1);
      // Compteur CÔTÉ SERVEUR (nécessaire pour le classement — comparer les
      // utilisateurs entre eux avec un compteur purement local serait
      // impossible). Silencieux : un échec ne doit pas faire échouer la
      // génération d'annonce elle-même, déjà réussie à ce stade.
      if (user) {
        supabase.rpc("record_ad_generation").catch(() => {});
      }
    } catch (e) {
      setAdError("Impossible de générer l'annonce, réessaie.");
    } finally {
      setAdLoading(false);
    }
  }

  function copyAdText() {
    if (!adText) return;
    const full = `${adText.titre}\n\n${adText.description}`;
    navigator.clipboard
      .writeText(full)
      .then(() => {
        setAdCopied(true);
        setTimeout(() => setAdCopied(false), 2000);
      })
      .catch(() => {
        setAdError("Impossible de copier automatiquement, sélectionne le texte à la main.");
      });
  }

  // Génère une petite carte visuelle (canvas) reprenant l'objet, le prix et
  // le branding estim', puis la propose au partage natif (réseaux sociaux,
  // messages...) — repli en téléchargement si le partage n'est pas dispo. Un
  // levier de croissance simple: chaque partage fait connaître l'appli.
  async function shareResult() {
    if (!result) return;
    setShareStatus("generating");
    try {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch (e) {}

      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#04060C");
      grad.addColorStop(0.55, "#152238");
      grad.addColorStop(1, "#2E4159");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const photoSrc = (listingSeed && listingSeed.image) || (image && image.dataUrl);
      if (photoSrc) {
        try {
          const img = await new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = photoSrc;
          });
          const size = 760;
          const sx = (W - size) / 2;
          const sy = 100;
          const radius = 28;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sx + radius, sy);
          ctx.arcTo(sx + size, sy, sx + size, sy + size, radius);
          ctx.arcTo(sx + size, sy + size, sx, sy + size, radius);
          ctx.arcTo(sx, sy + size, sx, sy, radius);
          ctx.arcTo(sx, sy, sx + size, sy, radius);
          ctx.closePath();
          ctx.clip();
          const ratio = Math.max(size / img.width, size / img.height);
          const dw = img.width * ratio;
          const dh = img.height * ratio;
          ctx.drawImage(img, sx + (size - dw) / 2, sy + (size - dh) / 2, dw, dh);
          ctx.restore();
        } catch (e) {
          // image non chargeable (ex: CORS sur une image externe) : on
          // continue simplement sans elle plutôt que de bloquer le partage.
        }
      }

      ctx.textAlign = "center";
      ctx.fillStyle = accent;
      ctx.font = "700 32px 'JetBrains Mono', monospace";
      ctx.fillText((result.categorie || "").toUpperCase(), W / 2, 945);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 46px Fraunces, Georgia, serif";
      canvasWrapText(ctx, result.objet || "", W / 2, 1005, 900, 54, 2);

      ctx.fillStyle = accent;
      ctx.font = "800 90px 'JetBrains Mono', monospace";
      ctx.fillText(`${result.prix_bas}–${result.prix_haut} €`, W / 2, 1175);

      ctx.fillStyle = "#B9C3D1";
      ctx.font = "500 28px Fraunces, Georgia, serif";
      ctx.fillText("estimé avec estim'", W / 2, 1275);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setShareStatus(null);
        return;
      }
      const file = new File([blob], "estimation-estim.png", { type: "image/png" });
      const shareText = `${result.objet} — estimé à ${result.prix_bas}–${result.prix_haut} € avec estim' !`;

      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "estim'", text: shareText, files: [file] });
          setShareStatus(null);
        } else if (navigator.share) {
          await navigator.share({ title: "estim'", text: shareText });
          setShareStatus(null);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "estimation-estim.png";
          a.click();
          URL.revokeObjectURL(url);
          setShareStatus("downloaded");
          setTimeout(() => setShareStatus(null), 2500);
        }
      } catch (e) {
        // partage annulé par l'utilisateur ou erreur navigateur: rien à
        // afficher, ce n'est pas une vraie erreur.
        setShareStatus(null);
      }
    } catch (e) {
      setShareStatus(null);
    }
  }

  // detailsOverride permet de relancer immédiatement une estimation avec un
  // texte de précisions à jour sans dépendre du state React "details" (qui
  // ne serait pas encore mis à jour au moment de l'appel si on vient de
  // faire setDetails juste avant, à cause du batching des mises à jour de
  // state) — utilisé par la correction post-résultat ("ce n'est pas tout à
  // fait ça").
  async function runEstimationCore(detailsOverride, listingSeedOverride) {
    // listingSeedOverride permet, comme detailsOverride, d'éviter de lire
    // "listingSeed" depuis le state React juste après l'avoir défini avec
    // setListingSeed() dans le même événement: le state ne serait pas
    // encore à jour au moment de cet appel à cause du batching.
    const effectiveListingSeed = listingSeedOverride !== undefined ? listingSeedOverride : listingSeed;
    if (!image && !effectiveListingSeed) return;
    const effectiveDetails = detailsOverride !== undefined ? detailsOverride : details;
    setError(null);
    // Une nouvelle estimation (y compris via une correction) porte sur un
    // résultat potentiellement différent : on repart d'une annonce vierge
    // et d'un compteur de générations à zéro plutôt que de garder le texte
    // (et la limite déjà consommée) de l'estimation précédente.
    setAdText(null);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
    try {
      let identification;
      if (effectiveListingSeed) {
        // Estimation lancée depuis une annonce déjà en ligne (bouton
        // "Estimer" sur une carte de résultat): pas de photo à analyser,
        // donc pas d'appel de vision — on construit directement
        // l'identification à partir du titre de l'annonce elle-même (+
        // d'éventuelles précisions ajoutées via "corriger").
        setStatus("pricing");
        const seedTitle = effectiveListingSeed.title || "objet";
        identification = {
          type_sujet: "objet",
          objet: effectiveDetails.trim() ? `${seedTitle} (${effectiveDetails.trim()})` : seedTitle,
          recherche: effectiveDetails.trim() ? `${seedTitle} ${effectiveDetails.trim()}` : seedTitle,
          categorie: effectiveListingSeed.category || "",
          etat: "État non vérifiable à distance : estimation basée sur une annonce en ligne, pas sur une photo.",
          etat_note: "occasion (état non vérifié)",
        };
      } else {
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
                  (effectiveDetails.trim()
                    ? ` L'utilisateur précise en plus: "${effectiveDetails.trim()}". Utilise ces précisions en priorité sur ce que tu vois sur la photo si elles se contredisent (ex: la contenance exacte, un défaut caché), et intègre-les dans "objet" et "recherche".`
                    : ""),
              },
            ],
          },
        ], "claude-sonnet-4-6", 0.2);
        // temperature basse (0.2) ici: c'est cette étape qui fixe "recherche"/
        // "objet", donc les mots-clés utilisés pour chercher de vraies
        // annonces. Au défaut (température ~1), la même photo pouvait donner
        // des mots-clés légèrement différents d'une estimation à l'autre, donc
        // une recherche différente et des annonces différentes trouvées —
        // c'était la cause du "ça ne trouve pas la même annonce que la
        // dernière fois" remonté par l'utilisateur. Une température basse
        // rend l'identification beaucoup plus stable d'un essai à l'autre sur
        // la même photo, sans la rendre totalement figée.
        identification = extractJson(idText);
      }

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
        const { bySource, errors, total } = await fetchRealListings(searchTerm);

        // Quand l'estimation part d'une annonce déjà en ligne, on continue
        // même si la recherche fraîche ne retrouve aucun comparable: le
        // prix de cette annonce elle-même (injecté plus bas) sert alors de
        // donnée de base, plutôt que de tomber dans le repli IA générale
        // ci-dessous qui perdrait cette information.
        if (total >= 1 || effectiveListingSeed) {
          // On aplatit les 3 sources en gardant l'étiquette d'origine sur
          // chaque annonce, pour ne jamais les mélanger dans l'affichage
          // ni perdre la traçabilité de la source.
          const allListings = [
            ...bySource.leboncoin.map((r) => ({ ...r, source: "leboncoin" })),
            ...bySource.vinted.map((r) => ({ ...r, source: "vinted" })),
            ...bySource.ebay.map((r) => ({ ...r, source: "ebay" })),
            ...bySource.ebaySold.map((r) => ({ ...r, source: "ebaySold", sold: true })),
          ];

          // Filtrage de pertinence: on ne garde que les annonces qui
          // correspondent vraiment au même produit (même format/taille/
          // modèle), pour éviter de mélanger un parfum 30ml avec un 100ml
          // par exemple.
          const listingsForReview = allListings
            .map(
              (r, i) =>
                `${i}: [${r.sold ? "VENDU sur eBay" : r.source}] "${r.title}" — ${r.price || r.extracted_price + " €"}`
            )
            .join("\n");

          const filterText = await callClaude([
            {
              role: "user",
              content:
                `Objet identifié avec précision: "${identification.objet}" (${identification.etat_note}). ` +
                `Voici des annonces d'occasion trouvées sur Leboncoin, Vinted et eBay (annonces actives + ventes eBay déjà conclues) pour une recherche proche:\n${listingsForReview}\n\n` +
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
            .map((i) => allListings[i])
            .filter((r) => r && typeof r.extracted_price === "number" && r.extracted_price > 0);
          const relevantPrices = relevantResults
            .map((r) => r.extracted_price)
            .sort((a, b) => a - b);

          let usedResults = relevantResults;
          let usedPrices = relevantPrices;

          // L'annonce d'origine (quand l'estimation part d'un bouton
          // "Estimer" sur une carte de résultat) est par définition
          // exactement le même produit: on l'ajoute directement comme
          // donnée de prix demandé, sans passer par le filtre de
          // pertinence IA ci-dessus (qui ne connaît que les nouveaux
          // résultats de recherche, pas cette annonce précise).
          if (
            effectiveListingSeed &&
            typeof effectiveListingSeed.price === "number" &&
            effectiveListingSeed.price > 0
          ) {
            usedResults = [
              ...usedResults,
              {
                title: effectiveListingSeed.title,
                extracted_price: effectiveListingSeed.price,
                source: effectiveListingSeed.sourcePlatform || "annonce",
                link: effectiveListingSeed.link,
              },
            ];
            usedPrices = [...usedPrices, effectiveListingSeed.price].sort((a, b) => a - b);
          }

          if (usedPrices.length === 0) {
            throw new Error(
              "Des annonces ont été trouvées mais aucune ne correspond précisément au même produit (même format/modèle)."
            );
          }

          // Les ventes eBay confirmées sont un signal beaucoup plus fiable
          // qu'une simple annonce active (prix réellement payé, pas juste
          // demandé) — on les distingue pour le prompt IA juste en dessous.
          const soldResults = usedResults.filter((r) => r.source === "ebaySold");
          const askingResults = usedResults.filter((r) => r.source !== "ebaySold");
          const soldPrices = soldResults.map((r) => r.extracted_price).sort((a, b) => a - b);
          const askingPrices = askingResults.map((r) => r.extracted_price).sort((a, b) => a - b);
          const usedSource =
            "estimation basée sur " +
            usedPrices.length +
            " annonce(s) d'occasion réelle(s) (Leboncoin/Vinted/eBay)" +
            (soldPrices.length > 0 ? `, dont ${soldPrices.length} vente(s) eBay confirmée(s)` : "");

          // Fourchette "brute" (min/max des annonces trouvées), gardée en
          // repli si jamais l'IA ne renvoie pas prix_bas/prix_haut. Ce n'est
          // PAS la fourchette finale affichée: avec très peu d'annonces
          // (surtout une seule), un simple min=max donnerait un prix
          // artificiellement précis alors que ce sont pour la plupart des
          // prix affichés/demandés, pas des prix de vente confirmés. La
          // vraie fourchette est calculée par l'IA juste après, en
          // mélangeant ces prix réels avec sa connaissance générale du
          // marché.
          const rawPrixBas = usedPrices[0];
          const rawPrixHaut = usedPrices[usedPrices.length - 1];

          // Détail par plateforme (uniquement les annonces retenues comme
          // pertinentes), pour un affichage séparé "sans se mélanger".
          const breakdown = {};
          for (const key of ["leboncoin", "vinted", "ebay", "ebaySold"]) {
            const forSource = usedResults.filter((r) => r.source === key);
            if (forSource.length > 0) {
              const pricesForSource = forSource.map((r) => r.extracted_price).sort((a, b) => a - b);
              breakdown[key] = {
                count: pricesForSource.length,
                min: pricesForSource[0],
                max: pricesForSource[pricesForSource.length - 1],
              };
            } else if (errors[key]) {
              breakdown[key] = { count: 0, error: errors[key] };
            }
          }

          const askingPart =
            askingPrices.length > 0
              ? `Prix DEMANDÉS par des vendeurs (annonces actives, Leboncoin/Vinted/eBay) pour ce produit précis: ${askingPrices.join(
                  ", "
                )} € (${askingPrices.length} annonce(s)). Ce sont des prix affichés, pas forcément des prix de vente réels — le produit a pu se vendre moins cher, ou ne pas se vendre du tout à ce prix. `
              : "";
          const soldPart =
            soldPrices.length > 0
              ? `Prix de VENTE CONFIRMÉS récemment sur eBay pour ce produit précis (ventes réellement conclues — à privilégier comme référence la plus fiable): ${soldPrices.join(
                  ", "
                )} € (${soldPrices.length} vente(s)). `
              : "";

          // Cas "estimation depuis une annonce déjà en ligne": on rappelle
          // explicitement à l'IA que le point de départ est le prix demandé
          // par CETTE annonce précise, pas une vente confirmée — le simple
          // fait qu'elle soit encore en ligne ne prouve pas qu'elle se
          // vendra à ce prix (elle peut être surestimée ou traîner depuis
          // un moment). On lui demande explicitement de pencher vers un
          // prix plus bas et plus réaliste si les comparables le suggèrent,
          // plutôt que de valider ce prix affiché par défaut.
          const seedPart = effectiveListingSeed
            ? `Point de départ: l'utilisateur a cliqué "Estimer" sur une annonce précise, encore en ligne sur ${
                SOURCE_LABELS[effectiveListingSeed.sourcePlatform] || "une plateforme d'occasion"
              }${effectiveListingSeed.price ? ` à ${effectiveListingSeed.price} €` : ""}. Cette annonce n'est PAS une vente confirmée: elle est simplement affichée, on ne sait pas depuis combien de temps ni si elle se vendra à ce prix — un vendeur particulier surestime souvent son prix de départ. Ne prends donc pas ce prix demandé pour argent comptant: si les ventes confirmées ou les autres comparables suggèrent une valeur de revente réaliste plus basse, ta fourchette doit clairement pencher vers ce prix plus bas plutôt que de valider le prix de cette annonce, et dis-le dans "conseil" ou "alerte" si l'écart est notable. `
            : "";

          const conseilText = await callClaude([
            {
              role: "user",
              content:
                `Objet: ${identification.objet}, état: ${identification.etat_note}. ` +
                seedPart +
                askingPart +
                soldPart +
                "Pour fixer ta fourchette de revente réaliste (\"prix_bas\" et \"prix_haut\", nombres en euros, prix_bas strictement inférieur à prix_haut), mélange VRAIMENT trois sources, sans te reposer sur une seule : " +
                "1) les prix de VENTE confirmés quand il y en a — le signal le plus fiable, un prix réellement payé ; " +
                "2) les prix DEMANDÉS dans les annonces actives — indicatif, mais un vendeur peut demander plus cher que ce que ça se vend vraiment ; " +
                "3) ta connaissance générale du marché de l'occasion pour ce type de produit et son état — utile pour recadrer si les annonces trouvées semblent atypiques, ou pour combler le manque de données. " +
                (soldPrices.length > 0
                  ? "Ici tu as des ventes confirmées : ancre ta fourchette en priorité dessus, les prix demandés ne servent que de repère complémentaire. "
                  : "Ici tu n'as que des prix demandés, aucune vente confirmée : pondère-les avec ta connaissance générale du marché, car un prix affiché n'est pas toujours un prix de vente réel. ") +
                "Ne renvoie JAMAIS prix_bas égal à prix_haut, même s'il n'y a qu'une seule annonce trouvée : élargis intelligemment la fourchette autour du/des prix observés (par exemple ±10 à 25% selon ton incertitude) en tenant compte du nombre d'annonces disponibles (moins il y en a, plus la fourchette doit être large) et de l'état de l'objet. " +
                "Donne aussi une estimation SÉPARÉE et prudente pour la revente en brocante/vide-grenier (\"prix_brocante\") : à ces endroits, les acheteurs marchandent presque systématiquement le prix affiché à la baisse (souvent -20 à -40%), donc donne un prix réaliste APRÈS ce marchandage typique, pas le prix de départ espéré — reste précautionneux plutôt qu'optimiste sur ce chiffre-là en particulier. " +
                "et un conseil de vente pratique en une phrase (\"conseil\"). " +
                "Si ces prix te semblent anormalement bas ou hauts par rapport à ta connaissance générale du produit " +
                "(ex: erreur de prix, produit différent malgré le nom), signale-le brièvement dans \"alerte\" (sinon renvoie une chaîne vide). " +
                "Donne aussi deux notes de 0 à 10 sur ce produit précis: " +
                "\"facilite_vente\" (0 = très difficile à vendre car peu de demande sur ce type de plateformes d'occasion, 10 = se vend très facilement/vite, en te basant sur le nombre d'annonces trouvées et ta connaissance générale de la demande pour ce type de produit), " +
                "\"rarete\" (0 = produit courant qu'on trouve facilement partout, 10 = produit très rare/recherché/difficile à trouver). " +
                "Donne aussi une tendance de marché sur les 10 dernières années pour CE TYPE de produit précis (\"tendance_marche\"): un tableau de EXACTEMENT 11 nombres (indices), un par an, du plus ancien (il y a 10 ans) au plus récent (aujourd'hui = toujours 100, c'est le niveau de prix actuel). Base-toi sur ta connaissance réelle de l'évolution de la cote de cette catégorie: les objets qui prennent de la valeur avec le temps (vintage recherché, collector, édition limitée) doivent avoir des indices qui MONTENT vers 100 en fin de période (donc plus bas au début), ceux qui se déprécient (électronique récente, mobilier neuf de grande diffusion) doivent avoir des indices qui BAISSENT vers 100 (donc plus hauts au début), et un marché de l'occasion ne bouge presque jamais en ligne parfaitement droite: varie légèrement chaque point plutôt qu'une progression linéaire. " +
                'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre, "prix_haut": nombre, "prix_brocante": "...", "conseil": "...", "alerte": "...", "facilite_vente": nombre_0_a_10, "rarete": nombre_0_a_10, "tendance_marche": [nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, 100]}',
            },
          ], "claude-haiku-4-5-20251001");
          const extra = extractJson(conseilText);

          const prix_bas =
            typeof extra.prix_bas === "number" && !isNaN(extra.prix_bas) ? extra.prix_bas : rawPrixBas;
          const prix_haut =
            typeof extra.prix_haut === "number" && !isNaN(extra.prix_haut) && extra.prix_haut > prix_bas
              ? extra.prix_haut
              : Math.max(rawPrixHaut, Math.round(prix_bas * 1.15));

          // Une vente eBay confirmée est un signal beaucoup plus solide
          // qu'une simple annonce active: si on en a au moins une, on monte
          // le niveau de confiance d'un cran par rapport au seul nombre
          // d'annonces trouvées.
          const baseConfidenceLevel = usedPrices.length >= 4 ? 2 : usedPrices.length >= 2 ? 1 : 0;
          const confidenceLevel = Math.min(2, baseConfidenceLevel + (soldPrices.length > 0 ? 1 : 0));

          pricing = {
            prix_bas,
            prix_haut,
            prix_brocante: extra.prix_brocante,
            conseil: extra.conseil,
            alerte: extra.alerte || null,
            facilite_vente: typeof extra.facilite_vente === "number" ? extra.facilite_vente : null,
            rarete: typeof extra.rarete === "number" ? extra.rarete : null,
            tendance_marche: Array.isArray(extra.tendance_marche)
              ? extra.tendance_marche.filter((n) => typeof n === "number" && !isNaN(n))
              : null,
            confiance: confidenceLevel === 2 ? "haute" : confidenceLevel === 1 ? "moyenne" : "basse",
            source: usedSource,
            listings: usedResults,
            breakdown,
          };
        } else {
          throw new Error("Pas assez d'annonces trouvées pour cet objet.");
        }
      } catch (marketError) {
        const seedFallbackPart = effectiveListingSeed
          ? `L'utilisateur a cliqué "Estimer" sur une annonce précise, encore en ligne sur ${
              SOURCE_LABELS[effectiveListingSeed.sourcePlatform] || "une plateforme d'occasion"
            }${effectiveListingSeed.price ? ` à ${effectiveListingSeed.price} €` : ""} (ni vendue, ni confirmée à ce prix). Ne valide pas ce prix par défaut: si ta connaissance générale du marché suggère une valeur de revente réaliste plus basse, penche vers ce prix plus bas. `
          : "";
        const priceText = await callClaude([
          {
            role: "user",
            content:
              `Objet d'occasion identifié: ${identification.objet} (catégorie: ${identification.categorie}). ` +
              `État: ${identification.etat} (${identification.etat_note}). ` +
              seedFallbackPart +
              "En te basant sur ta connaissance générale du marché de l'occasion en France, donne une estimation de prix réaliste (aucune annonce réelle trouvée pour ce produit, donc uniquement ta connaissance générale ici). " +
              "Donne aussi une estimation SÉPARÉE et prudente pour la revente en brocante/vide-grenier (\"prix_brocante\") : à ces endroits, les acheteurs marchandent presque systématiquement le prix affiché à la baisse (souvent -20 à -40%), donc donne un prix réaliste APRÈS ce marchandage typique, pas le prix de départ espéré. " +
              "Donne aussi deux notes de 0 à 10 sur ce produit précis: " +
              "\"facilite_vente\" (0 = très difficile à vendre car peu de demande, 10 = se vend très facilement/vite) et " +
              "\"rarete\" (0 = produit courant, 10 = produit très rare/recherché), en te basant sur ta connaissance générale du marché de l'occasion. " +
              "Donne aussi une tendance de marché sur les 10 dernières années pour CE TYPE de produit (\"tendance_marche\"): un tableau de EXACTEMENT 11 nombres (indices), un par an, du plus ancien (il y a 10 ans) au plus récent (aujourd'hui = toujours 100), en montant vers 100 en fin de période si ce type d'objet prend de la valeur avec le temps, en descendant vers 100 s'il se déprécie, avec de légères variations plutôt qu'une ligne droite. " +
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre, "prix_haut": nombre, "prix_brocante": "...", "conseil": "...", "facilite_vente": nombre_0_a_10, "rarete": nombre_0_a_10, "tendance_marche": [nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, 100]}',
          },
        ], "claude-haiku-4-5-20251001");
        const fallback = extractJson(priceText);
        const fbBas = typeof fallback.prix_bas === "number" ? fallback.prix_bas : 0;
        const fbHaut =
          typeof fallback.prix_haut === "number" && fallback.prix_haut > fbBas
            ? fallback.prix_haut
            : Math.round(fbBas * 1.15);
        pricing = {
          ...fallback,
          prix_bas: fbBas,
          prix_haut: fbHaut,
          facilite_vente: typeof fallback.facilite_vente === "number" ? fallback.facilite_vente : null,
          rarete: typeof fallback.rarete === "number" ? fallback.rarete : null,
          tendance_marche: Array.isArray(fallback.tendance_marche)
            ? fallback.tendance_marche.filter((n) => typeof n === "number" && !isNaN(n))
            : null,
          confiance: "basse",
          source: "estimation IA (annonces réelles indisponibles: " + marketError.message + ")",
          listings: [],
          breakdown: {},
        };
      }

      const finalResult = { ...identification, ...pricing };
      setResult(finalResult);
      setStatus("done");
      addToHistory({
        id: Date.now(),
        date: new Date().toISOString(),
        // effectiveListingSeed.image plutôt que image.dataUrl: au moment de
        // cet appel, le state React "image" peut ne pas encore refléter le
        // setImage() fait juste avant d'appeler runEstimationCore() (React
        // regroupe les mises à jour), donc on utilise directement l'annonce
        // d'origine passée en paramètre pour ce cas.
        image: effectiveListingSeed ? effectiveListingSeed.image : image.dataUrl,
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
    setListingSeed(null);
    setDetails("");
    setResult(null);
    setError(null);
    setResultTab("estimation");
    setCorrectionOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
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
        background: pt.pageBg,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: pt.strongColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px 60px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: pt.topBarGradient,
          zIndex: 50,
        }}
      />

      {gradeUnlockToast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `linear-gradient(135deg, ${gradeUnlockToast.accentLight} 0%, ${gradeUnlockToast.accent} 55%, ${gradeUnlockToast.accentDark} 100%)`,
            color: "#152238",
            borderRadius: 30,
            padding: "10px 16px",
            boxShadow: "0 8px 24px rgba(4, 6, 12, 0.4)",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: 18 }}>{gradeUnlockToast.emoji}</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
            Palier {gradeUnlockToast.label} débloqué !
          </span>
        </div>
      )}

      {bgSkinUnlockToast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: gradeUnlockToast ? 60 : 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `linear-gradient(135deg, ${bgSkinUnlockToast.mid} 0%, ${bgSkinUnlockToast.high} 100%)`,
            color: "#FFFFFF",
            borderRadius: 30,
            padding: "10px 16px",
            boxShadow: "0 8px 24px rgba(4, 6, 12, 0.4)",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: 18 }}>{bgSkinUnlockToast.emoji}</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
            Fond {bgSkinUnlockToast.label} débloqué !
          </span>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .brand { font-family: 'Fraunces', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        button { font-family: inherit; cursor: pointer; }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        .sparkle { animation: sparkle-pulse 2.4s ease-in-out infinite; }
        .btn-primary {
          background: linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%);
          color: #FFFFFF;
          border: none;
          padding: 14px 22px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          box-shadow: 0 6px 16px rgba(${accentRgb}, ${0.32 + activeGrade.glow * 0.3});
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-primary:active { transform: scale(0.98); box-shadow: 0 3px 10px rgba(${accentRgb}, 0.28); }
        .btn-primary:disabled { opacity: 0.55; box-shadow: none; }
        .btn-ghost {
          background: transparent;
          color: ${pt.ghostColor};
          border: 1px solid ${pt.ghostBorder};
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-mic {
          background: transparent;
          color: ${pt.ghostColor};
          border: 1px solid ${pt.ghostBorder};
          border-radius: 12px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-mic.listening {
          background: ${accent};
          color: #EEF1F5;
          border-color: ${accent};
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(${accentRgb}, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(${accentRgb}, 0); }
        }
        .tag-spin-scene {
          perspective: 260px;
        }
        .tag-spin-wrap {
          animation: tagSpin3d 1.8s linear infinite;
          transform-style: preserve-3d;
          filter: drop-shadow(0 6px 10px rgba(${accentRgb}, 0.4));
        }
        @keyframes tagSpin3d {
          0% { transform: rotateY(0deg) rotateX(12deg); }
          100% { transform: rotateY(360deg) rotateX(12deg); }
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${accent};
          display: inline-block;
          animation: pulseDot 1.2s ease-in-out infinite;
        }
        @keyframes pulseDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        .drop-zone {
          border: 2px dashed ${accent};
          border-radius: 18px;
          width: 100%;
          aspect-ratio: 4/3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: ${pt.dropZoneText};
          background: ${pt.dropZoneBg};
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .drop-zone::before {
          content: "";
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(${accentRgb}, 0.35);
          border-radius: 12px;
          pointer-events: none;
        }
        .drop-zone:active { transform: scale(0.99); }
        .tag-card {
          background: ${pt.formCardBg};
          border: 1px solid ${pt.rowBorder.replace("1px solid ", "")};
          border-top: 3px solid ${accent};
          border-radius: 16px;
          position: relative;
          padding: 26px 22px 22px;
          width: 100%;
          box-shadow: 0 10px 24px rgba(21, 34, 56, 0.08);
        }
        .tag-card::before {
          content: "";
          position: absolute;
          top: -9px;
          left: 24px;
          width: 18px;
          height: 18px;
          background: ${pt.pageBg};
          border: 1px solid ${pt.rowBorder.replace("1px solid ", "")};
          border-radius: 50%;
        }
        .tag-card-result {
          background: ${pt.resultCardBg};
          border-color: rgba(${accentRgb}, ${0.4 + activeGrade.glow * 0.4});
          box-shadow: 0 14px 32px rgba(4, 6, 12, 0.35)${activeGrade.glow ? `, 0 0 26px rgba(${accentRgb}, ${activeGrade.glow * 0.55})` : ""};
          overflow: hidden;
        }
        .tag-card-result::before {
          background: ${pt.pageBg};
          border-color: rgba(${accentRgb}, 0.4);
        }
        .tag-card-result .tag-card-watermark {
          position: absolute;
          top: -20px;
          right: -24px;
          opacity: 0.1;
          transform: rotate(18deg);
          pointer-events: none;
        }
        .price-pill {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          background: linear-gradient(135deg, ${accentDark} 0%, ${accent} 45%, ${accentLight} 100%);
          box-shadow: ${activeGrade.glow ? `0 0 14px rgba(${accentRgb}, ${activeGrade.glow})` : "none"};
          color: #152238;
          border-radius: 12px;
          padding: 10px 16px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
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
          color: ${pt.subText};
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <header
          style={{
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
            borderRadius: 22,
            padding: "22px 20px 24px",
            background: pt.headerBg,
            boxShadow: [
              activeGrade.glow ? `0 0 0 1px rgba(${accentRgb}, ${activeGrade.glow * 0.6}), 0 18px 40px rgba(${accentRgb}, ${activeGrade.glow * 0.5})` : null,
              activeBgSkin.key === "platine" ? `0 0 0 1px rgba(${bgSkinAccentRgb}, 0.5), 0 0 30px rgba(${bgSkinAccentRgb}, ${activeBgSkin.glow || 0.4})` : null,
            ]
              .filter(Boolean)
              .join(", ") || "none",
          }}
        >
          {activeBgSkin.key === "platine" && (
            <>
              {[
                { top: "9%", left: "16%", size: 10, glyph: "✦", delay: "0s" },
                { top: "20%", left: "72%", size: 15, glyph: "❖", delay: "0.35s" },
                { top: "54%", left: "93%", size: 9, glyph: "✧", delay: "0.9s" },
                { top: "80%", left: "28%", size: 11, glyph: "✦", delay: "1.3s" },
                { top: "46%", left: "5%", size: 8, glyph: "✧", delay: "1.7s" },
                { top: "6%", left: "48%", size: 12, glyph: "❖", delay: "0.6s" },
              ].map((s, i) => (
                <span
                  key={`pl-${i}`}
                  aria-hidden="true"
                  className="sparkle"
                  style={{
                    position: "absolute",
                    top: s.top,
                    left: s.left,
                    fontSize: s.size,
                    color: activeBgSkin.high,
                    textShadow: `0 0 8px rgba(${bgSkinAccentRgb}, 0.9)`,
                    animationDelay: s.delay,
                    pointerEvents: "none",
                  }}
                >
                  {s.glyph}
                </span>
              ))}
            </>
          )}

          {activeGrade.key === "diamant" && (
            <>
              {[
                { top: "14%", left: "82%", size: 12, delay: "0s" },
                { top: "68%", left: "90%", size: 8, delay: "0.6s" },
                { top: "40%", left: "8%", size: 9, delay: "1.1s" },
              ].map((s, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="sparkle"
                  style={{
                    position: "absolute",
                    top: s.top,
                    left: s.left,
                    fontSize: s.size,
                    color: accentLight,
                    animationDelay: s.delay,
                    pointerEvents: "none",
                  }}
                >
                  ✦
                </span>
              ))}
            </>
          )}

          {/* Étiquette décorative géante en filigrane, pour le côté "fun" —
              purement décoratif (aria-hidden), reprend la forme du tag du
              logo, très discrète (faible opacité) pour ne jamais gêner la
              lecture du texte par-dessus. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="230"
            height="230"
            fill="none"
            style={{
              position: "absolute",
              top: -50,
              right: -60,
              opacity: 0.1,
              transform: "rotate(18deg)",
              pointerEvents: "none",
            }}
          >
            <path
              d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
              fill={accent}
            />
            <circle cx="7.5" cy="7.5" r="1.6" fill="#152238" />
          </svg>

          {/* Le bouton menu est un élément normal du flux (pas absolu) juste
              avant le logo : il ne peut donc jamais chevaucher le texte du
              logo, quelle que soit sa propre largeur. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative" }}>
            <button
              className="btn-ghost"
              onClick={() => setShowMenu(true)}
              style={{
                flexShrink: 0,
                padding: 9,
                borderColor: pt.menuBtnBorder,
                color: pt.menuBtnColor,
                background: pt.menuBtnBg,
              }}
              aria-label={t("menu_title")}
            >
              <Menu size={16} />
            </button>
            <img
              src={menuTheme === "light" ? logoWordmarkDark : logoWordmarkLight}
              alt="estim'"
              style={{ height: 26, width: "auto", display: "block" }}
            />
            {activeGrade.key !== "defaut" && (
              <span
                title={`Habillage ${activeGrade.label}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  fontSize: 12,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
                  boxShadow: `0 0 10px rgba(${accentRgb}, 0.65)`,
                }}
              >
                {activeGrade.emoji}
              </span>
            )}
            <span
              className="mono"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#152238",
                background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
                borderRadius: 20,
                padding: "3px 9px",
              }}
            >
              bêta
            </span>
            {/* Profil : connexion / déconnexion / avatar — icône unique en
                haut à droite du header (plus dans le menu hamburger).
                Personnage miniature si un avatar a déjà été personnalisé,
                icône neutre sinon (ou si pas connecté). */}
            <button
              onClick={() => setShowProfilePanel(true)}
              aria-label="Mon profil"
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: "50%",
                padding: 0,
                border: `1px solid ${pt.menuBtnBorder}`,
                background: pt.menuBtnBg,
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {user && profile && profile.avatar_hair_style ? (
                <span style={{ display: "flex", alignItems: "flex-start", marginTop: 6 }}>
                  <AvatarSVG
                    skin={profile.avatar_skin || AVATAR_DEFAULTS.skin}
                    hairStyle={profile.avatar_hair_style || AVATAR_DEFAULTS.hairStyle}
                    hairColor={
                      (AVATAR_WARDROBE.hairColor.find((h) => h.id === (profile.avatar_hair_color || AVATAR_DEFAULTS.hairColor)) || {}).hex || "#1A1A1A"
                    }
                    topColor={
                      (AVATAR_WARDROBE.topColor.find((h) => h.id === (profile.avatar_top_color || AVATAR_DEFAULTS.topColor)) || {}).hex || "#5C6773"
                    }
                    accessory={profile.avatar_accessory || AVATAR_DEFAULTS.accessory}
                    gender={profile.avatar_gender || AVATAR_DEFAULTS.gender}
                    size={30}
                  />
                </span>
              ) : (
                <User size={16} color={pt.menuBtnColor} />
              )}
            </button>
          </div>
          <h1
            className="brand"
            style={{ fontSize: 33, fontWeight: 600, margin: 0, lineHeight: 1.12, color: pt.strongColor, position: "relative" }}
          >
            {t("hero_title_1")}
            <br />
            <span style={{ color: accent }}>{t("hero_title_2")}</span>
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, color: pt.subText, lineHeight: 1.5, position: "relative" }}>
            {t("hero_subtitle")}
          </p>

          {user && profile && (
            <div
              className="mono"
              style={{
                marginTop: 12,
                fontSize: 11,
                color: pt.chipText,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => setShowHistory(true)}
            >
              <Sparkles size={12} />
              {profile.plan !== "gratuit" && profile.subscription_status === "active" ? (
                <span>
                  {PLANS.find((p) => p.key === profile.plan)?.label || profile.plan} ·{" "}
                  {Math.max(0, profile.quota_mensuel - profile.estimations_utilisees)}/{profile.quota_mensuel}{" "}
                  estimations restantes
                </span>
              ) : (
                <span>
                  Gratuit · {Math.max(0, 3 - profile.gratuit_utilisees)} estimation(s) restante(s) ce mois
                </span>
              )}
            </div>
          )}
        </header>

        {!image && (
          <label className="drop-zone" htmlFor="photo-input">
            <Camera size={30} strokeWidth={1.5} style={{ color: accent }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t("drop_zone_title")}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{t("drop_zone_sub")}</div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <span
              className="btn-ghost"
              style={{
                marginTop: 6,
                pointerEvents: "none",
                borderColor: pt.ghostBorder,
                color: pt.ghostColor,
              }}
            >
              <Upload size={14} /> choisir un fichier
            </span>
          </label>
        )}

        {error && !image && (
          <div
            className="mono"
            style={{
              fontSize: 12,
              color: accent,
              background: "#FDECE3",
              border: "1px solid #F3C6A9",
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
                border: pt.formCardBorder,
              }}
            />
            {image.debug && (
              <div className="mono" style={{ fontSize: 11, color: pt.chevronColor }}>
                debug: {image.debug} · type: {image.mediaType}
              </div>
            )}

            {(status === "analyzing" || status === "pricing") && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: "28px 20px",
                  borderRadius: 12,
                  background: pt.loadingBg,
                  border: `1px solid ${pt.loadingBorder}`,
                }}
              >
                <div className="tag-spin-scene">
                  <div className="tag-spin-wrap">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
                      <path
                        d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                        fill={accent}
                      />
                      <circle cx="7.5" cy="7.5" r="1.7" fill="#152238" />
                    </svg>
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: pt.loadingText,
                    letterSpacing: "0.02em",
                    textAlign: "center",
                  }}
                >
                  {status === "analyzing" ? t("loading_analyzing") : t("loading_pricing")}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="pulse-dot" style={{ animationDelay: "0s" }} />
                  <span className="pulse-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="pulse-dot" style={{ animationDelay: "0.3s" }} />
                </div>
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
                  <label className="mono" style={{ fontSize: 12, color: pt.subText }}>
                    Précisions (optionnel) — contenance, état, modèle exact...
                  </label>
                  {isListening && (
                    <span className="mono" style={{ fontSize: 11, color: accent }}>
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
                      border: pt.formCardBorder,
                      background: pt.formCardBg,
                      color: pt.strongColor,
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
                <button className="btn-primary" onClick={() => estimate()} disabled={status === "analyzing" || status === "pricing"}>
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
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 10 }}>
                  🚗 quelques précisions sur le véhicule
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
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
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 10 }}>
                  🏠 quelques précisions sur le bien
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
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
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
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
                  color: accent,
                  background: "#FDECE3",
                  border: "1px solid #F3C6A9",
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
              <div className="tag-card tag-card-result">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="180" height="180" fill="none" className="tag-card-watermark">
                  <path
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                    fill={accent}
                  />
                  <circle cx="7.5" cy="7.5" r="1.6" fill="#152238" />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  🎭 mode "estimer tout, même n'importe quoi"
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: pt.strongColor, position: "relative" }}>
                  {result.objet}
                </div>

                <div className="price-pill mono" style={{ fontSize: 26, fontWeight: 800, marginBottom: 14, position: "relative" }}>
                  {result.prix_bas}–{result.prix_haut} €
                </div>

                <div
                  style={{
                    borderTop: pt.dashedBorder,
                    paddingTop: 12,
                    fontSize: 14,
                    color: pt.rowText,
                    lineHeight: 1.6,
                    marginBottom: 10,
                    position: "relative",
                  }}
                >
                  {result.commentaire}
                </div>
                <div style={{ fontSize: 12, color: pt.chevronColor, fontStyle: "italic", lineHeight: 1.5, position: "relative" }}>
                  {result.rappel}
                </div>
              </div>
            )}

            {result && status === "done" && (result.type_sujet === "vehicule" || result.type_sujet === "immobilier") && (
              <div className="tag-card tag-card-result">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="180" height="180" fill="none" className="tag-card-watermark">
                  <path
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                    fill={accent}
                  />
                  <circle cx="7.5" cy="7.5" r="1.6" fill="#152238" />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  {result.type_sujet === "vehicule" ? "🚗 estimation véhicule" : "🏠 estimation immobilière"} · indicative
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: pt.strongColor, position: "relative" }}>
                  {result.objet}
                </div>

                <div className="price-pill mono" style={{ fontSize: 26, fontWeight: 800, marginBottom: 14, position: "relative" }}>
                  {result.prix_bas}–{result.prix_haut} €
                </div>

                <div
                  style={{
                    borderTop: pt.dashedBorder,
                    paddingTop: 12,
                    fontSize: 14,
                    color: pt.rowText,
                    lineHeight: 1.6,
                    marginBottom: result.hypothese ? 10 : 14,
                    position: "relative",
                  }}
                >
                  {result.commentaire}
                </div>
                {result.hypothese && (
                  <div style={{ fontSize: 12, color: pt.chevronColor, fontStyle: "italic", lineHeight: 1.5, marginBottom: 10, position: "relative" }}>
                    Hypothèse : {result.hypothese}
                  </div>
                )}
                <div className="mono" style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.6, position: "relative" }}>
                  {result.source}
                </div>
              </div>
            )}

            {result && status === "done" && (!result.type_sujet || result.type_sujet === "objet") && (
              <div className="tag-card tag-card-result">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="180" height="180" fill="none" className="tag-card-watermark">
                  <path
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                    fill={accent}
                  />
                  <circle cx="7.5" cy="7.5" r="1.6" fill="#152238" />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  {result.categorie}
                </div>
                <div className="brand" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: pt.strongColor, position: "relative" }}>
                  {result.objet}
                </div>
                <div style={{ fontSize: 13, color: pt.subText, marginBottom: 16, position: "relative" }}>
                  {result.etat} · <em>{result.etat_note}</em>
                </div>

                {listingSeed && (
                  <div
                    className="mono"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      fontSize: 10,
                      color: pt.subText,
                      background: pt.rowBg,
                      border: pt.rowBorder,
                      borderRadius: 8,
                      padding: "7px 10px",
                      marginBottom: 16,
                      position: "relative",
                    }}
                  >
                    <Sparkles size={11} color={accent} style={{ flexShrink: 0 }} />
                    <span>{listingSeed.fromHistory ? t("reestimate_badge") : t("listing_seed_badge")}</span>
                    {listingSeed.link && (
                      <a
                        href={listingSeed.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: accent, textDecoration: "underline" }}
                      >
                        {t("listing_seed_link")}
                      </a>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {[
                    { key: "estimation", label: "Estimation" },
                    { key: "statistiques", label: "Statistiques" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setResultTab(tab.key)}
                      className="mono"
                      style={{
                        flex: 1,
                        fontSize: 12,
                        padding: "8px 10px",
                        borderRadius: 4,
                        border: "1px solid " + (resultTab === tab.key ? accent : pt.rowBorder.replace("1px solid ", "")),
                        background: resultTab === tab.key ? accent : "transparent",
                        color: resultTab === tab.key ? "#FFFFFF" : pt.chevronColor,
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {resultTab === "statistiques" && (
                  <div
                    style={{
                      borderTop: pt.dashedBorder,
                      paddingTop: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Gauge label="Facilité à vendre" value={result.facilite_vente} lowLabel="Difficile" highLabel="Facile" theme={menuTheme} accent={accent} accentRgb={accentRgb} />
                    <Gauge label="Rareté" value={result.rarete} lowLabel="Pas rare" highLabel="Rare" theme={menuTheme} accent={accent} accentRgb={accentRgb} />

                    {Array.isArray(result.tendance_marche) && result.tendance_marche.length >= 2 && (() => {
                      const trendPoints = buildTrendSeries(
                        result.tendance_marche,
                        trendRange,
                        result.objet || "objet",
                        (result.prix_bas + result.prix_haut) / 2
                      );
                      const isShortRange = trendRange === "1j" || trendRange === "1s" || trendRange === "1m";
                      return (
                        <div style={{ marginBottom: 22 }}>
                          <div
                            className="mono"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: pt.strongColor,
                              marginBottom: 10,
                            }}
                          >
                            Tendance de cote
                          </div>
                          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                            {TREND_RANGES.map((r) => (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => setTrendRange(r.key)}
                                className="mono"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: trendRange === r.key ? `1px solid ${accent}` : pt.rowBorder,
                                  background: trendRange === r.key ? accent : "transparent",
                                  color: trendRange === r.key ? "#FFFFFF" : pt.chevronColor,
                                  cursor: "pointer",
                                }}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                          {trendPoints && <PriceEvolutionChart theme={menuTheme} points={trendPoints} />}
                          <div style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.5, marginTop: 10 }}>
                            Tendance de cote estimée par l'IA pour ce type de produit à partir de sa courbe sur 10
                            ans (pas une donnée de marché vérifiée) — à prendre comme un repère indicatif, pas une
                            valeur garantie.
                            {isShortRange &&
                              " Sur une période aussi courte, le prix de revente d'un objet d'occasion ne bouge en réalité presque jamais : cette vue sert surtout à zoomer dans la tendance de fond."}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.5 }}>
                      Évaluation par l'IA à partir de la demande observée sur Leboncoin, Vinted et eBay pour ce
                      produit précis.
                    </div>
                  </div>
                )}

                {resultTab === "estimation" && (
                  <>
                <div className="price-pill mono" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
                  {result.prix_bas}–{result.prix_haut} €
                </div>
                <div style={{ fontSize: 13, color: pt.subText, marginBottom: 14 }}>
                  {t("used_price_label")}
                </div>

                <button
                  type="button"
                  onClick={shareResult}
                  disabled={shareStatus === "generating"}
                  className="mono"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: accent,
                    background: `rgba(${accentRgb}, 0.12)`,
                    border: `1px solid rgba(${accentRgb}, 0.35)`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 14,
                    cursor: "pointer",
                  }}
                >
                  <Share2 size={13} />
                  {shareStatus === "generating" ? "génération…" : shareStatus === "downloaded" ? "Image enregistrée !" : "Partager"}
                </button>

                {result.alerte && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: accent,
                      background: `rgba(${accentRgb}, 0.15)`,
                      border: `1px solid rgba(${accentRgb}, 0.4)`,
                      borderRadius: 3,
                      padding: "10px 12px",
                      marginBottom: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠ {result.alerte}
                  </div>
                )}

                {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                  <div
                    style={{
                      borderTop: pt.dashedBorder,
                      paddingTop: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                      détail par plateforme :
                    </div>
                    {["leboncoin", "vinted", "ebay", "ebaySold"].map((key) => {
                      const b = result.breakdown[key];
                      if (!b) return null;
                      const label = SOURCE_LABELS[key] || key;
                      return (
                        <div
                          key={key}
                          style={{
                            fontSize: 12,
                            color: pt.rowText,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "3px 0",
                          }}
                        >
                          <span>{label}</span>
                          {b.count > 0 ? (
                            <span
                              className="mono"
                              style={{ color: key === "ebaySold" ? "#4ADE80" : accent }}
                            >
                              {b.min === b.max ? `${b.min} €` : `${b.min}–${b.max} €`} ({b.count} {key === "ebaySold" ? "vente" : "annonce"}
                              {b.count > 1 ? "s" : ""})
                            </span>
                          ) : (
                            <span style={{ color: pt.chevronColor, fontStyle: "italic" }}>indisponible</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {result.listings && result.listings.length > 0 && (
                  <div
                    style={{
                      borderTop: pt.dashedBorder,
                      paddingTop: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                      annonces retenues (même produit) :
                    </div>
                    {result.listings.map((l, i) => {
                      const RowTag = l.link ? "a" : "div";
                      const rowProps = l.link
                        ? { href: l.link, target: "_blank", rel: "noopener noreferrer" }
                        : {};
                      return (
                        <RowTag
                          key={i}
                          {...rowProps}
                          style={{
                            fontSize: 12,
                            color: pt.rowText,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "3px 0",
                            textDecoration: "none",
                            cursor: l.link ? "pointer" : "default",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", gap: 6, alignItems: "baseline" }}>
                            {l.source && (
                              <span
                                className="mono"
                                style={{
                                  flexShrink: 0,
                                  fontSize: 10,
                                  color: l.source === "ebaySold" ? "#4ADE80" : pt.chevronColor,
                                  border: l.source === "ebaySold" ? "1px solid #4ADE80" : "1px solid " + pt.rowBorder.replace("1px solid ", ""),
                                  borderRadius: 3,
                                  padding: "1px 4px",
                                }}
                              >
                                {SOURCE_LABELS[l.source] || l.source}
                              </span>
                            )}
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textDecoration: l.link ? "underline" : "none",
                              }}
                            >
                              {l.title}
                            </span>
                          </span>
                          <span className="mono" style={{ flexShrink: 0, color: accent, display: "flex", alignItems: "center", gap: 3 }}>
                            {l.price}
                            {l.link && <span style={{ fontSize: 10 }}>↗</span>}
                          </span>
                        </RowTag>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    borderTop: pt.dashedBorder,
                    paddingTop: 12,
                    fontSize: 13,
                    color: pt.rowText,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>En brocante :</strong> {result.prix_brocante}
                </div>
                <div style={{ fontSize: 13, color: pt.rowText, marginTop: 8, lineHeight: 1.5 }}>
                  <strong>Conseil :</strong> {result.conseil}
                </div>
                  </>
                )}

                <div
                  style={{
                    borderTop: pt.dashedBorder,
                    paddingTop: 12,
                    marginTop: 14,
                  }}
                >
                  {!correctionOpen ? (
                    <button
                      type="button"
                      onClick={() => setCorrectionOpen(true)}
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: pt.chevronColor,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Un détail est faux ? Corriger et recalculer
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                        Précise ce qui ne va pas (ex : "en fait c'est une petite taille"), l'estimation sera
                        relancée avec cette info :
                      </div>
                      <textarea
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        placeholder="ex : petite taille, pas grande"
                        rows={2}
                        style={{
                          width: "100%",
                          fontSize: 13,
                          color: pt.inputText,
                          background: pt.inputBg,
                          border: pt.inputBorder,
                          borderRadius: 4,
                          padding: "8px 10px",
                          marginBottom: 8,
                          resize: "vertical",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={applyCorrection}
                          disabled={!correctionInput.trim() || status === "analyzing" || status === "pricing"}
                          className="mono"
                          style={{
                            fontSize: 12,
                            padding: "8px 12px",
                            borderRadius: 4,
                            border: `1px solid ${accent}`,
                            background: accent,
                            color: "#FFFFFF",
                            cursor: correctionInput.trim() ? "pointer" : "default",
                            opacity: correctionInput.trim() ? 1 : 0.5,
                          }}
                        >
                          Recalculer l'estimation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectionOpen(false);
                            setCorrectionInput("");
                          }}
                          className="mono"
                          style={{
                            fontSize: 12,
                            padding: "8px 12px",
                            borderRadius: 4,
                            border: "1px solid " + pt.rowBorder.replace("1px solid ", ""),
                            background: "transparent",
                            color: pt.chevronColor,
                            cursor: "pointer",
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: pt.dashedBorder,
                    paddingTop: 12,
                    marginTop: 14,
                  }}
                >
                  {!adText && !adLoading && adGenCount < 3 && (
                    <button
                      type="button"
                      onClick={generateAd}
                      className="mono"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                        color: "#152238",
                        background: `linear-gradient(135deg, ${accent} 0%, ${accentLight} 100%)`,
                        border: "none",
                        borderRadius: 20,
                        padding: "9px 16px",
                        cursor: "pointer",
                        boxShadow: "0 6px 14px rgba(0, 0, 0, 0.28)",
                      }}
                    >
                      <Sparkles size={14} />
                      Générer une annonce à publier
                    </button>
                  )}

                  {!adText && !adLoading && adGenCount >= 3 && (
                    <div style={{ fontSize: 12, color: pt.chevronColor }}>
                      Limite de 3 générations atteinte pour cette estimation.
                    </div>
                  )}

                  {adLoading && (
                    <div style={{ fontSize: 12, color: pt.chevronColor }}>Génération de l'annonce…</div>
                  )}

                  {adError && (
                    <div style={{ fontSize: 12, color: accent, marginTop: adText ? 8 : 0 }}>{adError}</div>
                  )}

                  {adText && !adLoading && (
                    <div>
                      <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                        Annonce prête à coller (modifiable) :
                      </div>
                      <input
                        value={adText.titre}
                        onChange={(e) => setAdText({ ...adText, titre: e.target.value })}
                        style={{
                          width: "100%",
                          fontSize: 13,
                          fontWeight: 600,
                          color: pt.inputText,
                          background: pt.inputBg,
                          border: pt.inputBorder,
                          borderRadius: 4,
                          padding: "8px 10px",
                          marginBottom: 6,
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <textarea
                        value={adText.description}
                        onChange={(e) => setAdText({ ...adText, description: e.target.value })}
                        rows={4}
                        style={{
                          width: "100%",
                          fontSize: 13,
                          color: pt.inputText,
                          background: pt.inputBg,
                          border: pt.inputBorder,
                          borderRadius: 4,
                          padding: "8px 10px",
                          marginBottom: 8,
                          resize: "vertical",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <button
                          type="button"
                          onClick={copyAdText}
                          className="mono"
                          style={{
                            fontSize: 12,
                            padding: "8px 12px",
                            borderRadius: 4,
                            border: `1px solid ${accent}`,
                            background: accent,
                            color: "#FFFFFF",
                            cursor: "pointer",
                          }}
                        >
                          {adCopied ? "Copié !" : "Copier le texte"}
                        </button>
                        {adGenCount < 3 && (
                          <button
                            type="button"
                            onClick={generateAd}
                            className="mono"
                            style={{
                              fontSize: 12,
                              padding: "8px 12px",
                              borderRadius: 4,
                              border: "1px solid " + pt.rowBorder.replace("1px solid ", ""),
                              background: "transparent",
                              color: pt.chevronColor,
                              cursor: "pointer",
                            }}
                          >
                            Régénérer ({3 - adGenCount} restante{3 - adGenCount > 1 ? "s" : ""})
                          </button>
                        )}
                      </div>
                      {adGenCount >= 3 && (
                        <div style={{ fontSize: 11, color: pt.chevronColor, marginBottom: 8 }}>
                          Limite de 3 générations atteinte pour cette estimation — tu peux encore modifier le texte
                          à la main juste au-dessus.
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: pt.chevronColor, marginBottom: 6, lineHeight: 1.5 }}>
                        Copie le texte ci-dessus, puis clique sur une plateforme pour créer ton annonce (colle le
                        texte une fois sur la page) :
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {SELL_PLATFORMS.map((p) => (
                          <a
                            key={p.label}
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              padding: "5px 12px 5px 5px",
                              borderRadius: 20,
                              border: pt.inputBorder,
                              color: pt.strongColor,
                              textDecoration: "none",
                              background: pt.inputBg,
                            }}
                          >
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: p.color,
                                color: "#FFFFFF",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {p.mono}
                            </span>
                            <span className="mono" style={{ fontSize: 12 }}>
                              {p.label}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="mono"
                  style={{ fontSize: 11, color: pt.chevronColor, marginTop: 16, lineHeight: 1.6 }}
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
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(21, 34, 56, 0.18)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 4,
                borderRadius: 3,
                background: pt.grabBg,
                margin: "0 auto 16px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 className="brand" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <Tag size={16} color={accent} style={{ transform: "rotate(90deg)" }} />
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
                      color: pt.subText,
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
                  <X size={20} color={pt.closeColor} />
                </button>
              </div>
            </div>

            {!user && (
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginBottom: 14 }}>
                Connecte-toi depuis ton profil (icône en haut à droite) pour un historique illimité, synchronisé entre appareils. Sans compte, l'historique reste local à cet appareil.
              </p>
            )}

            {history.length === 0 && (
              <p className="mono" style={{ fontSize: 13, color: pt.subText }}>
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
                    background: pt.rowBg,
                    border: pt.rowBorder,
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
                        color: pt.rowText,
                      }}
                    >
                      {h.objet}
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: pt.subText }}>
                      {h.prix_bas}–{h.prix_haut} € ·{" "}
                      {new Date(h.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => reestimateFromHistory(h)}
                    title="Réestimer (voir si le prix a bougé)"
                    aria-label="réestimer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `rgba(${accentRgb}, 0.12)`,
                      border: `1px solid rgba(${accentRgb}, 0.35)`,
                      borderRadius: 6,
                      padding: 6,
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={14} color={accent} />
                  </button>
                  <button
                    onClick={() => removeFromHistory(h.id)}
                    style={{ background: "none", border: "none", padding: 4, flexShrink: 0 }}
                    aria-label="supprimer"
                  >
                    <Trash2 size={16} color={accent} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ Ma collection (portefeuille + gamification) ============ */}
      {showCollection && (
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
          onClick={() => setShowCollection(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(21, 34, 56, 0.18)",
            }}
          >
            <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 className="brand" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <BarChart3 size={16} color={accent} />
                Ma collection
              </h2>
              <button onClick={() => setShowCollection(false)} style={{ background: "none", border: "none", padding: 4 }} aria-label="fermer">
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: `linear-gradient(135deg, ${activeGrade.accentLight} 0%, ${activeGrade.accent} 55%, ${activeGrade.accentDark} 100%)`,
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              <span className="mono" style={{ fontSize: 12, fontWeight: 800, color: "#152238" }}>
                {activeGrade.emoji} Habillage {activeGrade.label}
              </span>
              {nextGrade && (
                <span className="mono" style={{ fontSize: 10, color: "#152238", opacity: 0.85 }}>
                  {nextGrade.label} dans {nextGrade.threshold - lifetimeEstimations}
                </span>
              )}
            </div>

            {history.length === 0 ? (
              <p className="mono" style={{ fontSize: 13, color: pt.subText }}>
                Fais ta première estimation pour commencer à remplir ta collection.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: "14px 12px" }}>
                    <div className="mono" style={{ fontSize: 10, color: pt.subText, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Valeur estimée
                    </div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: accent }}>
                      {Math.round(portfolioValue)} €
                    </div>
                  </div>
                  <button
                    onClick={() => portfolioSortedByValueDesc.length > 0 && setShowScannedObjectsList(true)}
                    disabled={portfolioSortedByValueDesc.length === 0}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      background: pt.rowBg,
                      border: pt.rowBorder,
                      borderRadius: 10,
                      padding: "14px 12px",
                      cursor: portfolioSortedByValueDesc.length > 0 ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 10, color: pt.subText, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Objets scannés
                      </span>
                      {portfolioSortedByValueDesc.length > 0 && <ChevronRight size={11} color={pt.chevronColor} />}
                    </div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: pt.strongColor }}>
                      {scannedObjectsCount}
                    </div>
                  </button>
                </div>

                {portfolioStreak >= 2 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: `rgba(${accentRgb}, 0.12)`,
                      border: `1px solid rgba(${accentRgb}, 0.35)`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      marginBottom: 16,
                    }}
                  >
                    <Flame size={16} color={accent} />
                    <span className="mono" style={{ fontSize: 12, color: pt.rowText }}>
                      <strong>{portfolioStreak} jours</strong> de suite à checker des prix — continue comme ça !
                    </span>
                  </div>
                )}

                {portfolioChartPoints.length >= 2 && (
                  <div style={{ background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: 14, marginBottom: 16, position: "relative" }}>
                    <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}>
                      Valeur de ta collection dans le temps
                    </div>
                    <PriceEvolutionChart
                      theme={menuTheme}
                      points={isPremiumPlan ? portfolioChartPoints : portfolioChartPoints.slice(-5)}
                    />
                    {!isPremiumPlan && portfolioChartPoints.length > 5 && (
                      <button
                        onClick={() => {
                          setShowCollection(false);
                          setPaywallInfo(null);
                          setShowPaywall(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          marginTop: 12,
                          background: `rgba(${accentRgb}, 0.12)`,
                          border: `1px dashed rgba(${accentRgb}, 0.5)`,
                          borderRadius: 8,
                          padding: "9px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <Lock size={13} color={accent} />
                        <span className="mono" style={{ fontSize: 11, color: accent, textAlign: "left" }}>
                          Passe premium pour voir tes {portfolioChartPoints.length - 5} points d'historique en plus
                        </span>
                      </button>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: 6 }}>
                  <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}>
                    Badges
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {COLLECTION_BADGES.map((b) => {
                      const unlocked = b.test();
                      return (
                        <div
                          key={b.id}
                          title={b.label}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            background: pt.rowBg,
                            border: pt.rowBorder,
                            borderRadius: 10,
                            padding: "10px 6px",
                            opacity: unlocked ? 1 : 0.35,
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{b.emoji}</span>
                          <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center", lineHeight: 1.2 }}>
                            {b.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ Détail des objets scannés (du plus cher au moins cher) ============ */}
      {showScannedObjectsList && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 31,
          }}
          onClick={() => setShowScannedObjectsList(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(21, 34, 56, 0.18)",
            }}
          >
            <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h2 className="brand" style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <BarChart3 size={16} color={accent} />
                Objets scannés
              </h2>
              <button onClick={() => setShowScannedObjectsList(false)} style={{ background: "none", border: "none", padding: 4 }} aria-label="fermer">
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 14 }}>
              Du plus cher au moins cher — prix moyen de chaque objet, dont la somme fait ta{" "}
              <strong style={{ color: pt.rowText }}>valeur estimée</strong> ({Math.round(portfolioValue)} €).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {portfolioSortedByValueDesc.map((h, i) => {
                const avgPrice = Math.round((h.prix_bas + h.prix_haut) / 2);
                return (
                  <div
                    key={h.id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: pt.rowBg,
                      border: pt.rowBorder,
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: pt.chevronColor, width: 22, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    {h.image && (
                      <img
                        src={h.image}
                        alt=""
                        style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: pt.rowText,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.objet || "Objet"}
                      </div>
                      {h.categorie && (
                        <div className="mono" style={{ fontSize: 10, color: pt.subText }}>
                          {h.categorie}
                        </div>
                      )}
                    </div>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: accent, flexShrink: 0 }}>
                      {avgPrice} €
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ Menu principal (☰) ============ */}
      {showMenu && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(4, 6, 12, 0.45)",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Menu size={17} color={accent} />
                {t("menu_title")}
              </h2>
              <button
                onClick={() => setShowMenu(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                {
                  icon: <History size={16} color={accent} />,
                  label: t("menu_my_estimates"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowHistory(true);
                  },
                },
                {
                  icon: <Search size={16} color={accent} />,
                  label: t("menu_search_product"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowProductSearch(true);
                  },
                },
                {
                  icon: <TrendingUp size={16} color={accent} />,
                  label: t("menu_trending"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowTrending(true);
                    loadTrending();
                  },
                },
                {
                  icon: <Trophy size={16} color={accent} />,
                  label: t("menu_leaderboard"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowLeaderboard(true);
                  },
                },
                {
                  icon: <BarChart3 size={16} color={accent} />,
                  label: t("menu_collection"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowCollection(true);
                  },
                },
                {
                  icon: <Moon size={16} color={accent} />,
                  label: t("menu_display"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowDisplayPanel(true);
                  },
                },
                {
                  icon: <Sparkles size={16} color={accent} />,
                  label: t("menu_subscription"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowSubscriptionPanel(true);
                  },
                },
                {
                  icon: <Mail size={16} color={accent} />,
                  label: t("menu_contact"),
                  onClick: () => {
                    setShowMenu(false);
                    setShowContact(true);
                  },
                },
              ].map((row, i) => (
                <button
                  key={i}
                  onClick={row.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    background: pt.rowBg,
                    border: pt.rowBorder,
                    borderRadius: 10,
                    padding: "13px 14px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: pt.rowText,
                    cursor: "pointer",
                  }}
                >
                  {row.icon}
                  <span style={{ flex: 1 }}>{row.label}</span>
                  <ChevronRight size={14} color={pt.chevronColor} />
                </button>
              ))}

              <div style={{ background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: "13px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500, color: pt.rowText, marginBottom: 10 }}>
                  <Globe size={16} color={accent} />
                  <span style={{ flex: 1 }}>{t("menu_language")}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => setLang(l.key)}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: "8px 6px",
                        borderRadius: 8,
                        border: lang === l.key ? `2px solid ${accent}` : pt.langUnselectedBorder,
                        background: lang === l.key ? `rgba(${accentRgb}, 0.18)` : pt.langUnselectedBg,
                        fontSize: 11,
                        fontWeight: 500,
                        color: pt.rowText,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Affichage (Habillage + Fonds) ============ */}
      {showDisplayPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowDisplayPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(4, 6, 12, 0.45)",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Moon size={17} color={accent} />
                {t("menu_display")}
              </h2>
              <button
                onClick={() => setShowDisplayPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: pt.rowText, marginBottom: 8 }}>
                Habillage ({lifetimeEstimations} estimation{lifetimeEstimations > 1 ? "s" : ""} au total)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {GRADES.map((g) => {
                  const unlocked = lifetimeEstimations >= g.threshold;
                  const canSelect = unlocked || isOwnerPreview;
                  const isActive = activeGrade.key === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => canSelect && setSelectedGradeKey(g.key)}
                      title={
                        unlocked
                          ? g.label
                          : isOwnerPreview
                          ? `${g.label} — aperçu (verrouillé pour les autres comptes, débloqué à ${g.threshold} estimations)`
                          : `${g.label} — débloqué à ${g.threshold} estimations`
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: canSelect ? "pointer" : "default",
                        opacity: unlocked ? 1 : isOwnerPreview ? 0.75 : 0.4,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${g.accentLight} 0%, ${g.accent} 55%, ${g.accentDark} 100%)`,
                          border: isActive ? "3px solid #FFFFFF" : "2px solid rgba(255, 255, 255, 0.25)",
                          boxShadow: isActive ? `0 0 0 2px ${g.accent}` : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {!unlocked && <Lock size={12} color="#FFFFFF" />}
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center" }}>
                        {g.emoji} {g.label}
                      </span>
                      <span className="mono" style={{ fontSize: 8, color: unlocked ? "#4ADE80" : pt.chevronColor, textAlign: "center" }}>
                        {g.threshold === 0 ? "toujours" : unlocked ? "débloqué" : `${g.threshold} estim.`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {nextGrade && (
                <div className="mono" style={{ fontSize: 10, color: pt.chevronColor, marginTop: 8 }}>
                  Prochain palier : {nextGrade.label} à {nextGrade.threshold} estimations (
                  {lifetimeEstimations}/{nextGrade.threshold})
                </div>
              )}
            </div>

            <div style={{ borderTop: pt.dashedBorder, marginTop: 16, paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: pt.rowText, marginBottom: 8 }}>
                Fonds ({lifetimeAdGenerations} annonce{lifetimeAdGenerations > 1 ? "s" : ""} générée
                {lifetimeAdGenerations > 1 ? "s" : ""} au total)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {BG_SKINS.map((sk) => {
                  const unlocked = lifetimeAdGenerations >= sk.threshold;
                  const canSelect = unlocked || isOwnerPreview;
                  const isActive = activeBgSkin.key === sk.key;
                  return (
                    <button
                      key={sk.key}
                      onClick={() => canSelect && setSelectedBgSkinKey(sk.key)}
                      title={
                        unlocked
                          ? sk.label
                          : isOwnerPreview
                          ? `${sk.label} — aperçu (verrouillé pour les autres comptes, débloqué à ${sk.threshold} annonces générées)`
                          : `${sk.label} — débloqué à ${sk.threshold} annonces générées`
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: canSelect ? "pointer" : "default",
                        opacity: unlocked ? 1 : isOwnerPreview ? 0.75 : 0.4,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${sk.high} 0%, ${sk.mid} 55%, ${sk.base} 100%)`,
                          border: isActive ? "3px solid #FFFFFF" : sk.key === "platine" ? "2px solid rgba(217, 243, 255, 0.55)" : "2px solid rgba(255, 255, 255, 0.25)",
                          boxShadow: isActive
                            ? `0 0 0 2px ${sk.high}`
                            : sk.key === "platine"
                            ? `0 0 10px rgba(${hexToRgbString(sk.high)}, 0.55)`
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {!unlocked && <Lock size={12} color="#FFFFFF" />}
                        {unlocked && sk.key === "platine" && (
                          <span
                            aria-hidden="true"
                            className="sparkle"
                            style={{
                              position: "absolute",
                              top: -3,
                              right: -3,
                              fontSize: 10,
                              color: sk.high,
                              textShadow: `0 0 6px rgba(${hexToRgbString(sk.high)}, 0.9)`,
                            }}
                          >
                            ✦
                          </span>
                        )}
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center" }}>
                        {sk.emoji} {sk.label}
                      </span>
                      <span className="mono" style={{ fontSize: 8, color: unlocked ? "#4ADE80" : pt.chevronColor, textAlign: "center" }}>
                        {sk.threshold === 0 ? "toujours" : unlocked ? "débloqué" : `${sk.threshold} annonces`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {nextBgSkin && (
                <div className="mono" style={{ fontSize: 10, color: pt.chevronColor, marginTop: 8 }}>
                  Prochain fond : {nextBgSkin.label} à {nextBgSkin.threshold} annonces générées (
                  {lifetimeAdGenerations}/{nextBgSkin.threshold})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ Profil (connexion / déconnexion / avatar) ============ */}
      {showProfilePanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowProfilePanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(4, 6, 12, 0.45)",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <User size={17} color={accent} />
                Mon profil
              </h2>
              <button
                onClick={() => setShowProfilePanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            {renderAccountBlock()}
          </div>
        </div>
      )}

      {/* ============ Avatar (personnage à personnaliser) ============ */}
      {showAvatarPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowAvatarPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
              boxShadow: "0 -10px 30px rgba(4, 6, 12, 0.45)",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Smile size={17} color={accent} />
                {t("menu_avatar")}
              </h2>
              <button
                onClick={() => setShowAvatarPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            {!user ? (
              <p className="mono" style={{ fontSize: 12, color: pt.subText }}>
                {t("leaderboard_pseudo_login_required")}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 16 }}>
                  Personnalise ton personnage : il s'affiche à côté de ton pseudo dans le classement. Chaque coiffure, couleur ou accessoire se débloque en remplissant un défi — plus tu utilises l'appli, plus tu peux le personnaliser.
                </p>

                {isOwnerPreview && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: accent,
                      background: `rgba(${accentRgb}, 0.12)`,
                      border: `1px solid rgba(${accentRgb}, 0.35)`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      marginBottom: 14,
                    }}
                  >
                    Mode propriétaire : tu peux essayer tous les objets ci-dessous, même verrouillés (aperçu uniquement — les autres comptes doivent toujours remplir le défi).
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 8,
                    background: `radial-gradient(circle at 50% 30%, rgba(${accentRgb}, 0.16) 0%, transparent 70%)`,
                    borderRadius: 16,
                    padding: "16px 0 10px",
                  }}
                >
                  <AvatarSVG
                    skin={avatarSkinInput}
                    hairStyle={avatarHairStyleInput}
                    hairColor={avatarHairColorHex}
                    topColor={avatarTopColorHex}
                    accessory={avatarAccessoryInput}
                    gender={avatarGenderInput}
                    size={150}
                  />
                  <span
                    className="mono"
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: pt.subText, marginTop: 4 }}
                  >
                    c'est cette vignette qui s'affiche dans le classement et en haut à droite
                  </span>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}
                  >
                    Silhouette
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { id: "homme", label: "Homme" },
                      { id: "femme", label: "Femme" },
                    ].map((g) => {
                      const selected = avatarGenderInput === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setAvatarGenderInput(g.id)}
                          className="mono"
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: selected ? `2px solid ${accent}` : pt.rowBorder,
                            background: selected ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                            color: pt.rowText,
                            cursor: "pointer",
                          }}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}
                  >
                    Peau
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {AVATAR_SKIN_TONES.map((hex) => {
                      const selected = avatarSkinInput === hex;
                      return (
                        <button
                          key={hex}
                          onClick={() => setAvatarSkinInput(hex)}
                          title="Teinte de peau"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: hex,
                            border: selected ? `3px solid ${accent}` : "2px solid rgba(255, 255, 255, 0.25)",
                            boxShadow: selected ? `0 0 0 2px ${accent}` : "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {[
                  { category: "hairStyle", title: "Coiffure", kind: "avatar" },
                  { category: "hairColor", title: "Couleur de cheveux", kind: "swatch" },
                  { category: "topColor", title: "Couleur de vêtement", kind: "swatch" },
                  { category: "accessory", title: "Accessoire", kind: "avatar" },
                ].map(({ category, title, kind }) => {
                  const currentInput =
                    category === "hairStyle"
                      ? avatarHairStyleInput
                      : category === "hairColor"
                      ? avatarHairColorInput
                      : category === "topColor"
                      ? avatarTopColorInput
                      : avatarAccessoryInput;
                  return (
                    <div key={category} style={{ marginBottom: 20 }}>
                      <div
                        className="mono"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}
                      >
                        {title}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {AVATAR_WARDROBE[category].map((item) => {
                          const unlocked = item.free || item.test();
                          const selected = currentInput === item.id;
                          const clickable = unlocked || isOwnerPreview;
                          return (
                            <button
                              key={item.id}
                              onClick={() => pickAvatarItem(category, item.id)}
                              disabled={!clickable}
                              title={
                                unlocked
                                  ? item.label
                                  : isOwnerPreview
                                  ? `${item.label} — aperçu (verrouillé pour les autres comptes, ${item.hint})`
                                  : `${item.label} — ${item.hint}`
                              }
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                                width: 72,
                                background: selected ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                                border: selected ? `2px solid ${accent}` : pt.rowBorder,
                                borderRadius: 10,
                                padding: "8px 4px",
                                opacity: unlocked ? 1 : isOwnerPreview ? 0.75 : 0.4,
                                cursor: clickable ? "pointer" : "default",
                              }}
                            >
                              {kind === "avatar" ? (
                                <AvatarSVG
                                  skin={avatarSkinInput}
                                  hairStyle={category === "hairStyle" ? item.id : avatarHairStyleInput}
                                  hairColor={avatarHairColorHex}
                                  topColor={avatarTopColorHex}
                                  accessory={category === "accessory" ? item.id : "aucun"}
                                  gender={avatarGenderInput}
                                  size={38}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: avatarSwatchBg(item.hex),
                                    display: "block",
                                    border: "1px solid rgba(255,255,255,0.25)",
                                  }}
                                />
                              )}
                              <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center", lineHeight: 1.2 }}>
                                {item.label}
                              </span>
                              {!unlocked && (
                                <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <Lock size={8} color={pt.chevronColor} />
                                  <span className="mono" style={{ fontSize: 7, color: pt.chevronColor, textAlign: "center", lineHeight: 1.1 }}>
                                    {item.hint}
                                  </span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  className="btn-primary"
                  onClick={saveAvatar}
                  disabled={avatarSaving || !avatarDirty}
                  style={{ marginTop: 16, opacity: avatarSaving || !avatarDirty ? 0.6 : 1 }}
                >
                  {avatarSaving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  Enregistrer mon avatar
                </button>
                {avatarError && (
                  <div className="mono" style={{ fontSize: 11, color: pt.errorColor, marginTop: 8 }}>
                    {avatarError}
                  </div>
                )}
                {avatarSavedFlash && (
                  <div className="mono" style={{ fontSize: 11, color: "#4ADE80", marginTop: 8 }}>
                    Avatar enregistré !
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ Rechercher un produit ============ */}
      {showProductSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => {
            setShowProductSearch(false);
            setSearchCategory(null);
            setSearchQuery("");
            setSearchResults(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                {searchCategory && (
                  <button
                    onClick={() => {
                      setSearchCategory(null);
                      setSearchResults(null);
                    }}
                    style={{ background: "none", border: "none", padding: 0, display: "flex" }}
                    aria-label={t("back")}
                  >
                    <ChevronLeft size={18} color={pt.titleColor} />
                  </button>
                )}
                <Search size={17} color={accent} />
                {t("menu_search_product")}
              </h2>
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setSearchCategory(null);
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            {!searchCategory ? (
              <div>
                <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 12 }}>
                  {t("search_choose_category")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setSearchCategory(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        textAlign: "left",
                        background: pt.rowBg,
                        border: pt.rowBorder,
                        borderRadius: 8,
                        padding: "11px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: pt.rowText,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ flex: 1 }}>{c.label}</span>
                      <ChevronRight size={14} color={pt.chevronColor} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mono" style={{ fontSize: 11, color: accent, marginBottom: 10 }}>
                  {searchCategory.label}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runProductSearch(searchCategory.label + " " + searchQuery);
                    }}
                    placeholder={t("search_placeholder")}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: pt.inputBorder,
                      background: pt.inputBg,
                      color: pt.inputText,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => runProductSearch(searchCategory.label + " " + searchQuery)}
                    disabled={searchLoading || !searchQuery.trim()}
                    style={{ width: "auto", flexShrink: 0, padding: "10px 16px" }}
                  >
                    <Search size={14} />
                  </button>
                </div>

                {searchLoading && (
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: pt.subText, display: "flex", alignItems: "center", gap: 8, padding: "20px 0", justifyContent: "center" }}
                  >
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("search_loading")}
                  </div>
                )}
                {searchError && <p style={{ fontSize: 12, color: pt.errorColor }}>{searchError}</p>}

                {/* Tendances de la catégorie : affichées tant que l'utilisateur
                    n'a pas lancé sa propre recherche texte (voir searchResults
                    ci-dessous, qui prend le relais une fois une recherche faite). */}
                {!searchResults && !searchLoading && (
                  <div style={{ marginTop: 4 }}>
                    <div
                      className="mono"
                      style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: pt.rowText, marginBottom: 4 }}
                    >
                      {t("category_trending_title")}
                    </div>
                    <p style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 12 }}>
                      {t("category_trending_subtitle")}
                    </p>
                    {catTrendingLoadingKey === searchCategory.key && !catTrendingCache[searchCategory.key] && (
                      <div
                        className="mono"
                        style={{ fontSize: 12, color: pt.subText, display: "flex", alignItems: "center", gap: 8, padding: "20px 0", justifyContent: "center" }}
                      >
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("category_trending_loading")}
                      </div>
                    )}
                    {catTrendingError && !catTrendingCache[searchCategory.key] && (
                      <p style={{ fontSize: 12, color: pt.errorColor }}>{catTrendingError}</p>
                    )}
                    {catTrendingCache[searchCategory.key] &&
                      (catTrendingCache[searchCategory.key].length === 0 ? (
                        <p className="mono" style={{ fontSize: 12, color: pt.subText }}>
                          {t("category_trending_empty")}
                        </p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {catTrendingCache[searchCategory.key].map((it, i) => (
                            <ProductCard
                              key={i}
                              item={it}
                              theme={menuTheme}
                              accent={accent}
                              onEstimate={estimateFromListing}
                              estimateLabel={t("card_estimate_button")}
                              estimateTitle={t("card_estimate_title")}
                            />
                          ))}
                        </div>
                      ))}
                  </div>
                )}

                {searchResults &&
                  !searchLoading &&
                  (() => {
                    const items = ["leboncoin", "vinted", "ebay"].flatMap((src) =>
                      (searchResults[src]?.results || []).map((r) => ({ ...r, source: src }))
                    );
                    if (items.length === 0) {
                      return (
                        <p className="mono" style={{ fontSize: 12, color: pt.subText }}>
                          {t("search_empty")}
                        </p>
                      );
                    }
                    const sorted = sortSearchItems(items);
                    return (
                      <div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
                          {SEARCH_SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => setSearchSort(opt.key)}
                              className="mono"
                              style={{
                                flexShrink: 0,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "7px 12px",
                                borderRadius: 20,
                                border: searchSort === opt.key ? `1px solid ${accent}` : pt.chipBorder,
                                background: searchSort === opt.key ? accent : pt.chipBg,
                                color: searchSort === opt.key ? "#FFFFFF" : pt.chipText,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t(opt.label)}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {sorted.map((it, i) => (
                            <ProductCard
                              key={i}
                              item={it}
                              theme={menuTheme}
                              accent={accent}
                              onEstimate={estimateFromListing}
                              estimateLabel={t("card_estimate_button")}
                              estimateTitle={t("card_estimate_title")}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ Produits du moment ============ */}
      {showTrending && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowTrending(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <TrendingUp size={17} color={accent} />
                {t("trending_title")}
              </h2>
              <button
                onClick={() => setShowTrending(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 14 }}>{t("trending_subtitle")}</p>

            {trendingLoading && (
              <div
                className="mono"
                style={{ fontSize: 12, color: pt.subText, display: "flex", alignItems: "center", gap: 8, padding: "20px 0", justifyContent: "center" }}
              >
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("trending_loading")}
              </div>
            )}
            {trendingError && <p style={{ fontSize: 12, color: pt.errorColor }}>{trendingError}</p>}
            {trendingItems &&
              !trendingLoading &&
              (trendingItems.length === 0 ? (
                <p className="mono" style={{ fontSize: 12, color: pt.subText }}>
                  {t("trending_empty")}
                </p>
              ) : (
                (() => {
                  const totalPages = Math.max(1, Math.ceil(trendingItems.length / TRENDING_PAGE_SIZE));
                  const page = Math.min(trendingPage, totalPages);
                  const pageItems = trendingItems.slice((page - 1) * TRENDING_PAGE_SIZE, page * TRENDING_PAGE_SIZE);
                  return (
                    <div>
                      <div className="mono" style={{ fontSize: 11, color: pt.subText, marginBottom: 10 }}>
                        {trendingItems.length} {t("trending_count_suffix")}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                        {pageItems.map((it, i) => (
                          <ProductCard
                            key={(page - 1) * TRENDING_PAGE_SIZE + i}
                            item={it}
                            theme={menuTheme}
                            accent={accent}
                            onEstimate={estimateFromListing}
                            estimateLabel={t("card_estimate_button")}
                            estimateTitle={t("card_estimate_title")}
                          />
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                          <button
                            onClick={() => setTrendingPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="btn-ghost"
                            style={{
                              padding: "8px 12px",
                              borderColor: pt.ghostBorder,
                              color: pt.ghostColor,
                              background: pt.ghostBg,
                              opacity: page <= 1 ? 0.4 : 1,
                            }}
                            aria-label={t("back")}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="mono" style={{ fontSize: 12, color: pt.rowText }}>
                            {t("trending_page_label")} {page} / {totalPages}
                          </span>
                          <button
                            onClick={() => setTrendingPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="btn-ghost"
                            style={{
                              padding: "8px 12px",
                              borderColor: pt.ghostBorder,
                              color: pt.ghostColor,
                              background: pt.ghostBg,
                              opacity: page >= totalPages ? 0.4 : 1,
                            }}
                            aria-label="suivant"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ))}
          </div>
        </div>
      )}

      {/* ============ Classement ============ */}
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Trophy size={17} color={accent} />
                {t("leaderboard_title")}
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 14 }}>{t("leaderboard_subtitle")}</p>

            <div style={{ background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              {user ? (
                <>
                  <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: pt.rowText, marginBottom: 8 }}>
                    {t("leaderboard_pseudo_label")}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      value={pseudoInput}
                      onChange={(e) => {
                        setPseudoInput(e.target.value);
                        setPseudoError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePseudo();
                      }}
                      maxLength={20}
                      placeholder={t("leaderboard_pseudo_placeholder")}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        padding: "9px 11px",
                        borderRadius: 8,
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      className="btn-primary"
                      onClick={savePseudo}
                      disabled={pseudoSaving || !pseudoInput.trim() || pseudoInput.trim() === (profile && profile.pseudo)}
                      style={{ width: "auto", flexShrink: 0, padding: "9px 14px", fontSize: 12 }}
                    >
                      {t("leaderboard_pseudo_save")}
                    </button>
                  </div>
                  {pseudoError && (
                    <div className="mono" style={{ fontSize: 11, color: pt.errorColor, marginTop: 6 }}>
                      {pseudoError}
                    </div>
                  )}
                  {pseudoSavedFlash && (
                    <div className="mono" style={{ fontSize: 11, color: "#4ADE80", marginTop: 6 }}>
                      {t("leaderboard_pseudo_saved")}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowLeaderboard(false);
                      setShowAvatarPanel(true);
                    }}
                    className="mono"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginTop: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      color: accent,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
                      <AvatarSVG
                        skin={(profile && profile.avatar_skin) || AVATAR_DEFAULTS.skin}
                        hairStyle={(profile && profile.avatar_hair_style) || AVATAR_DEFAULTS.hairStyle}
                        hairColor={
                          (AVATAR_WARDROBE.hairColor.find((h) => h.id === ((profile && profile.avatar_hair_color) || AVATAR_DEFAULTS.hairColor)) || {}).hex ||
                          "#1A1A1A"
                        }
                        topColor={
                          (AVATAR_WARDROBE.topColor.find((h) => h.id === ((profile && profile.avatar_top_color) || AVATAR_DEFAULTS.topColor)) || {}).hex ||
                          "#5C6773"
                        }
                        accessory={(profile && profile.avatar_accessory) || AVATAR_DEFAULTS.accessory}
                        gender={(profile && profile.avatar_gender) || AVATAR_DEFAULTS.gender}
                        size={17}
                      />
                    </span>
                    Personnaliser mon avatar
                    <ChevronRight size={12} color={accent} />
                  </button>
                </>
              ) : (
                <div className="mono" style={{ fontSize: 12, color: pt.subText }}>
                  {t("leaderboard_pseudo_login_required")}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {[
                { key: "estimations", label: t("leaderboard_tab_estimations") },
                { key: "annonces", label: t("leaderboard_tab_ads") },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLeaderboardType(opt.key)}
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "7px 12px",
                    borderRadius: 20,
                    border: leaderboardType === opt.key ? `1px solid ${accent}` : pt.chipBorder,
                    background: leaderboardType === opt.key ? accent : pt.chipBg,
                    color: leaderboardType === opt.key ? "#FFFFFF" : pt.chipText,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { key: "month", label: t("leaderboard_period_month") },
                { key: "total", label: t("leaderboard_period_total") },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLeaderboardPeriod(opt.key)}
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 11px",
                    borderRadius: 20,
                    border: leaderboardPeriod === opt.key ? `1px solid ${accent}` : pt.chipBorder,
                    background: leaderboardPeriod === opt.key ? `rgba(${accentRgb}, 0.18)` : pt.chipBg,
                    color: leaderboardPeriod === opt.key ? accent : pt.chipText,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(() => {
              const cacheKey = `${leaderboardType}:${leaderboardPeriod}:20`;
              const rows = leaderboardCache[cacheKey];
              if (leaderboardLoadingKey === cacheKey && !rows) {
                return (
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: pt.subText, display: "flex", alignItems: "center", gap: 8, padding: "20px 0", justifyContent: "center" }}
                  >
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("leaderboard_loading")}
                  </div>
                );
              }
              if (leaderboardError && !rows) {
                return <p style={{ fontSize: 12, color: pt.errorColor }}>{leaderboardError}</p>;
              }
              if (!rows || rows.length === 0) {
                return (
                  <p className="mono" style={{ fontSize: 12, color: pt.subText }}>
                    {rows ? t("leaderboard_empty") : ""}
                  </p>
                );
              }
              const MEDALS = ["🥇", "🥈", "🥉"];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rows.map((row, i) => {
                    const isYou = !!(user && row.user_id === user.id);
                    // L'avatar de chaque joueur (peau/coiffure/couleurs/
                    // accessoire) est stocké côté serveur comme de simples
                    // ids/hex — on résout les couleurs de cheveux/vêtement via
                    // le même catalogue AVATAR_WARDROBE que celui qui sert à
                    // les débloquer chez soi.
                    const rowHairColor =
                      (AVATAR_WARDROBE.hairColor.find((h) => h.id === row.avatar_hair_color) || {}).hex || "#1A1A1A";
                    const rowTopColor =
                      (AVATAR_WARDROBE.topColor.find((h) => h.id === row.avatar_top_color) || {}).hex || "#5C6773";
                    return (
                      <div
                        key={row.user_id || i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: isYou ? `rgba(${accentRgb}, 0.14)` : pt.rowBg,
                          border: isYou ? `1px solid ${accent}` : pt.rowBorder,
                          borderRadius: 10,
                          padding: "9px 12px",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 13, fontWeight: 800, width: 26, color: i < 3 ? accent : pt.chevronColor }}>
                          {MEDALS[i] || i + 1}
                        </span>
                        <span style={{ flexShrink: 0, display: "flex" }}>
                          <AvatarSVG
                            skin={row.avatar_skin || AVATAR_DEFAULTS.skin}
                            hairStyle={row.avatar_hair_style || AVATAR_DEFAULTS.hairStyle}
                            hairColor={rowHairColor}
                            topColor={rowTopColor}
                            accessory={row.avatar_accessory || AVATAR_DEFAULTS.accessory}
                            gender={row.avatar_gender || AVATAR_DEFAULTS.gender}
                            size={22}
                          />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: isYou ? 700 : 500, color: pt.rowText }}>
                          {row.pseudo}
                          {isYou && (
                            <span className="mono" style={{ fontSize: 10, color: accent, marginLeft: 6 }}>
                              ({t("leaderboard_you")})
                            </span>
                          )}
                        </span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: pt.rowText, flexShrink: 0 }}>
                          {row.cnt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============ Abonnement ============ */}
      {showSubscriptionPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowSubscriptionPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Sparkles size={17} color={accent} />
                {t("subscription_title")}
              </h2>
              <button
                onClick={() => setShowSubscriptionPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            {user && profile ? (
              <div style={{ background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: 13, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, color: pt.rowText }}>
                    {t("subscription_current")}:{" "}
                    <strong style={{ color: pt.strongColor }}>
                      {profile.plan !== "gratuit" && profile.subscription_status === "active"
                        ? PLANS.find((p) => p.key === profile.plan)?.label || profile.plan
                        : t("subscription_free")}
                    </strong>
                    <div className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 2 }}>
                      {profile.plan !== "gratuit" && profile.subscription_status === "active"
                        ? `${Math.max(0, profile.quota_mensuel - profile.estimations_utilisees)}/${profile.quota_mensuel} ${t("subscription_remaining_paid")}`
                        : `${Math.max(0, 3 - profile.gratuit_utilisees)} ${t("subscription_remaining_free")}`}
                    </div>
                  </div>
                  {profile.stripe_customer_id && (
                    <button
                      className="btn-ghost"
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      style={{
                        flexShrink: 0,
                        borderColor: pt.ghostBorder,
                        color: pt.ghostColor,
                        background: pt.ghostBg,
                      }}
                    >
                      <CreditCard size={14} /> {portalLoading ? "…" : t("subscription_manage")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mono" style={{ fontSize: 12, color: pt.subText, marginBottom: 16 }}>
                {t("subscription_login_required")}
              </p>
            )}

            <div style={{ borderTop: pt.dashedBorder, paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 10 }}>
                {t("subscription_plans_title")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    className="btn-primary"
                    onClick={() => (user ? startCheckout(plan.key) : null)}
                    disabled={!user || checkoutLoading !== null}
                    style={{ justifyContent: "space-between", width: "100%", opacity: user ? 1 : 0.6 }}
                  >
                    <span>
                      {plan.label} — {plan.quota}/mois
                    </span>
                    <span>
                      {checkoutLoading === plan.key ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        plan.price
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Contact ============ */}
      {showContact && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 30,
          }}
          onClick={() => setShowContact(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: 21, margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Mail size={17} color={accent} />
                {t("contact_title")}
              </h2>
              <button
                onClick={() => setShowContact(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: pt.subText, lineHeight: 1.5, marginTop: 0 }}>{t("contact_text")}</p>
            <a
              href={"mailto:" + CONTACT_EMAIL}
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: pt.titleColor,
                background: pt.rowBg,
                border: pt.rowBorder,
                borderRadius: 8,
                padding: "12px 14px",
                textDecoration: "none",
              }}
            >
              <Mail size={14} color={accent} /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      )}

      {showPaywall && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 20,
          }}
          onClick={() => setShowPaywall(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "8px 8px 0 0",
              padding: "20px 16px 32px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 className="brand" style={{ fontSize: 20, margin: 0, color: pt.titleColor }}>
                Quota atteint
              </h2>
              <button
                onClick={() => setShowPaywall(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label="fermer"
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: pt.rowText, lineHeight: 1.5, marginTop: 0 }}>
              {paywallInfo?.reason === "quota_epuise" &&
                "Tu as utilisé toutes les estimations comprises dans ton abonnement ce mois-ci."}
              {paywallInfo?.reason === "gratuit_epuise" &&
                "Tu as utilisé tes estimations gratuites de ce mois-ci."}
              {!paywallInfo?.reason && "Impossible de continuer l'estimation pour l'instant."}
            </p>
            {paywallInfo?.message && (
              <p style={{ fontSize: 12, color: accent, marginTop: 0 }}>{paywallInfo.message}</p>
            )}

            {(paywallInfo?.bonus_pub_disponible ||
              (paywallInfo?.reason === "gratuit_epuise" && paywallInfo?.pubs_restantes > 0)) && (
              <button
                className="btn-ghost"
                onClick={watchAdForBonus}
                disabled={adWatching}
                style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
              >
                {adWatching ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> visionnage en cours…
                  </>
                ) : (
                  <>
                    <PlayCircle size={14} /> regarder une pub pour 1 estimation gratuite
                  </>
                )}
              </button>
            )}

            <div style={{ borderTop: pt.dashedBorder, paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 10 }}>
                ou passe à un abonnement pour beaucoup plus d'estimations :
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    className="btn-primary"
                    onClick={() => startCheckout(plan.key)}
                    disabled={checkoutLoading !== null}
                    style={{ justifyContent: "space-between", width: "100%" }}
                  >
                    <span>
                      {plan.label} — {plan.quota}/mois
                    </span>
                    <span>
                      {checkoutLoading === plan.key ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        plan.price
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
