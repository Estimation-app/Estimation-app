import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, Upload, Loader2, Tag, RotateCcw, History, Trash2, X, Mail, LogOut, Eye, EyeOff, Mic, MicOff, Sparkles, PlayCircle, CreditCard, Menu, Search, TrendingUp, TrendingDown, Globe, ChevronRight, ChevronLeft, ExternalLink, Moon, Share2, Trophy, Flame, Link2, Lock, Copy, Gift, BarChart3, Smile, User, Download, Plus, Minus } from "lucide-react";
import logoWordmarkLight from "./assets/logo-wordmark-light.png";
import logoWordmarkDark from "./assets/logo-wordmark.png";
// Fonds d'écran par affichage (générés avec Google Flow — Nano Banana Pro,
// à partir d'une capture de l'appli + un prompt par thème, demandé par
// Dylan en remplacement des décors CSS/SVG précédents) — voir leur usage
// dans AFFICHAGES ci-dessous.
import decorVintage from "./assets/decor-vintage.jpg";
import decorRetro from "./assets/decor-retro.jpg";
import decorRobotique from "./assets/decor-robotique.jpg";
import decorFuturiste from "./assets/decor-futuriste.jpg";

// Portraits réels (générés avec Google Flow — Nano Banana Pro, cf. doc de
// prompts) — ce sont les SEULS avatars possibles désormais (l'ancien
// moteur de dessin SVG "chibi/manga" est complètement abandonné). Tant
// qu'un personnage n'a pas encore son portrait, il n'apparaît pas du tout
// dans CHARACTERS_META plus bas — Dylan les ajoute au catalogue au fur et
// à mesure qu'il envoie les images.
import charChineur from "./assets/chineur.jpg";
import charChineuse from "./assets/chineuse.jpg";
import charRenard from "./assets/renard.jpg";
import charHibouSage from "./assets/hibouSage.jpg";
import charCapitainePirate from "./assets/capitainePirate.jpg";
import charAstroDebutant from "./assets/astroDebutant.jpg";
import charLoupDetective from "./assets/loupDetective.jpg";
import charTigreStyle from "./assets/tigreStyle.jpg";
import charSorciereFutee from "./assets/sorciereFutee.jpg";
import charAlienCurieux from "./assets/alienCurieux.jpg";
import charNinjaSilencieux from "./assets/ninjaSilencieux.jpg";
import charRobotChrome from "./assets/robotChrome.jpg";
import charBebeDragon from "./assets/bebeDragon.jpg";
import charPieuvreMystique from "./assets/pieuvreMystique.jpg";
import charPhenixArdent from "./assets/phenixArdent.jpg";
import charGriffonCeleste from "./assets/griffonCeleste.jpg";
import charChevalierDore from "./assets/chevalierDore.jpg";
import charSpectreElegant from "./assets/spectreElegant.jpg";
import charDiableEcarlate from "./assets/diableEcarlate.jpg";
import charLapin from "./assets/lapin.jpg";
import charPanthereNuit from "./assets/panthereNuit.jpg";
import charRatonMasque from "./assets/ratonMasque.jpg";

// Portraits "en action" (même personnage, corps entier, prêt à scanner un
// objet) — utilisés en incrustation semi-transparente PLEIN CADRE dans le
// cadre "prendre une photo" (voir plus bas, mode "immersif"), à la place du
// texte "Ajoute une photo" / "choisir un fichier", uniquement quand un
// avatar est réellement sélectionné (voir hasChosenAvatar plus bas). Pas
// dans le reste de l'avatar. Détourés à la main (fond transparent) à partir
// des générations Nano Banana de Dylan. Tant qu'un personnage n'a pas
// encore la sienne, il n'apparaît simplement pas dans CHARACTER_ACTION_IMAGES
// et le cadre photo reste en mode "de base" (avec le texte) pour ce
// personnage (pas de génération de repli).
//
// `aimX` / `aimY` = position (fraction de la largeur/hauteur de l'image,
// peut dépasser 1 = un point situé hors de l'image) alignée avec le centre
// du cadre, où se trouve l'icône appareil photo. Ce point est calculé en
// PROLONGEANT la droite qui va du regard (yeux) du personnage jusqu'au
// centre de sa loupe/son outil, un peu plus loin dans le vide juste à côté
// — ainsi les yeux, la loupe et l'icône appareil photo sont exactement
// alignés en ligne droite, et la loupe se retrouve juste à côté de l'icône
// (visée), sans la recouvrir. `scale` = hauteur du personnage en % de la
// hauteur du cadre. À mesurer/calculer au cas par cas pour chaque nouveau
// personnage selon sa posture (pas de valeur par défaut qui pourrait être
// fausse).
import charChineurAction from "./assets/chineurAction.png";
import charChineuseAction from "./assets/chineuseAction.png";
import charRenardAction from "./assets/renardAction.png";
import charChevalierDoreAction from "./assets/chevalierDoreAction.png";
import charNinjaSilencieuxAction from "./assets/ninjaSilencieuxAction.png";
import charAlienCurieuxAction from "./assets/alienCurieuxAction.png";
import charSorciereFuteeAction from "./assets/sorciereFuteeAction.png";
import charTigreStyleAction from "./assets/tigreStyleAction.png";
import charLoupDetectiveAction from "./assets/loupDetectiveAction.png";
import charAstroDebutantAction from "./assets/astroDebutantAction.png";
import charHibooAction from "./assets/hibooAction.png";
import charLapinAction from "./assets/lapinAction.png";
import charRobotChromeAction from "./assets/robotChromeAction.png";
import charPieuvreMystiqueAction from "./assets/pieuvreMystiqueAction.png";
import charDiableEcarlateAction from "./assets/diableEcarlateAction.png";
import charSpectreElegantAction from "./assets/spectreElegantAction.png";
import charPanthereNuitAction from "./assets/panthereNuitAction.png";
import charGriffonCelesteAction from "./assets/griffonCelesteAction.png";
import charPhenixArdentAction from "./assets/phenixArdentAction.png";
import charRatonMasqueAction from "./assets/ratonMasqueAction.png";
import charCapitainePirateAction from "./assets/capitainePirateAction.png";
import charBebeDragonAction from "./assets/bebeDragonAction.png";

const CHARACTER_ACTION_IMAGES = {
  // Le Chineur : ici le personnage regarde à travers sa loupe collée à son
  // œil — l'icône appareil photo est donc posée PILE au centre de la loupe
  // (aimX/aimY = centre exact de la loupe, pas de décalage), comme s'il
  // l'observait à travers elle.
  chineur: { src: charChineurAction, aimX: 0.333, aimY: 0.325, scale: 0.76 },
  // La Chineuse : même principe que Le Chineur, loupe collée à l'œil,
  // icône posée pile au centre du verre.
  chineuse: { src: charChineuseAction, aimX: 0.456, aimY: 0.296, scale: 0.77 },
  // Lot de 13 personnages "corps entier, loupe collée à l'œil" (même
  // principe que Chineur/Chineuse : icône pile au centre du verre, sans
  // décalage), mesurés par détourage + repérage précis du centre de la
  // loupe, taille (scale) harmonisée à 0.75 pour tout le lot.
  renard: { src: charRenardAction, aimX: 0.44, aimY: 0.365, scale: 0.75 },
  chevalierDore: { src: charChevalierDoreAction, aimX: 0.495, aimY: 0.45, scale: 0.75 },
  ninjaSilencieux: { src: charNinjaSilencieuxAction, aimX: 0.46, aimY: 0.42, scale: 0.75 },
  alienCurieux: { src: charAlienCurieuxAction, aimX: 0.56, aimY: 0.39, scale: 0.75 },
  sorciereFutee: { src: charSorciereFuteeAction, aimX: 0.48, aimY: 0.41, scale: 0.88 },
  tigreStyle: { src: charTigreStyleAction, aimX: 0.51, aimY: 0.41, scale: 0.75 },
  loupDetective: { src: charLoupDetectiveAction, aimX: 0.62, aimY: 0.325, scale: 0.75 },
  astroDebutant: { src: charAstroDebutantAction, aimX: 0.33, aimY: 0.33, scale: 0.78 },
  hiboo: { src: charHibooAction, aimX: 0.46, aimY: 0.415, scale: 0.75 },
  lapin: { src: charLapinAction, aimX: 0.51, aimY: 0.33, scale: 0.79 },
  // Lot de 12 personnages "buste, loupe collée à l'œil" (portraits plus
  // carrés, sans le corps entier) — même principe (icône pile au centre du
  // verre), taille (scale) harmonisée à 0.68 pour tout le lot (un peu
  // moins que le lot "corps entier" ci-dessus car ces images sont plus
  // carrées / prennent plus de largeur à hauteur égale).
  robotChrome: { src: charRobotChromeAction, aimX: 0.39, aimY: 0.37, scale: 0.78 },
  pieuvreMystique: { src: charPieuvreMystiqueAction, aimX: 0.62, aimY: 0.37, scale: 0.76 },
  diableEcarlate: { src: charDiableEcarlateAction, aimX: 0.53, aimY: 0.44, scale: 0.77 },
  spectreElegant: { src: charSpectreElegantAction, aimX: 0.56, aimY: 0.41, scale: 0.73 },
  panthereNuit: { src: charPanthereNuitAction, aimX: 0.68, aimY: 0.46, scale: 0.72 },
  griffonCeleste: { src: charGriffonCelesteAction, aimX: 0.53, aimY: 0.44, scale: 0.72 },
  phenixArdent: { src: charPhenixArdentAction, aimX: 0.58, aimY: 0.39, scale: 0.72 },
  ratonMasque: { src: charRatonMasqueAction, aimX: 0.52, aimY: 0.38, scale: 0.68 },
  capitainePirate: { src: charCapitainePirateAction, aimX: 0.32, aimY: 0.40, scale: 0.82 },
  bebeDragon: { src: charBebeDragonAction, aimX: 0.525, aimY: 0.45, scale: 0.68 },
};

const CHARACTER_IMAGES = {
  chineur: charChineur,
  chineuse: charChineuse,
  renard: charRenard,
  hiboo: charHibouSage,
  capitainePirate: charCapitainePirate,
  astroDebutant: charAstroDebutant,
  loupDetective: charLoupDetective,
  tigreStyle: charTigreStyle,
  sorciereFutee: charSorciereFutee,
  alienCurieux: charAlienCurieux,
  ninjaSilencieux: charNinjaSilencieux,
  robotChrome: charRobotChrome,
  bebeDragon: charBebeDragon,
  pieuvreMystique: charPieuvreMystique,
  phenixArdent: charPhenixArdent,
  griffonCeleste: charGriffonCeleste,
  chevalierDore: charChevalierDore,
  spectreElegant: charSpectreElegant,
  diableEcarlate: charDiableEcarlate,
  lapin: charLapin,
  panthereNuit: charPanthereNuit,
  ratonMasque: charRatonMasque,
};

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

// Libellé + couleur affichés pour chaque niveau de confiance d'une
// estimation (voir result.confiance). "#4ADE80" et l'accent de marque sont
// déjà utilisés ailleurs dans l'appli pour signaler respectivement une
// donnée fiable et une donnée standard — on réutilise ces mêmes couleurs
// ici plutôt que d'en introduire de nouvelles.
// Couleurs seulement (langue-agnostique) — le libellé traduit est calculé à
// la volée par confidenceInfo() à l'intérieur du composant App, via les clés
// confidence_haute/moyenne/basse/indicative de TRANSLATIONS (le texte ne
// peut plus être figé ici : ce tableau est en dehors du composant, donc en
// dehors de t()/lang).
const CONFIDENCE_DOTS = {
  haute: "#4ADE80",
  moyenne: null, // null = utilise l'accent de marque (variable selon le thème de l'utilisateur)
  basse: "muted",
  indicative: "muted",
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

// Les 4 abonnements payants (voir STRIPE_PRICES dans worker.js pour les IDs
// de prix réels côté serveur — le front n'envoie que la clé du plan). "bonus"
// est le nombre d'estimations offertes en plus du quota, une seule fois au
// moment de la souscription (voir SIGNUP_BONUS et le webhook Stripe dans
// worker.js pour l'octroi réel côté serveur — ce champ ne sert qu'à
// l'affichage ici).
const PLANS = [
  { key: "debutant", label: "Starter", price: "2,99 €/mois", quota: 20, bonus: 3 },
  { key: "pro", label: "Pro", price: "9,99 €/mois", quota: 100, bonus: 8 },
  { key: "premium", label: "Premium", price: "24,99 €/mois", quota: 300, bonus: 20 },
  { key: "elite", label: "Elite", price: "69,99 €/mois", quota: 1000, bonus: 50 },
];

// Achat d'estimations "à l'unité" (hors abonnement) : 0,30 € pièce, sans
// aucune remise sur le prix — seul avantage, tous les 100 estimations
// achetées (payées) donnent 10 estimations offertes en plus, sans limite
// (200 achetées → 20 offertes, etc.). Toujours plus cher à l'unité que le
// pack Starter (0,1495 €/estimation) même à très gros volume, comme exigé.
// Le prix réel facturé est recalculé côté serveur (worker.js) — cette
// constante ne sert qu'à l'affichage ici. Aucune quantité maximale côté
// front (demandé par Dylan) : seul le minimum de 1 est imposé.
const CREDIT_UNIT_PRICE = 0.3;
const CREDIT_BONUS_PER_HUNDRED = 10;

// Rang de plan d'abonnement, partagé par le déblocage des avatars
// (CHARACTERS_META plus bas) — voir userPlanRank plus bas. L'ancien système
// d'"habillages" bronze/argent/or/diamant lié au plan (indépendant du thème
// visuel) a été retiré à la demande de Dylan : l'accent visuel suit
// désormais simplement le thème choisi (AFFICHAGES, plus haut), voir
// `accent`/`accentDark`/`accentLight`/`glow` sur chaque affichage.
const PLAN_GRADE_RANK = { gratuit: 0, debutant: 1, pro: 2, premium: 3, elite: 4 };

// Convertit un hex ("#RRGGBB") en triplet "r, g, b" pour construire des
// rgba(...) dynamiques (bordures/fonds translucides) à partir de l'accent
// de l'affichage actif.
function hexToRgbString(hex) {
  const clean = (hex || "").replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

// "Affichages" : styles visuels sélectionnables pour TOUTE l'application —
// remplace l'ancien système de "Fonds" (paliers de couleur débloqués par
// jours de connexion). Chaque affichage change les polices d'écriture, les
// couleurs d'arrière-plan et les contours (bordures/séparateurs), mais NE
// TOUCHE JAMAIS à la disposition, aux tailles de texte ni aux dimensions
// des cadres/panneaux — ceux-ci restent strictement identiques d'un
// affichage à l'autre (seuls les tokens de couleur/police de pt.* et les
// deux polices `.brand`/`.mono` changent, voir `const pt = ...` plus bas
// dans le composant). "Classique" correspond exactement au look actuel de
// l'appli (aucune surcharge : reprend PANEL_THEMES.dark tel quel) et reste
// le choix par défaut. Le mécanisme de déblocage (aujourd'hui : tous
// disponibles d'emblée, `threshold: 0` pour chacun) sera revu plus tard —
// voir la sélection juste avant `const pt = ...`.
//
// `base`/`mid`/`high` (optionnels) : reconstruisent, comme avant, les
// grandes surfaces (page/panneaux/header/carte résultat/écran de
// chargement/zone photo) via un dégradé base → mid → high propre à
// l'affichage — absent pour "Classique" (surfaces d'origine inchangées).
// `borderRgb` (optionnel) : teinte (r, g, b) utilisée pour recolorer les
// contours (bordures de lignes/chips/champs/pointillés/cartes) tout en
// conservant exactement les mêmes épaisseurs/styles ("1px solid",
// "1px dashed"...) qu'aujourd'hui — absent pour "Classique" (contours
// d'origine inchangés).
// `displayLetterSpacing`/`displayTransform` (titres `.brand`) et
// `bodyLetterSpacing`/`bodyTransform` (texte `.mono`, y compris certaines
// phrases entières — voir plus bas) : accentuent encore le caractère de la
// police choisie (ex : tout en capitales et très espacé pour un rendu
// "terminal"/"panneau lumineux") sans changer la taille du texte.
// `radiusScale` (optionnel, défaut 1) : multiplie l'arrondi des coins des
// éléments réutilisables (boutons, zone photo, "ticket" de résultat) —
// PAS celui des grands panneaux/en-têtes, qui gardent leur taille/forme
// d'origine — pour faire ressentir l'ambiance jusque dans les formes
// (ex : coins nets et anguleux pour "Robotique", très arrondis/capsule
// pour "Futuriste") sans jamais changer une dimension.
// `texture` (optionnel) : calques `background-image` décoratifs (grain,
// vignette, trame, lignes de scan...), posés sous la couleur de fond de la
// page uniquement — n'affecte ni la disposition ni aucune taille.
// `textStrong`/`textSoft` (optionnels) : pour un affichage clair (ex:
// Vintage) — voir le détail juste avant `function brandSize` plus bas
// dans le composant.
// `displayScale` (optionnel, défaut 1) : voir `brandSize()` plus bas — clé
// pour les polices très larges (Orbitron, Bungee...) afin qu'une phrase
// comme l'accroche reste sur une seule ligne comme en "Classique".
// `heroScale` (optionnel, défaut 1) : réduit spécifiquement le titre et le
// sous-titre de l'accroche d'accueil ("Combien ça vaut, vraiment ?" + la
// phrase "Meuble, bijoux, vieux jouet...") — indépendant de `displayScale`
// (qui s'applique à tous les titres `.brand` de l'appli) car Dylan a
// signalé que seule cette accroche paraissait trop grande sur Vintage/
// Rétro/Robotique (Futuriste allait déjà bien).
// `decor` (optionnel) : calque(s) `background-image` décoratifs
// supplémentaires, en rapport avec le thème (tampon/étoile pour Vintage,
// soleil synthwave pour Rétro, circuits pour Robotique, étoiles/anneau
// pour Futuriste...), posés AU-DESSUS de `texture` — ancrés en pixels
// depuis le haut (jamais en % vertical, le conteneur grandit avec le
// contenu) pour rester groupés près du header/de l'accroche quelle que
// soit la longueur de la page. Purement décoratif, n'affecte ni la
// disposition ni aucune taille.
// `accent`/`accentDark`/`accentLight` (obligatoires) : la couleur de mise
// en avant de CET affichage (boutons, prix, liens, titre "vraiment ?"...) —
// remplace l'ancien système de paliers d'abonnement (bronze/argent/or/
// diamant, indépendant du thème visuel) : Dylan voulait que l'accent suive
// simplement le thème choisi, de façon cohérente/esthétique, plutôt qu'un
// habillage lié au plan souscrit. Reprend en général la teinte `high` du
// thème (accent = high) avec une variante plus foncée/plus claire adaptée.
// `glow` (obligatoire, 0 à ~0.4) : intensité de la lueur autour des
// boutons/cartes/prix — feutrée pour les thèmes discrets (Classique,
// Vintage), plus marquée pour les thèmes "néon" (Rétro, Robotique,
// Futuriste).
function svgBg(svg) {
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

const AFFICHAGES = [
  {
    key: "classique",
    threshold: 0,
    label: "Classique",
    emoji: "🔷",
    mode: "dark",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter', sans-serif",
    decor:
      "radial-gradient(circle at 10% 20px, rgba(240, 200, 120, 0.10) 0, transparent 46%), radial-gradient(circle at 94% -40px, rgba(240, 200, 120, 0.09) 0, transparent 40%)",
    // Orange de marque d'origine — voir la note juste au-dessus d'AFFICHAGES
    // sur `accent`/`accentDark`/`accentLight`/`glow` (remplace l'ancien
    // système de paliers bronze/argent/or/diamant, supprimé).
    accent: "#F2662E",
    accentDark: "#E0501D",
    accentLight: "#FF8A52",
    glow: 0,
  },
  {
    // Variante claire de "Classique", demandée par Dylan : même typo/mise en
    // page, juste un fond blanc avec le texte courant en bleu nuit très
    // foncé (quasi noir) au lieu du navy sombre d'origine — l'orange de
    // marque reste identique. Aucun base/mid/high ici (comme "Classique") :
    // reprend PANEL_THEMES.blanc tel quel, voir plus bas.
    key: "blanc",
    threshold: 0,
    label: "Classique blanc",
    emoji: "⚪",
    mode: "blanc",
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Inter', sans-serif",
    accent: "#F2662E",
    accentDark: "#E0501D",
    accentLight: "#FF8A52",
    glow: 0,
  },
  {
    // Repris de la proposition "brocante & tampon" (maquette validée par
    // Dylan) : papier clair, encre foncée, typo affiche condensée + machine
    // à écrire — plus proche de cette DA que la première version (sépia
    // sombre) qui ne se distinguait pas assez de "Classique".
    key: "vintage",
    threshold: 0,
    label: "Vintage",
    emoji: "📜",
    mode: "light",
    // Anton (police d'affiche condensée) remplacée par Playfair Display à
    // la demande de Dylan, qui n'aimait pas cette police sur le titre
    // d'accroche — Playfair Display est une serif élégante à fort
    // contraste, courante sur les visuels vintage/brocante, et se lit très
    // bien en casse normale (contrairement à Anton, pensée pour les
    // capitales) : plus de transformation uppercase forcée sur ce thème.
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Courier Prime', monospace",
    bodyLetterSpacing: "0.04em",
    heroScale: 0.85,
    base: "#EDE3CE",
    // mid/high plus soutenus (plus saturés, moins "délavés") qu'au premier
    // essai pour que les panneaux/écran de chargement aient davantage de
    // présence une fois qu'on quitte la page principale.
    mid: "#DCC89C",
    high: "#B8791E",
    borderRgb: "43, 36, 28",
    textStrong: "#2B241C",
    textSoft: "#6B5D48",
    radiusScale: 0.25,
    // Ambre/brun cuivré assorti au "high" ci-dessus (au lieu de l'ancien
    // accent de palier d'abonnement, indépendant du thème) — glow très
    // discret, cohérent avec l'esprit papier/brocante feutré.
    accent: "#B8791E",
    accentDark: "#8C5225",
    accentLight: "#E7A876",
    glow: 0.12,
    // Historique : "très blanc neutre" (v1) → grain papier ajouté, "trop
    // texturé, trop de petits points" (v2, bruit fractal retiré, taches
    // douces seulement) → "encore trop monotone" (v3) : Dylan voulait des
    // nuances plus marquées façon parchemin, comme des endroits "un peu
    // brûlés" ou plus vieillis, pas juste une teinte uniforme. Ajout de
    // quelques taches "brûlées" à dégradé plus contrasté (cœur plus foncé,
    // brun brûlé, qui se fond ensuite) dans les coins/bords — en plus des
    // taches douces existantes (nuance d'ensemble) et du hachurage carton.
    texture: [
      "radial-gradient(circle at 4% 6%, rgba(66,45,22,0.24) 0%, rgba(66,45,22,0.10) 24%, transparent 46%)",
      "radial-gradient(circle at 95% 5%, rgba(84,54,20,0.20) 0%, rgba(84,54,20,0.07) 26%, transparent 48%)",
      "radial-gradient(circle at 92% 72%, rgba(58,38,18,0.22) 0%, rgba(58,38,18,0.08) 24%, transparent 46%)",
      "radial-gradient(circle at 10% 94%, rgba(66,45,22,0.20) 0%, rgba(66,45,22,0.08) 25%, transparent 48%)",
      "radial-gradient(circle at 18% 22%, rgba(43,36,28,0.11) 0, transparent 40%)",
      "radial-gradient(circle at 84% 10%, rgba(184,121,30,0.10) 0, transparent 40%)",
      "radial-gradient(circle at 62% 66%, rgba(43,36,28,0.11) 0, transparent 46%)",
      "radial-gradient(circle at 8% 86%, rgba(107,93,72,0.11) 0, transparent 44%)",
      "radial-gradient(circle at 46% 40%, rgba(184,121,30,0.07) 0, transparent 50%)",
      "radial-gradient(circle at 30% 96%, rgba(139,110,60,0.09) 0, transparent 48%)",
      "repeating-linear-gradient(45deg, rgba(43,36,28,0.05) 0px, rgba(43,36,28,0.05) 1px, transparent 1px, transparent 3px)",
    ].join(", "),
    // Fond généré par IA (Google Flow — Nano Banana Pro) à partir d'une
    // capture de l'appli + prompt dédié : dimensionné sur la largeur du
    // conteneur, hauteur proportionnelle (jamais "cover" plein cadre) et
    // ancré en haut — comme les anciens décors SVG, pour ne pas s'étirer
    // de façon disproportionnée sur une page longue (le conteneur grandit
    // avec le contenu). texture/pageBg restent dessous, visibles une fois
    // l'image terminée plus bas dans la page. v3 (Dylan trouvait les
    // versions précédentes trop chargées) : quasiment du papier uni, avec
    // juste un timbre et une étiquette tout en haut des coins — plus
    // besoin du décalage vertical de la v2 (qui servait à éviter
    // l'appareil photo, absent ici).
    decor: `url(${decorVintage}) top center / 100% auto no-repeat`,
  },
  {
    key: "retro",
    threshold: 0,
    label: "Rétro",
    emoji: "📼",
    mode: "dark",
    fontDisplay: "'Bungee', cursive",
    fontBody: "'Space Mono', monospace",
    displayTransform: "uppercase",
    displayScale: 0.85,
    heroScale: 0.85,
    bodyLetterSpacing: "0.02em",
    bodyTransform: "uppercase",
    base: "#170B2E",
    mid: "#3A1268",
    // Rose adouci (Dylan trouvait l'image globale trop agressive/fatigante
    // pour les yeux, notamment le dégradé du bandeau titre vers le rose) —
    // moins saturé/moins "néon pur" que le rose d'origine (#FF2E92), tout
    // en restant clairement dans l'esprit synthwave.
    high: "#E2699D",
    borderRgb: "226, 105, 157",
    radiusScale: 1.4,
    accent: "#E2699D",
    accentDark: "#A13E6C",
    accentLight: "#F0A8C7",
    glow: 0.22,
    texture:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 18% 14%, rgba(226,105,157,0.11) 0, transparent 40%), radial-gradient(circle at 86% 82%, rgba(110,30,230,0.13) 0, transparent 46%)",
    // Fond généré par IA (Google Flow — Nano Banana Pro) — voir note sur
    // "Vintage" ci-dessus.
    decor: `url(${decorRetro}) top center / 100% auto no-repeat`,
  },
  {
    key: "robotique",
    threshold: 0,
    label: "Robotique",
    emoji: "🤖",
    mode: "dark",
    fontDisplay: "'Orbitron', sans-serif",
    fontBody: "'Share Tech Mono', monospace",
    displayLetterSpacing: "0.03em",
    displayTransform: "uppercase",
    displayScale: 0.78,
    heroScale: 0.85,
    bodyLetterSpacing: "0.02em",
    bodyTransform: "uppercase",
    base: "#0B0F0D",
    mid: "#1E2E28",
    // Vert légèrement adouci (Dylan : un peu fort pour les yeux, quoique
    // moins gênant que le rose de Rétro) — un cran moins vif que
    // l'original (#3FE0A5).
    high: "#3FCB98",
    borderRgb: "63, 203, 152",
    radiusScale: 0,
    accent: "#3FCB98",
    accentDark: "#1C8A66",
    accentLight: "#9EE8C9",
    glow: 0.2,
    texture:
      "repeating-linear-gradient(0deg, rgba(63,203,152,0.05) 0px, rgba(63,203,152,0.05) 1px, transparent 1px, transparent 26px), repeating-linear-gradient(90deg, rgba(63,203,152,0.05) 0px, rgba(63,203,152,0.05) 1px, transparent 1px, transparent 26px)",
    // Fond généré par IA (Google Flow — Nano Banana Pro) — voir note sur
    // "Vintage" ci-dessus.
    decor: `url(${decorRobotique}) top center / 100% auto no-repeat`,
  },
  {
    // Police d'affiche passée de Michroma (bien plus large que Fraunces au
    // même corps, provoquait des débordements/retours à la ligne sur
    // l'accroche) à Rajdhani, tout aussi futuriste mais condensée.
    key: "futuriste",
    threshold: 0,
    label: "Futuriste",
    emoji: "🚀",
    mode: "dark",
    fontDisplay: "'Rajdhani', sans-serif",
    fontBody: "'Chakra Petch', sans-serif",
    displayLetterSpacing: "0.04em",
    displayTransform: "uppercase",
    displayScale: 0.92,
    bodyLetterSpacing: "0.02em",
    bodyTransform: "uppercase",
    base: "#040912",
    mid: "#0E2A44",
    high: "#33C9FF",
    borderRgb: "51, 201, 255",
    radiusScale: 1.8,
    // Cyan assorti au "high" ci-dessus — glow le plus marqué des 5, pour un
    // rendu néon/sci-fi assumé.
    accent: "#33C9FF",
    accentDark: "#1E7FA3",
    accentLight: "#D6F6FF",
    glow: 0.36,
    texture:
      "radial-gradient(circle at 80% 8%, rgba(51,201,255,0.16) 0, transparent 38%), radial-gradient(circle at 10% 88%, rgba(51,201,255,0.10) 0, transparent 42%), repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 5px)",
    // Fond généré par IA (Google Flow — Nano Banana Pro) — voir note sur
    // "Vintage" ci-dessus. Le champ d'étoiles tuilé en CSS (qui vivait ici)
    // a été remplacé par de vraies petites étoiles scintillantes dans le
    // header (voir plus bas dans le composant, à côté des étincelles) —
    // Dylan voulait qu'elles brillent/clignotent, ce qu'un simple calque
    // `background-image` statique ne permet pas.
    decor: `url(${decorFuturiste}) top center / 100% auto no-repeat`,
  },
];

// Affiche le portrait réel (Google Flow — Nano Banana Pro) d'un personnage.
// Plus aucun dessin SVG : si l'id n'a pas (ou plus) de portrait dans
// CHARACTER_IMAGES, on retombe sur Le Chineur (toujours présent) plutôt que
// de casser l'affichage — ça ne devrait arriver que pour un vieux
// avatar_character en base qui ne correspond plus à un personnage du
// catalogue actuel (voir la migration SQL qui les réaligne sur "chineur").
function CharacterAvatar({ id, size = 96 }) {
  const src = CHARACTER_IMAGES[id] || CHARACTER_IMAGES.chineur;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        // Fond identique au bleu nuit déjà présent sur tous les portraits
        // (mesuré sur leurs pixels de coin, quasi identique d'une image à
        // l'autre) — sert de toile de fond derrière le dégradé ci-dessous.
        background: "#0e1628",
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          // Certains portraits sont composés "plein cadre" (épaules,
          // oreilles, antenne... jusqu'au bord du carré) : un simple
          // cercle net (borderRadius) les coupait soit sur les oreilles
          // (coins), soit par un trait droit en bas (composition qui touche
          // le bord). Solution unique et universelle : au lieu de découper
          // net, on fait un fondu radial (masque en dégradé) qui estompe
          // progressivement le portrait vers le bleu nuit du fond à
          // l'approche du bord de la pastille. Résultat : plus aucun trait
          // de découpe visible (ni sur les oreilles/bonnet/antenne, ni en
          // bas), un rendu plus doux et plus "premium", sans avoir à
          // retoucher ou reprendre aucune image.
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          WebkitMaskImage: "radial-gradient(circle, #000 58%, transparent 100%)",
          maskImage: "radial-gradient(circle, #000 58%, transparent 100%)",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />
    </span>
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
  // Variante "Classique blanc" demandée par Dylan : fond blanc pur (au lieu
  // du gris-bleuté de `light`) avec le texte courant en bleu nuit très
  // foncé, quasi noir (#0A1220 — repris tel quel du fond de "Classique"
  // sombre, ici utilisé comme couleur de texte plutôt que de fond).
  // L'orange de marque (accent) reste inchangé.
  blanc: {
    pageBg: "#FFFFFF",
    topBarGradient: "linear-gradient(90deg, #E4E7EC 0%, #B9C3D1 35%, #F2662E 100%)",
    headerBg: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 55%, #F2F4F7 100%)",
    menuBtnBorder: "rgba(10, 18, 32, 0.16)",
    menuBtnBg: "rgba(10, 18, 32, 0.04)",
    menuBtnColor: "#0A1220",
    dropZoneBg: "radial-gradient(circle at 50% 32%, #FAFBFC 0%, #F2F4F7 72%)",
    dropZoneText: "#0A1220",
    loadingBg: "linear-gradient(160deg, #FFFFFF 0%, #FAFBFC 100%)",
    loadingBorder: "#E4E7EC",
    loadingText: "#0A1220",
    resultCardBg: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 55%, #F2F4F7 100%)",
    formCardBg: "#FAFBFC",
    formCardBorder: "1px solid #E4E7EC",
    sheetBg: "#FFFFFF",
    grabBg: "linear-gradient(90deg, #0A1220 0%, #F2662E 100%)",
    titleColor: "#0A1220",
    closeColor: "#3A4658",
    rowBg: "#FAFBFC",
    rowBorder: "1px solid #E4E7EC",
    rowText: "#111B2E",
    chevronColor: "#8B96A6",
    subText: "#4C5A6E",
    errorColor: "#F2662E",
    inputBg: "#FFFFFF",
    inputBorder: "1px solid #C7CFD9",
    inputText: "#0A1220",
    cardBg: "#FAFBFC",
    cardBorder: "1px solid #E4E7EC",
    cardImgBg: "#F2F4F7",
    cardImgIcon: "#8B96A6",
    cardTitleColor: "#0A1220",
    chipBorder: "1px solid #E4E7EC",
    chipBg: "#F2F4F7",
    chipText: "#3A4658",
    dashedBorder: "1px dashed #D7DDE5",
    langUnselectedBorder: "1px solid #E4E7EC",
    langUnselectedBg: "#FAFBFC",
    ghostBorder: "rgba(10, 18, 32, 0.22)",
    ghostColor: "#0A1220",
    ghostBg: "rgba(10, 18, 32, 0.04)",
    strongColor: "#0A1220",
  },
};

const TRANSLATIONS = {
  fr: {
    hero_title_1: "Combien ça vaut,",
    hero_title_2: "vraiment ?",
    hero_subtitle:
      "Meuble, bijou, vieux jouet, gadget bizarre...\nEstim' identifie l'objet par IA, puis vérifie son prix sur Leboncoin, Vinted et eBay, en quelques secondes.",
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
    subscription_bonus_suffix: "offertes à la souscription",
    subscription_cancel_anytime: "Résiliable à tout moment, directement depuis ton compte.",
    credits_section_title: "Ou achète des estimations à l'unité :",
    credits_section_subtitle: "Utilisées seulement une fois ton quota du mois épuisé. N'expirent jamais.",
    credits_balance_label: "estimation(s) achetée(s) disponible(s)",
    credits_bonus_suffix: "offerte(s)",
    credits_total_suffix: "estimations au total",
    credits_buy_button: "Acheter",
    contact_title: "Contact",
    contact_text: "Une question, un souci, une suggestion ? Écris-nous :",
    language_title: "Langue",
    card_estimate_button: "Estimer",
    card_estimate_title: "Générer une estimation à partir de cette annonce",
    listing_seed_badge: "Estimation basée sur une annonce en ligne",
    listing_seed_link: "Voir l'annonce d'origine",
    reestimate_badge: "Réestimation à partir de ton historique — pour voir si le prix a bougé",
    close_label: "Fermer",
    avatar_choose_intro:
      "Choisis ton personnage : il s'affiche à côté de ton pseudo dans le classement. Le Chineur et La Chineuse sont débloqués dès le départ ; les autres se débloquent au fil de tes estimations générées — plus il en faut, plus le perso est stylé. D'autres personnages arriveront progressivement.",
    avatar_owner_preview_note:
      "Mode propriétaire : tu peux essayer tous les personnages ci-dessous, même verrouillés (aperçu uniquement — les autres comptes doivent toujours remplir le défi).",
    avatar_none_label: "Aucun avatar",
    avatar_none_sub: "aucune mascotte, interface de base partout",
    avatar_current_sub: "c'est cette vignette qui s'affiche dans le classement et en haut à droite",
    avatar_secret_title: "Personnage secret",
    avatar_secret_placeholder: "???",
    avatar_secret_hint: "secret",
    avatar_owner_preview_template: "aperçu (verrouillé pour les autres comptes, {hint})",
    avatar_hint_secret: "??? (secret)",
    avatar_hint_pack_prefix: "avec le pack ",
    avatar_hint_pack_suffix: "",
    avatar_hint_from_prefix: "dès ",
    avatar_hint_estimations_suffix: " estimations",
    avatar_where_show_prefix: "Où afficher ",
    avatar_where_show_suffix: " ?",
    avatar_icon_only_label: "Icône seulement",
    avatar_icon_only_desc: "garde l'interface de base pour prendre une photo",
    avatar_background_label: "Arrière-plan de l'appli",
    avatar_background_desc: "mascotte en entier sur l'écran photo",
    avatar_save_button: "Enregistrer mon avatar",
    avatar_saved_flash: "Avatar enregistré !",
    aria_share_link: "partager mon lien",
    aria_copy_link: "copier le lien",
    aria_minus: "moins",
    aria_plus: "plus",
    aria_my_profile: "Mon profil",
    aria_change_photo: "changer de photo",
    aria_download_photo: "télécharger cette photo",
    aria_reestimate: "réestimer",
    aria_delete: "supprimer",
    aria_next: "suivant",
    aria_stop_dictation: "arrêter la dictée vocale",
    aria_start_dictation: "dicter les précisions",
    dictation_stop_title: "Arrêter",
    dictation_start_title: "Dicter à l'oral",
    aria_hide_password: "masquer le mot de passe",
    aria_show_password: "afficher le mot de passe",
    avatar_unlock_toast_prefix: "Félicitations, tu viens de débloquer ",
    avatar_unlock_toast_plural: "des avatars",
    avatar_unlock_toast_singular: "un avatar",
    avatar_unlock_toast_colon: " : ",
    avatar_unlock_toast_suffix: " !",
    beta_badge: "bêta",
    drop_zone_choose_file: "choisir un fichier",
    alt_object_to_estimate: "objet à estimer",
    details_label: "Précisions (optionnel) — contenance, état, modèle exact...",
    listening_indicator: "● écoute…",
    details_placeholder: "ex: flacon de 100ml, léger éclat sur le bord",
    btn_identifying: "Identification…",
    btn_pricing: "Estimation du prix…",
    btn_estimate_value: "Estimer sa valeur",
    vehicle_form_title: "🚗 quelques précisions sur le véhicule",
    vehicle_year_label: "Année",
    vehicle_year_placeholder: "ex: 2018",
    vehicle_mileage_label: "Kilométrage",
    vehicle_mileage_placeholder: "ex: 85000",
    vehicle_condition_label: "État général",
    vehicle_condition_excellent: "excellent état",
    vehicle_condition_good: "bon état",
    vehicle_condition_average: "état moyen",
    vehicle_condition_poor: "à réviser / défauts visibles",
    btn_estimate: "Estimer",
    realestate_form_title: "🏠 quelques précisions sur le bien",
    realestate_city_label: "Ville ou secteur",
    realestate_city_placeholder: "ex: Rennes centre",
    realestate_surface_label: "Surface (m²)",
    realestate_surface_placeholder: "ex: 65",
    realestate_rooms_label: "Nombre de pièces (optionnel)",
    realestate_rooms_placeholder: "ex: 3",
    humor_mode_badge: '🎭 mode "estimer tout, même n\'importe quoi"',
    vehicle_estimate_badge: "🚗 estimation véhicule",
    realestate_estimate_badge: "🏠 estimation immobilière",
    indicative_suffix: " · indicative",
    hypothesis_prefix: "Hypothèse : ",
    confidence_haute: "Confiance élevée",
    confidence_moyenne: "Confiance moyenne",
    confidence_basse: "Confiance limitée",
    confidence_indicative: "Estimation indicative",
    tab_estimation: "Estimation",
    tab_statistiques: "Statistiques",
    gauge_sell_ease_label: "Facilité à vendre",
    gauge_sell_ease_low: "Difficile",
    gauge_sell_ease_high: "Facile",
    gauge_rarity_label: "Rareté",
    gauge_rarity_low: "Pas rare",
    gauge_rarity_high: "Rare",
    trend_title: "Tendance de cote",
    trend_disclaimer:
      "Tendance de cote estimée par l'IA pour ce type de produit à partir de sa courbe sur 10 ans (pas une donnée de marché vérifiée) — à prendre comme un repère indicatif, pas une valeur garantie.",
    trend_short_range_note:
      " Sur une période aussi courte, le prix de revente d'un objet d'occasion ne bouge en réalité presque jamais : cette vue sert surtout à zoomer dans la tendance de fond.",
    trend_ai_evaluation_note:
      "Évaluation par l'IA à partir de la demande observée sur Leboncoin, Vinted et eBay pour ce produit précis.",
    share_generating: "génération…",
    share_downloaded: "Image enregistrée !",
    share_button: "Partager",
    breakdown_title: "Détail par plateforme",
    breakdown_sale_unit: "vente",
    breakdown_listing_unit: "annonce",
    breakdown_unavailable: "indisponible",
    listings_collapse: "Réduire",
    listings_expand_prefix: "Voir le détail des ",
    listings_expand_middle_singular: "annonce retenue",
    listings_expand_middle_plural: "annonces retenues",
    brocante_label: "En brocante :",
    conseil_label: "Conseil :",
    correction_prompt: "Un détail est faux ? Corriger et recalculer",
    correction_instructions:
      'Précise ce qui ne va pas (ex : "en fait c\'est une petite taille"), l\'estimation sera relancée avec cette info :',
    correction_placeholder: "ex : petite taille, pas grande",
    recalculate_button: "Recalculer l'estimation",
    cancel_button: "Annuler",
    generate_ad_button: "Générer une annonce à publier",
    ad_limit_reached: "Limite de 3 générations atteinte pour cette estimation.",
    ad_generating: "Génération de l'annonce…",
    ad_ready_label: "Annonce prête à coller (modifiable) :",
    ad_copied: "Copié !",
    ad_copy_button: "Copier le texte",
    ad_regenerate_prefix: "Régénérer (",
    ad_regenerate_suffix_singular: " restante)",
    ad_regenerate_suffix_plural: " restantes)",
    ad_limit_reached_edit_note:
      "Limite de 3 générations atteinte pour cette estimation — tu peux encore modifier le texte à la main juste au-dessus.",
    ad_paste_instructions:
      "Copie le texte ci-dessus, puis clique sur une plateforme pour créer ton annonce (colle le texte une fois sur la page) :",
    extra_angles_title: "Photos IA sous d'autres angles",
    extra_angles_premium_note:
      "Fonctionnalité premium — génère jusqu'à 2 photos IA de cet objet sous d'autres angles pour ton annonce",
    extra_angles_generate_button: "Générer 2 photos sous d'autres angles",
    extra_angles_generating: "Génération en cours (10 à 20 secondes)…",
    extra_angles_retry_button: "Réessayer",
    extra_angles_download_note: "Télécharge-les puis ajoute-les à ta photo d'origine sur Leboncoin, Vinted ou eBay.",

    // Historique / confirmation suppression
    history_title: "Historique",
    history_clear_all: "tout effacer",
    history_login_note:
      "Connecte-toi depuis ton profil (icône en haut à droite) pour un historique illimité, synchronisé entre appareils. Sans compte, l'historique reste local à cet appareil.",
    history_empty: "Aucune estimation pour l'instant.",
    history_reestimate_title: "Réestimer (voir si le prix a bougé)",
    history_clear_confirm_title: "Tout effacer ?",
    history_clear_confirm_body_prefix: "Cette action supprimera définitivement ",
    history_clear_confirm_body_middle_singular: " estimation de ton historique. Impossible de revenir en arrière.",
    history_clear_confirm_body_middle_plural: " estimations de ton historique. Impossible de revenir en arrière.",
    history_clear_confirm_button: "Effacer tout",

    // Ma collection / objets scannés
    collection_title: "Ma collection",
    collection_empty: "Fais ta première estimation pour commencer à remplir ta collection.",
    collection_stat_value_label: "Valeur estimée",
    collection_stat_objects_label: "Objets scannés",
    collection_streak_prefix: "",
    collection_streak_suffix: " de suite à checker des prix — continue comme ça !",
    collection_streak_days_singular: "jour",
    collection_streak_days_plural: "jours",
    collection_chart_title: "Valeur de ta collection dans le temps",
    collection_chart_premium_prefix: "Passe premium pour voir tes ",
    collection_chart_premium_suffix_singular: " point d'historique en plus",
    collection_chart_premium_suffix_plural: " points d'historique en plus",
    collection_badges_title: "Badges",
    badge_first: "Premier scan",
    badge_five: "5 estimations",
    badge_ten: "10 estimations",
    badge_fifty: "50 estimations",
    badge_streak3: "3 jours de suite",
    badge_streak7: "7 jours de suite",
    badge_streak30: "30 jours de suite",
    badge_powerday5: "5 estimations en 1 jour",
    badge_bigfind: "Trouvaille à +200 €",
    badge_collector500: "Collection à 500 €",
    badge_collector2000: "Collection à 2000 €",
    badge_adgen10: "10 annonces générées",
    badge_adgen50: "50 annonces générées",
    scanned_objects_title: "Objets scannés",
    scanned_objects_subtitle_prefix: "Du plus cher au moins cher — prix moyen de chaque objet, dont la somme fait ta ",
    scanned_objects_subtitle_strong: "valeur estimée",
    object_fallback_label: "Objet",

    // Profil / compte / affichage / crédits
    account_synced_history: "historique synchronisé",
    account_plan_free: "Gratuit",
    account_avatars_row: "Avatars",
    account_quota_paid_suffix: " estimations restantes ce mois",
    account_quota_free_suffix: " estimation(s) gratuite(s) restante(s) ce mois",
    account_manage_button: "gérer",
    account_subscribe_button: "s'abonner",
    account_refer_friend: "Parrainer un ami",
    account_link_copied: "copié !",
    account_password_set: "Mot de passe défini",
    account_password_set_note: "définir un mot de passe (se reconnecter sans lien par email)",
    account_new_password_placeholder: "nouveau mot de passe",
    account_set_password_button: "définir",
    account_sign_out: "déconnexion",
    account_magic_link_sent_prefix: "Lien envoyé ! Vérifie ta boîte mail (",
    account_magic_link_sent_suffix: ") et clique dessus pour te connecter.",
    account_signup_sent_prefix: "Compte créé ! Vérifie ta boîte mail (",
    account_signup_sent_suffix:
      ") et clique sur le lien de confirmation pour activer ton compte, puis reviens te connecter avec ton mot de passe.",
    account_login_intro:
      "Connecte-toi pour sauvegarder ton historique, débloquer ton avatar personnalisable et apparaître au classement (optionnel).",
    account_email_placeholder: "ton@email.com",
    account_password_placeholder: "mot de passe",
    account_signin_button: "se connecter",
    account_signup_button: "créer un compte",
    account_or_divider: "ou",
    account_magic_link_button: "recevoir un lien de connexion (sans mot de passe)",
    display_theme_title: "Thème (polices, couleurs et contours de toute l'appli)",
    profile_title: "Mon profil",
    credits_unit_singular: "estimation",
    credits_unit_plural: "estimations",

    // Abonnement / paywall
    paywall_title: "Quota atteint",
    paywall_reason_quota_epuise: "Tu as utilisé toutes les estimations comprises dans ton abonnement ce mois-ci.",
    paywall_reason_gratuit_epuise: "Tu as utilisé tes estimations gratuites de ce mois-ci.",
    paywall_reason_default: "Impossible de continuer l'estimation pour l'instant.",
    paywall_watching_ad: "visionnage en cours…",
    paywall_watch_ad_button: "regarder une pub pour 1 estimation gratuite",
    paywall_or_subscribe: "ou passe à un abonnement pour beaucoup plus d'estimations :",
    plan_per_month_suffix: "/mois",
    trend_range_1j: "1J",
    trend_range_1s: "1S",
    trend_range_1m: "1M",
    trend_range_1a: "1A",
    trend_range_5a: "5A",
    trend_range_10a: "10A",
    trend_range_total: "Total",

    // Messages d'erreur / toasts (logique métier)
    err_payment_creation: "Erreur lors de la création du paiement.",
    err_portal_open: "Erreur lors de l'ouverture du portail.",
    err_portal_open_subscription: "Erreur lors de l'ouverture du portail d'abonnement.",
    err_password_min_length: "6 caractères minimum.",
    err_search: "Erreur de recherche.",
    err_loading: "Erreur de chargement.",
    pseudo_err_length: "3 à 20 caractères.",
    pseudo_err_chars: "Lettres, chiffres, espaces, apostrophes et tirets uniquement.",
    pseudo_err_taken: "Ce pseudo est déjà pris.",
    pseudo_err_no_profile: "Connecte-toi pour choisir un pseudo.",
    err_retry: "Erreur, réessaie.",
    err_heic_format:
      "Ce fichier est au format HEIC (photos iPhone), pas encore géré par ce prototype de test. " +
      "Solution rapide : Réglages → Appareil photo → Formats → \"Le plus compatible\" sur ton iPhone, " +
      "puis reprends la photo. La vraie app pourra lire le HEIC nativement.",
    err_file_read: "Impossible de lire le fichier sélectionné.",
    err_api_network_prefix: "Impossible de contacter l'API (réseau). ",
    err_api_prefix: "Erreur API: ",
    err_api_truncated: "Réponse coupée (max_tokens atteint).",
    err_api_unreadable_prefix: "Réponse illisible/tronquée de l'API (statut ",
    err_api_unreadable_middle: "). Contenu brut: ",
    err_json_not_found_prefix: "Pas de JSON trouvé dans la réponse: ",
    err_json_invalid_prefix: "JSON invalide: ",
    err_relay_unreachable_prefix: "Impossible de contacter le serveur relais: ",
    err_relay_unreadable_prefix: "Réponse du serveur relais illisible (statut ",
    err_relay_unreadable_suffix: ").",
    err_relay_error_prefix: "Erreur serveur relais: ",
    err_login_required_estimate: "Connecte-toi pour lancer une estimation (3 gratuites par mois, sans carte bancaire).",
    err_ad_generation_failed: "Impossible de générer l'annonce, réessaie.",
    err_ad_copy_failed: "Impossible de copier automatiquement, sélectionne le texte à la main.",
    err_extra_angles_generation: "Erreur lors de la génération.",
    err_extra_angles_none: "Aucune photo n'a pu être générée, réessaie.",
    err_extra_angles_failed: "Impossible de générer les photos, réessaie.",
    err_listings_no_match:
      "Des annonces ont été trouvées mais aucune ne correspond précisément au même produit (même format/modèle).",
    err_listings_not_enough: "Pas assez d'annonces trouvées pour cet objet.",
    err_estimation_failed: "L'estimation a échoué. Réessaie avec une autre photo.",
    err_vehicle_estimation_failed: "L'estimation du véhicule a échoué.",
    err_realestate_estimation_failed: "L'estimation du bien immobilier a échoué.",
    referral_share_text: "Estime la valeur de revente de tes objets en une photo avec estim' !",
    src_used_prefix: "estimation basée sur ",
    src_used_middle: " annonce(s) d'occasion réelle(s) (Leboncoin/Vinted/eBay)",
    src_used_sold_prefix: ", dont ",
    src_used_sold_suffix: " vente(s) eBay confirmée(s)",
    src_humor_mode: "estim' mode 'estimer tout, même n'importe quoi' 🎭",
    src_ai_no_listings_prefix: "estimation IA (annonces réelles indisponibles: ",
    src_ai_no_listings_suffix: ")",
    src_ai_vehicle: "estimation IA véhicule — indicative, pas d'annonces réelles comparées",
    src_ai_realestate: "estimation IA immobilier — très approximative, sans données de marché local",
    seed_etat_unverifiable: "État non vérifiable à distance : estimation basée sur une annonce en ligne, pas sur une photo.",
    seed_etat_note: "occasion (état non vérifié)",
  },
  en: {
    hero_title_1: "How much is it",
    hero_title_2: "really worth?",
    hero_subtitle:
      "Furniture, jewelry, an old toy, some weird gadget...\nEstim' identifies the item with AI, then checks its price on Leboncoin, Vinted and eBay, in seconds.",
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
    subscription_bonus_suffix: "offered when you subscribe",
    subscription_cancel_anytime: "Cancel anytime, directly from your account.",
    credits_section_title: "Or buy estimations one by one:",
    credits_section_subtitle: "Used only once your monthly quota is used up. Never expire.",
    credits_balance_label: "purchased estimation(s) available",
    credits_bonus_suffix: "free",
    credits_total_suffix: "estimations total",
    credits_buy_button: "Buy",
    contact_title: "Contact",
    contact_text: "A question, an issue, a suggestion? Write to us:",
    language_title: "Language",
    card_estimate_button: "Estimate",
    card_estimate_title: "Generate an estimate from this listing",
    listing_seed_badge: "Estimate based on an online listing",
    listing_seed_link: "View the original listing",
    reestimate_badge: "Re-checked from your history — to see if the price has moved",
    close_label: "Close",
    avatar_choose_intro:
      "Choose your character: it's shown next to your username on the leaderboard. Le Chineur and La Chineuse are unlocked from the start; the others unlock as you generate estimations — the more it takes, the cooler the character. More characters are coming soon.",
    avatar_owner_preview_note:
      "Owner mode: you can try every character below, even locked ones (preview only — other accounts still need to complete the challenge).",
    avatar_none_label: "No avatar",
    avatar_none_sub: "no mascot, base interface everywhere",
    avatar_current_sub: "this is the thumbnail shown on the leaderboard and top right",
    avatar_secret_title: "Secret character",
    avatar_secret_placeholder: "???",
    avatar_secret_hint: "secret",
    avatar_owner_preview_template: "preview (locked for other accounts, {hint})",
    avatar_hint_secret: "??? (secret)",
    avatar_hint_pack_prefix: "with the ",
    avatar_hint_pack_suffix: " plan",
    avatar_hint_from_prefix: "from ",
    avatar_hint_estimations_suffix: " estimations",
    avatar_where_show_prefix: "Where to show ",
    avatar_where_show_suffix: "?",
    avatar_icon_only_label: "Icon only",
    avatar_icon_only_desc: "keeps the standard camera screen",
    avatar_background_label: "App background",
    avatar_background_desc: "full mascot on the camera screen",
    avatar_save_button: "Save my avatar",
    avatar_saved_flash: "Avatar saved!",
    aria_share_link: "share my link",
    aria_copy_link: "copy the link",
    aria_minus: "minus",
    aria_plus: "plus",
    aria_my_profile: "My profile",
    aria_change_photo: "change photo",
    aria_download_photo: "download this photo",
    aria_reestimate: "re-estimate",
    aria_delete: "delete",
    aria_next: "next",
    aria_stop_dictation: "stop voice dictation",
    aria_start_dictation: "dictate details",
    dictation_stop_title: "Stop",
    dictation_start_title: "Dictate aloud",
    aria_hide_password: "hide password",
    aria_show_password: "show password",
    avatar_unlock_toast_prefix: "Congrats, you just unlocked ",
    avatar_unlock_toast_plural: "avatars",
    avatar_unlock_toast_singular: "an avatar",
    avatar_unlock_toast_colon: ": ",
    avatar_unlock_toast_suffix: "!",
    beta_badge: "beta",
    drop_zone_choose_file: "choose a file",
    alt_object_to_estimate: "item to estimate",
    details_label: "Details (optional) — capacity, condition, exact model...",
    listening_indicator: "● listening…",
    details_placeholder: "e.g.: 100ml bottle, slight chip on the edge",
    btn_identifying: "Identifying…",
    btn_pricing: "Estimating price…",
    btn_estimate_value: "Estimate its value",
    vehicle_form_title: "🚗 a few details about the vehicle",
    vehicle_year_label: "Year",
    vehicle_year_placeholder: "e.g.: 2018",
    vehicle_mileage_label: "Mileage",
    vehicle_mileage_placeholder: "e.g.: 85000",
    vehicle_condition_label: "Overall condition",
    vehicle_condition_excellent: "excellent condition",
    vehicle_condition_good: "good condition",
    vehicle_condition_average: "average condition",
    vehicle_condition_poor: "needs work / visible flaws",
    btn_estimate: "Estimate",
    realestate_form_title: "🏠 a few details about the property",
    realestate_city_label: "City or area",
    realestate_city_placeholder: "e.g.: downtown Rennes",
    realestate_surface_label: "Surface area (m²)",
    realestate_surface_placeholder: "e.g.: 65",
    realestate_rooms_label: "Number of rooms (optional)",
    realestate_rooms_placeholder: "e.g.: 3",
    humor_mode_badge: '🎭 "estimate anything, even that" mode',
    vehicle_estimate_badge: "🚗 vehicle estimate",
    realestate_estimate_badge: "🏠 real estate estimate",
    indicative_suffix: " · indicative",
    hypothesis_prefix: "Assumption: ",
    confidence_haute: "High confidence",
    confidence_moyenne: "Medium confidence",
    confidence_basse: "Limited confidence",
    confidence_indicative: "Indicative estimate",
    tab_estimation: "Estimate",
    tab_statistiques: "Stats",
    gauge_sell_ease_label: "Ease of selling",
    gauge_sell_ease_low: "Hard",
    gauge_sell_ease_high: "Easy",
    gauge_rarity_label: "Rarity",
    gauge_rarity_low: "Not rare",
    gauge_rarity_high: "Rare",
    trend_title: "Price trend",
    trend_disclaimer:
      "Price trend estimated by AI for this type of product from its 10-year curve (not verified market data) — treat it as an indicative guide, not a guaranteed value.",
    trend_short_range_note:
      " Over such a short period, the resale price of a second-hand item barely moves in practice: this view is mainly useful to zoom into the underlying trend.",
    trend_ai_evaluation_note:
      "AI assessment based on observed demand on Leboncoin, Vinted and eBay for this exact product.",
    share_generating: "generating…",
    share_downloaded: "Image saved!",
    share_button: "Share",
    breakdown_title: "Breakdown by platform",
    breakdown_sale_unit: "sale",
    breakdown_listing_unit: "listing",
    breakdown_unavailable: "unavailable",
    listings_collapse: "Collapse",
    listings_expand_prefix: "See the ",
    listings_expand_middle_singular: "listing used",
    listings_expand_middle_plural: "listings used",
    brocante_label: "At a flea market:",
    conseil_label: "Tip:",
    correction_prompt: "Something's wrong? Fix it and recalculate",
    correction_instructions:
      'Tell us what\'s off (e.g.: "actually it\'s a small size"), the estimate will be redone with this info:',
    correction_placeholder: "e.g.: small size, not large",
    recalculate_button: "Recalculate the estimate",
    cancel_button: "Cancel",
    generate_ad_button: "Generate a listing to post",
    ad_limit_reached: "Limit of 3 generations reached for this estimate.",
    ad_generating: "Generating the listing…",
    ad_ready_label: "Listing ready to paste (editable):",
    ad_copied: "Copied!",
    ad_copy_button: "Copy the text",
    ad_regenerate_prefix: "Regenerate (",
    ad_regenerate_suffix_singular: " left)",
    ad_regenerate_suffix_plural: " left)",
    ad_limit_reached_edit_note:
      "Limit of 3 generations reached for this estimate — you can still edit the text by hand just above.",
    ad_paste_instructions:
      "Copy the text above, then click a platform to create your listing (paste the text once on the page):",
    extra_angles_title: "AI photos from other angles",
    extra_angles_premium_note:
      "Premium feature — generates up to 2 AI photos of this item from other angles for your listing",
    extra_angles_generate_button: "Generate 2 photos from other angles",
    extra_angles_generating: "Generating (10 to 20 seconds)…",
    extra_angles_retry_button: "Retry",
    extra_angles_download_note: "Download them, then add them to your original photo on Leboncoin, Vinted or eBay.",

    // History / clear confirmation
    history_title: "History",
    history_clear_all: "clear all",
    history_login_note:
      "Sign in from your profile (icon top right) for unlimited history, synced across devices. Without an account, history stays local to this device.",
    history_empty: "No estimates yet.",
    history_reestimate_title: "Re-estimate (see if the price has moved)",
    history_clear_confirm_title: "Clear everything?",
    history_clear_confirm_body_prefix: "This will permanently delete ",
    history_clear_confirm_body_middle_singular: " estimate from your history. This cannot be undone.",
    history_clear_confirm_body_middle_plural: " estimates from your history. This cannot be undone.",
    history_clear_confirm_button: "Clear all",

    // My collection / scanned objects
    collection_title: "My collection",
    collection_empty: "Make your first estimate to start filling your collection.",
    collection_stat_value_label: "Estimated value",
    collection_stat_objects_label: "Scanned items",
    collection_streak_prefix: "",
    collection_streak_suffix: " in a row checking prices — keep it up!",
    collection_streak_days_singular: "day",
    collection_streak_days_plural: "days",
    collection_chart_title: "Your collection's value over time",
    collection_chart_premium_prefix: "Go premium to see your ",
    collection_chart_premium_suffix_singular: " extra history point",
    collection_chart_premium_suffix_plural: " extra history points",
    collection_badges_title: "Badges",
    badge_first: "First scan",
    badge_five: "5 estimates",
    badge_ten: "10 estimates",
    badge_fifty: "50 estimates",
    badge_streak3: "3 days in a row",
    badge_streak7: "7 days in a row",
    badge_streak30: "30 days in a row",
    badge_powerday5: "5 estimates in 1 day",
    badge_bigfind: "Find worth +200 €",
    badge_collector500: "Collection at 500 €",
    badge_collector2000: "Collection at 2000 €",
    badge_adgen10: "10 listings generated",
    badge_adgen50: "50 listings generated",
    scanned_objects_title: "Scanned items",
    scanned_objects_subtitle_prefix: "From most to least expensive — average price of each item, which together make up your ",
    scanned_objects_subtitle_strong: "estimated value",
    object_fallback_label: "Item",

    // Profile / account / display / credits
    account_synced_history: "synced history",
    account_plan_free: "Free",
    account_avatars_row: "Avatars",
    account_quota_paid_suffix: " estimates left this month",
    account_quota_free_suffix: " free estimate(s) left this month",
    account_manage_button: "manage",
    account_subscribe_button: "subscribe",
    account_refer_friend: "Refer a friend",
    account_link_copied: "copied!",
    account_password_set: "Password set",
    account_password_set_note: "set a password (sign in again without an email link)",
    account_new_password_placeholder: "new password",
    account_set_password_button: "set",
    account_sign_out: "sign out",
    account_magic_link_sent_prefix: "Link sent! Check your inbox (",
    account_magic_link_sent_suffix: ") and click it to sign in.",
    account_signup_sent_prefix: "Account created! Check your inbox (",
    account_signup_sent_suffix:
      ") and click the confirmation link to activate your account, then come back and sign in with your password.",
    account_login_intro:
      "Sign in to save your history, unlock your customizable avatar and appear on the leaderboard (optional).",
    account_email_placeholder: "your@email.com",
    account_password_placeholder: "password",
    account_signin_button: "sign in",
    account_signup_button: "create an account",
    account_or_divider: "or",
    account_magic_link_button: "get a sign-in link (no password)",
    display_theme_title: "Theme (fonts, colors and outlines across the whole app)",
    profile_title: "My profile",
    credits_unit_singular: "estimate",
    credits_unit_plural: "estimates",

    // Subscription / paywall
    paywall_title: "Quota reached",
    paywall_reason_quota_epuise: "You've used all the estimates included in your subscription this month.",
    paywall_reason_gratuit_epuise: "You've used your free estimates for this month.",
    paywall_reason_default: "Can't continue the estimate right now.",
    paywall_watching_ad: "watching ad…",
    paywall_watch_ad_button: "watch an ad for 1 free estimate",
    paywall_or_subscribe: "or upgrade to a subscription for a lot more estimates:",
    plan_per_month_suffix: "/mo",
    trend_range_1j: "1D",
    trend_range_1s: "1W",
    trend_range_1m: "1M",
    trend_range_1a: "1Y",
    trend_range_5a: "5Y",
    trend_range_10a: "10Y",
    trend_range_total: "All",

    // Error messages / toasts (business logic)
    err_payment_creation: "Error creating the payment.",
    err_portal_open: "Error opening the portal.",
    err_portal_open_subscription: "Error opening the subscription portal.",
    err_password_min_length: "6 characters minimum.",
    err_search: "Search error.",
    err_loading: "Loading error.",
    pseudo_err_length: "3 to 20 characters.",
    pseudo_err_chars: "Letters, numbers, spaces, apostrophes and hyphens only.",
    pseudo_err_taken: "This username is already taken.",
    pseudo_err_no_profile: "Sign in to choose a username.",
    err_retry: "Error, try again.",
    err_heic_format:
      "This file is in HEIC format (iPhone photos), not yet supported by this test prototype. " +
      "Quick fix: Settings → Camera → Formats → \"Most Compatible\" on your iPhone, " +
      "then retake the photo. The real app will be able to read HEIC natively.",
    err_file_read: "Unable to read the selected file.",
    err_api_network_prefix: "Unable to reach the API (network). ",
    err_api_prefix: "API error: ",
    err_api_truncated: "Response cut off (max_tokens reached).",
    err_api_unreadable_prefix: "Unreadable API response (status ",
    err_api_unreadable_middle: "). Raw content: ",
    err_json_not_found_prefix: "No JSON found in the response: ",
    err_json_invalid_prefix: "Invalid JSON: ",
    err_relay_unreachable_prefix: "Unable to reach the relay server: ",
    err_relay_unreadable_prefix: "Unreadable relay server response (status ",
    err_relay_unreadable_suffix: ").",
    err_relay_error_prefix: "Relay server error: ",
    err_login_required_estimate: "Sign in to start an estimate (3 free per month, no credit card required).",
    err_ad_generation_failed: "Unable to generate the listing, try again.",
    err_ad_copy_failed: "Unable to copy automatically, select the text manually.",
    err_extra_angles_generation: "Error during generation.",
    err_extra_angles_none: "No photo could be generated, try again.",
    err_extra_angles_failed: "Unable to generate the photos, try again.",
    err_listings_no_match:
      "Listings were found but none precisely matches the same product (same format/model).",
    err_listings_not_enough: "Not enough listings found for this item.",
    err_estimation_failed: "The estimate failed. Try again with another photo.",
    err_vehicle_estimation_failed: "The vehicle estimate failed.",
    err_realestate_estimation_failed: "The real estate estimate failed.",
    referral_share_text: "Estimate the resale value of your stuff in one photo with estim'!",
    src_used_prefix: "estimate based on ",
    src_used_middle: " real second-hand listing(s) (Leboncoin/Vinted/eBay)",
    src_used_sold_prefix: ", including ",
    src_used_sold_suffix: " confirmed eBay sale(s)",
    src_humor_mode: "estim' 'estimate anything, even nonsense' mode 🎭",
    src_ai_no_listings_prefix: "AI estimate (real listings unavailable: ",
    src_ai_no_listings_suffix: ")",
    src_ai_vehicle: "AI vehicle estimate — indicative, no real listings compared",
    src_ai_realestate: "AI real estate estimate — very approximate, no local market data",
    seed_etat_unverifiable: "Condition not verifiable remotely: estimate based on an online listing, not a photo.",
    seed_etat_note: "used (condition not verified)",
  },
  es: {
    hero_title_1: "¿Cuánto vale,",
    hero_title_2: "de verdad?",
    hero_subtitle:
      "Un mueble, una joya, un juguete viejo, un cacharro raro...\nEstim' identifica el objeto con IA y comprueba su precio en Leboncoin, Vinted y eBay, en segundos.",
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
    subscription_bonus_suffix: "de regalo al suscribirte",
    subscription_cancel_anytime: "Cancelable en cualquier momento, directamente desde tu cuenta.",
    credits_section_title: "O compra estimaciones por unidad:",
    credits_section_subtitle: "Se usan solo una vez agotada tu cuota mensual. Nunca caducan.",
    credits_balance_label: "estimación(es) comprada(s) disponible(s)",
    credits_bonus_suffix: "de regalo",
    credits_total_suffix: "estimaciones en total",
    credits_buy_button: "Comprar",
    contact_title: "Contacto",
    contact_text: "¿Una pregunta, un problema, una sugerencia? Escríbenos:",
    language_title: "Idioma",
    card_estimate_button: "Estimar",
    card_estimate_title: "Generar una estimación a partir de este anuncio",
    listing_seed_badge: "Estimación basada en un anuncio en línea",
    listing_seed_link: "Ver el anuncio original",
    reestimate_badge: "Reestimación desde tu historial — para ver si el precio cambió",
    close_label: "Cerrar",
    avatar_choose_intro:
      "Elige tu personaje: se muestra junto a tu nombre en la clasificación. Le Chineur y La Chineuse están desbloqueados desde el principio; los demás se desbloquean a medida que generas estimaciones — cuantas más hacen falta, más chulo es el personaje. Llegarán más personajes poco a poco.",
    avatar_owner_preview_note:
      "Modo propietario: puedes probar todos los personajes de abajo, incluso los bloqueados (solo vista previa — las demás cuentas siguen teniendo que cumplir el reto).",
    avatar_none_label: "Sin avatar",
    avatar_none_sub: "sin mascota, interfaz básica en todas partes",
    avatar_current_sub: "esta es la miniatura que se muestra en la clasificación y arriba a la derecha",
    avatar_secret_title: "Personaje secreto",
    avatar_secret_placeholder: "???",
    avatar_secret_hint: "secreto",
    avatar_owner_preview_template: "vista previa (bloqueado para otras cuentas, {hint})",
    avatar_hint_secret: "??? (secreto)",
    avatar_hint_pack_prefix: "con el pack ",
    avatar_hint_pack_suffix: "",
    avatar_hint_from_prefix: "a partir de ",
    avatar_hint_estimations_suffix: " estimaciones",
    avatar_where_show_prefix: "¿Dónde mostrar ",
    avatar_where_show_suffix: "?",
    avatar_icon_only_label: "Solo icono",
    avatar_icon_only_desc: "mantiene la pantalla básica para hacer la foto",
    avatar_background_label: "Fondo de la app",
    avatar_background_desc: "mascota completa en la pantalla de la foto",
    avatar_save_button: "Guardar mi avatar",
    avatar_saved_flash: "¡Avatar guardado!",
    aria_share_link: "compartir mi enlace",
    aria_copy_link: "copiar el enlace",
    aria_minus: "menos",
    aria_plus: "más",
    aria_my_profile: "Mi perfil",
    aria_change_photo: "cambiar foto",
    aria_download_photo: "descargar esta foto",
    aria_reestimate: "reestimar",
    aria_delete: "eliminar",
    aria_next: "siguiente",
    aria_stop_dictation: "detener el dictado por voz",
    aria_start_dictation: "dictar los detalles",
    dictation_stop_title: "Detener",
    dictation_start_title: "Dictar en voz alta",
    aria_hide_password: "ocultar contraseña",
    aria_show_password: "mostrar contraseña",
    avatar_unlock_toast_prefix: "Enhorabuena, acabas de desbloquear ",
    avatar_unlock_toast_plural: "avatares",
    avatar_unlock_toast_singular: "un avatar",
    avatar_unlock_toast_colon: ": ",
    avatar_unlock_toast_suffix: "!",
    beta_badge: "beta",
    drop_zone_choose_file: "elegir un archivo",
    alt_object_to_estimate: "objeto a estimar",
    details_label: "Detalles (opcional) — capacidad, estado, modelo exacto...",
    listening_indicator: "● escuchando…",
    details_placeholder: "ej.: frasco de 100ml, pequeña mella en el borde",
    btn_identifying: "Identificando…",
    btn_pricing: "Calculando el precio…",
    btn_estimate_value: "Estimar su valor",
    vehicle_form_title: "🚗 unos detalles sobre el vehículo",
    vehicle_year_label: "Año",
    vehicle_year_placeholder: "ej.: 2018",
    vehicle_mileage_label: "Kilometraje",
    vehicle_mileage_placeholder: "ej.: 85000",
    vehicle_condition_label: "Estado general",
    vehicle_condition_excellent: "estado excelente",
    vehicle_condition_good: "buen estado",
    vehicle_condition_average: "estado medio",
    vehicle_condition_poor: "por revisar / defectos visibles",
    btn_estimate: "Estimar",
    realestate_form_title: "🏠 unos detalles sobre el inmueble",
    realestate_city_label: "Ciudad o zona",
    realestate_city_placeholder: "ej.: centro de Rennes",
    realestate_surface_label: "Superficie (m²)",
    realestate_surface_placeholder: "ej.: 65",
    realestate_rooms_label: "Número de habitaciones (opcional)",
    realestate_rooms_placeholder: "ej.: 3",
    humor_mode_badge: '🎭 modo "estimar cualquier cosa, hasta eso"',
    vehicle_estimate_badge: "🚗 estimación de vehículo",
    realestate_estimate_badge: "🏠 estimación inmobiliaria",
    indicative_suffix: " · orientativa",
    hypothesis_prefix: "Hipótesis: ",
    confidence_haute: "Confianza alta",
    confidence_moyenne: "Confianza media",
    confidence_basse: "Confianza limitada",
    confidence_indicative: "Estimación orientativa",
    tab_estimation: "Estimación",
    tab_statistiques: "Estadísticas",
    gauge_sell_ease_label: "Facilidad de venta",
    gauge_sell_ease_low: "Difícil",
    gauge_sell_ease_high: "Fácil",
    gauge_rarity_label: "Rareza",
    gauge_rarity_low: "No es raro",
    gauge_rarity_high: "Raro",
    trend_title: "Tendencia de precio",
    trend_disclaimer:
      "Tendencia de precio estimada por IA para este tipo de producto a partir de su curva de 10 años (no son datos de mercado verificados) — tómalo como una referencia orientativa, no como un valor garantizado.",
    trend_short_range_note:
      " En un período tan corto, el precio de reventa de un objeto de segunda mano casi nunca se mueve en la práctica: esta vista sirve sobre todo para hacer zoom en la tendencia de fondo.",
    trend_ai_evaluation_note:
      "Evaluación por IA a partir de la demanda observada en Leboncoin, Vinted y eBay para este producto concreto.",
    share_generating: "generando…",
    share_downloaded: "¡Imagen guardada!",
    share_button: "Compartir",
    breakdown_title: "Detalle por plataforma",
    breakdown_sale_unit: "venta",
    breakdown_listing_unit: "anuncio",
    breakdown_unavailable: "no disponible",
    listings_collapse: "Reducir",
    listings_expand_prefix: "Ver el detalle de los ",
    listings_expand_middle_singular: "anuncio utilizado",
    listings_expand_middle_plural: "anuncios utilizados",
    brocante_label: "En mercadillo:",
    conseil_label: "Consejo:",
    correction_prompt: "¿Algo está mal? Corregir y recalcular",
    correction_instructions:
      'Indica qué está mal (ej.: "en realidad es una talla pequeña"), la estimación se rehará con esta información:',
    correction_placeholder: "ej.: talla pequeña, no grande",
    recalculate_button: "Recalcular la estimación",
    cancel_button: "Cancelar",
    generate_ad_button: "Generar un anuncio para publicar",
    ad_limit_reached: "Límite de 3 generaciones alcanzado para esta estimación.",
    ad_generating: "Generando el anuncio…",
    ad_ready_label: "Anuncio listo para pegar (editable):",
    ad_copied: "¡Copiado!",
    ad_copy_button: "Copiar el texto",
    ad_regenerate_prefix: "Regenerar (",
    ad_regenerate_suffix_singular: " restante)",
    ad_regenerate_suffix_plural: " restantes)",
    ad_limit_reached_edit_note:
      "Límite de 3 generaciones alcanzado para esta estimación — todavía puedes editar el texto a mano justo arriba.",
    ad_paste_instructions:
      "Copia el texto de arriba y luego haz clic en una plataforma para crear tu anuncio (pega el texto una vez en la página):",
    extra_angles_title: "Fotos con IA desde otros ángulos",
    extra_angles_premium_note:
      "Función premium — genera hasta 2 fotos con IA de este objeto desde otros ángulos para tu anuncio",
    extra_angles_generate_button: "Generar 2 fotos desde otros ángulos",
    extra_angles_generating: "Generando (10 a 20 segundos)…",
    extra_angles_retry_button: "Reintentar",
    extra_angles_download_note: "Descárgalas y añádelas a tu foto original en Leboncoin, Vinted o eBay.",

    // Historial / confirmación de borrado
    history_title: "Historial",
    history_clear_all: "borrar todo",
    history_login_note:
      "Inicia sesión desde tu perfil (icono arriba a la derecha) para un historial ilimitado, sincronizado entre dispositivos. Sin cuenta, el historial se queda local en este dispositivo.",
    history_empty: "Todavía no hay estimaciones.",
    history_reestimate_title: "Reestimar (ver si el precio ha cambiado)",
    history_clear_confirm_title: "¿Borrar todo?",
    history_clear_confirm_body_prefix: "Esta acción eliminará definitivamente ",
    history_clear_confirm_body_middle_singular: " estimación de tu historial. No se puede deshacer.",
    history_clear_confirm_body_middle_plural: " estimaciones de tu historial. No se puede deshacer.",
    history_clear_confirm_button: "Borrar todo",

    // Mi colección / objetos escaneados
    collection_title: "Mi colección",
    collection_empty: "Haz tu primera estimación para empezar a llenar tu colección.",
    collection_stat_value_label: "Valor estimado",
    collection_stat_objects_label: "Objetos escaneados",
    collection_streak_prefix: "",
    collection_streak_suffix: " seguidos consultando precios — ¡sigue así!",
    collection_streak_days_singular: "día",
    collection_streak_days_plural: "días",
    collection_chart_title: "El valor de tu colección a lo largo del tiempo",
    collection_chart_premium_prefix: "Pásate a premium para ver tus ",
    collection_chart_premium_suffix_singular: " punto de historial adicional",
    collection_chart_premium_suffix_plural: " puntos de historial adicionales",
    collection_badges_title: "Insignias",
    badge_first: "Primer escaneo",
    badge_five: "5 estimaciones",
    badge_ten: "10 estimaciones",
    badge_fifty: "50 estimaciones",
    badge_streak3: "3 días seguidos",
    badge_streak7: "7 días seguidos",
    badge_streak30: "30 días seguidos",
    badge_powerday5: "5 estimaciones en 1 día",
    badge_bigfind: "Hallazgo de +200 €",
    badge_collector500: "Colección de 500 €",
    badge_collector2000: "Colección de 2000 €",
    badge_adgen10: "10 anuncios generados",
    badge_adgen50: "50 anuncios generados",
    scanned_objects_title: "Objetos escaneados",
    scanned_objects_subtitle_prefix: "Del más caro al más barato — precio medio de cada objeto, cuya suma forma tu ",
    scanned_objects_subtitle_strong: "valor estimado",
    object_fallback_label: "Objeto",

    // Perfil / cuenta / apariencia / créditos
    account_synced_history: "historial sincronizado",
    account_plan_free: "Gratis",
    account_avatars_row: "Avatares",
    account_quota_paid_suffix: " estimaciones restantes este mes",
    account_quota_free_suffix: " estimación(es) gratuita(s) restante(s) este mes",
    account_manage_button: "gestionar",
    account_subscribe_button: "suscribirse",
    account_refer_friend: "Invitar a un amigo",
    account_link_copied: "¡copiado!",
    account_password_set: "Contraseña definida",
    account_password_set_note: "define una contraseña (inicia sesión sin enlace por email)",
    account_new_password_placeholder: "nueva contraseña",
    account_set_password_button: "definir",
    account_sign_out: "cerrar sesión",
    account_magic_link_sent_prefix: "¡Enlace enviado! Revisa tu correo (",
    account_magic_link_sent_suffix: ") y haz clic en él para iniciar sesión.",
    account_signup_sent_prefix: "¡Cuenta creada! Revisa tu correo (",
    account_signup_sent_suffix:
      ") y haz clic en el enlace de confirmación para activar tu cuenta, luego vuelve e inicia sesión con tu contraseña.",
    account_login_intro:
      "Inicia sesión para guardar tu historial, desbloquear tu avatar personalizable y aparecer en la clasificación (opcional).",
    account_email_placeholder: "tu@email.com",
    account_password_placeholder: "contraseña",
    account_signin_button: "iniciar sesión",
    account_signup_button: "crear una cuenta",
    account_or_divider: "o",
    account_magic_link_button: "recibir un enlace de acceso (sin contraseña)",
    display_theme_title: "Tema (fuentes, colores y contornos de toda la app)",
    profile_title: "Mi perfil",
    credits_unit_singular: "estimación",
    credits_unit_plural: "estimaciones",

    // Suscripción / paywall
    paywall_title: "Cuota alcanzada",
    paywall_reason_quota_epuise: "Has usado todas las estimaciones incluidas en tu suscripción este mes.",
    paywall_reason_gratuit_epuise: "Has usado tus estimaciones gratuitas de este mes.",
    paywall_reason_default: "No se puede continuar con la estimación por ahora.",
    paywall_watching_ad: "reproduciendo anuncio…",
    paywall_watch_ad_button: "ver un anuncio para 1 estimación gratis",
    paywall_or_subscribe: "o pásate a una suscripción para muchas más estimaciones:",
    plan_per_month_suffix: "/mes",
    trend_range_1j: "1D",
    trend_range_1s: "1S",
    trend_range_1m: "1M",
    trend_range_1a: "1A",
    trend_range_5a: "5A",
    trend_range_10a: "10A",
    trend_range_total: "Total",

    // Mensajes de error / avisos (lógica de negocio)
    err_payment_creation: "Error al crear el pago.",
    err_portal_open: "Error al abrir el portal.",
    err_portal_open_subscription: "Error al abrir el portal de suscripción.",
    err_password_min_length: "6 caracteres como mínimo.",
    err_search: "Error de búsqueda.",
    err_loading: "Error al cargar.",
    pseudo_err_length: "de 3 a 20 caracteres.",
    pseudo_err_chars: "Solo letras, números, espacios, apóstrofos y guiones.",
    pseudo_err_taken: "Este nombre de usuario ya está en uso.",
    pseudo_err_no_profile: "Inicia sesión para elegir un nombre de usuario.",
    err_retry: "Error, inténtalo de nuevo.",
    err_heic_format:
      "Este archivo está en formato HEIC (fotos de iPhone), que este prototipo de prueba todavía no gestiona. " +
      "Solución rápida: Ajustes → Cámara → Formatos → \"El más compatible\" en tu iPhone, " +
      "y vuelve a tomar la foto. La app real podrá leer HEIC de forma nativa.",
    err_file_read: "No se ha podido leer el archivo seleccionado.",
    err_api_network_prefix: "No se ha podido contactar con la API (red). ",
    err_api_prefix: "Error de la API: ",
    err_api_truncated: "Respuesta cortada (se alcanzó max_tokens).",
    err_api_unreadable_prefix: "Respuesta ilegible de la API (estado ",
    err_api_unreadable_middle: "). Contenido bruto: ",
    err_json_not_found_prefix: "No se encontró JSON en la respuesta: ",
    err_json_invalid_prefix: "JSON no válido: ",
    err_relay_unreachable_prefix: "No se ha podido contactar con el servidor de retransmisión: ",
    err_relay_unreadable_prefix: "Respuesta ilegible del servidor de retransmisión (estado ",
    err_relay_unreadable_suffix: ").",
    err_relay_error_prefix: "Error del servidor de retransmisión: ",
    err_login_required_estimate: "Inicia sesión para lanzar una estimación (3 gratis al mes, sin tarjeta bancaria).",
    err_ad_generation_failed: "No se ha podido generar el anuncio, inténtalo de nuevo.",
    err_ad_copy_failed: "No se ha podido copiar automáticamente, selecciona el texto manualmente.",
    err_extra_angles_generation: "Error durante la generación.",
    err_extra_angles_none: "No se ha podido generar ninguna foto, inténtalo de nuevo.",
    err_extra_angles_failed: "No se han podido generar las fotos, inténtalo de nuevo.",
    err_listings_no_match:
      "Se encontraron anuncios, pero ninguno corresponde exactamente al mismo producto (mismo formato/modelo).",
    err_listings_not_enough: "No se encontraron suficientes anuncios para este objeto.",
    err_estimation_failed: "La estimación ha fallado. Inténtalo de nuevo con otra foto.",
    err_vehicle_estimation_failed: "La estimación del vehículo ha fallado.",
    err_realestate_estimation_failed: "La estimación del inmueble ha fallado.",
    referral_share_text: "¡Estima el valor de reventa de tus objetos en una foto con estim'!",
    src_used_prefix: "estimación basada en ",
    src_used_middle: " anuncio(s) de segunda mano real(es) (Leboncoin/Vinted/eBay)",
    src_used_sold_prefix: ", de los cuales ",
    src_used_sold_suffix: " venta(s) confirmada(s) en eBay",
    src_humor_mode: "modo estim' 'estimar cualquier cosa, hasta disparates' 🎭",
    src_ai_no_listings_prefix: "estimación IA (anuncios reales no disponibles: ",
    src_ai_no_listings_suffix: ")",
    src_ai_vehicle: "estimación IA de vehículo — indicativa, sin anuncios reales comparados",
    src_ai_realestate: "estimación IA inmobiliaria — muy aproximada, sin datos del mercado local",
    seed_etat_unverifiable: "Estado no verificable a distancia: estimación basada en un anuncio en línea, no en una foto.",
    seed_etat_note: "de segunda mano (estado no verificado)",
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

// Libellés (compacts, façon graphique boursier) des points du graphique de
// tendance — module-level donc pas d'accès direct à t()/lang (voir
// buildTrendSeries, appelée avec `lang` explicite depuis le composant App).
const TREND_TODAY_LABEL = { fr: "auj.", en: "today", es: "hoy" };
const TREND_NOW_LABEL = { fr: "maint.", en: "now", es: "ahora" };
function trendYearsAgoLabel(k, lang) {
  if (k <= 0) return TREND_TODAY_LABEL[lang] || TREND_TODAY_LABEL.fr;
  if (lang === "en") return `-${k} yr${k > 1 ? "s" : ""}`;
  if (lang === "es") return `-${k} año${k > 1 ? "s" : ""}`;
  return `-${k} an${k > 1 ? "s" : ""}`;
}
function trendMonthsAgoLabel(k, lang) {
  if (lang === "en") return `-${k} mo`;
  if (lang === "es") return `-${k} mes${k > 1 ? "es" : ""}`;
  return `-${k} mois`;
}
function trendDaysAgoLabel(k, lang) {
  return (lang === "fr" ? "j-" : "d-") + k;
}
function trendHoursAgoLabel(k) {
  return `-${k}h`;
}

// Construit les points du graphique pour une période donnée ("1j" à
// "total") à partir des indices annuels renvoyés par l'IA (tendance sur 10
// ans). Les périodes courtes (1j/1s/1m) "zooment" dans la fin de la courbe
// longue plutôt que d'inventer une donnée indépendante — comme un vrai
// graphique boursier qui n'a qu'UNE série de prix, juste regardée à des
// résolutions différentes.
function buildTrendSeries(yearlyIndices, rangeKey, seedStr, priceAvg, lang) {
  const idx = (yearlyIndices || []).filter((n) => typeof n === "number" && !isNaN(n));
  if (idx.length < 2) return null;
  const n = idx.length;
  const values = idx.map((v) => priceAvg * (v / 100));

  if (rangeKey === "10a" || rangeKey === "total") {
    return values.map((v, i) => ({ label: trendYearsAgoLabel(n - 1 - i, lang), value: v }));
  }
  if (rangeKey === "5a") {
    const start = Math.max(0, n - 6);
    return values.slice(start).map((v, i) => ({ label: trendYearsAgoLabel(n - 1 - (start + i), lang), value: v }));
  }

  const last = values[n - 1];
  const prev = values[n - 2] !== undefined ? values[n - 2] : last;
  const monthSeg = interpolateSegment(prev, last, 11, seedStr + "|1a");

  if (rangeKey === "1a") {
    return monthSeg.map((v, i) => ({
      label: i === monthSeg.length - 1 ? (TREND_TODAY_LABEL[lang] || TREND_TODAY_LABEL.fr) : trendMonthsAgoLabel(monthSeg.length - 1 - i, lang),
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
      label: i === daySeg.length - 1 ? (TREND_TODAY_LABEL[lang] || TREND_TODAY_LABEL.fr) : trendDaysAgoLabel(daySeg.length - 1 - i, lang),
      value: v,
    }));
  }
  if (rangeKey === "1s") {
    const weekSeg = daySeg.slice(-7);
    return weekSeg.map((v, i) => ({
      label: i === weekSeg.length - 1 ? (TREND_TODAY_LABEL[lang] || TREND_TODAY_LABEL.fr) : trendDaysAgoLabel(weekSeg.length - 1 - i, lang),
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
    label: i === hourSeg.length - 1 ? (TREND_NOW_LABEL[lang] || TREND_NOW_LABEL.fr) : trendHoursAgoLabel((hourSeg.length - 1 - i) * 3),
    value: v,
  }));
}

const TREND_RANGES = [
  { key: "1j" },
  { key: "1s" },
  { key: "1m" },
  { key: "1a" },
  { key: "5a" },
  { key: "10a" },
  { key: "total" },
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

// Anime l'ouverture/fermeture d'un panneau "bottom sheet" (glisse depuis le
// bas plutôt qu'une simple apparition) et permet de le refermer au doigt en
// le faisant glisser vers le bas (en plus de la croix/du clic sur le fond) —
// demandé par Dylan pour le menu et le profil. `open`/`onRequestClose`
// suivent le state existant du panneau (ex: showMenu/setShowMenu(false)) :
// rien ne change dans la logique d'ouverture, seule l'animation d'entrée/
// sortie et le geste de balayage sont ajoutés.
//
// Le geste fonctionne depuis PRESQUE N'IMPORTE OÙ sur le panneau (pas
// juste la petite poignée) — attaché en natif (addEventListener, pas les
// props React onTouchMove) car on a besoin de vraiment bloquer le scroll
// pendant qu'on ferme (event.preventDefault), ce que React empêche par
// défaut sur ses gestionnaires tactiles synthétiques (passive listeners).
// Pour ne pas entrer en conflit avec le défilement du contenu, on ne prend
// la main pour fermer que quand le panneau est DÉJÀ remonté tout en haut
// (scrollTop === 0) ET que le doigt descend — sinon le scroll natif fait
// son travail normalement.
function useBottomSheet(open, onRequestClose, closeDurationMs = 260) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef(null);
  const draggingRef = useRef(false);
  const dragYRef = useRef(0);
  const startYRef = useRef(0);
  function setDrag(v) {
    dragYRef.current = v;
    setDragY(v);
  }
  // Les ids stockés ici peuvent être un timeout ou une animation frame —
  // on appelle les deux fonctions d'annulation sur chacun (sans effet sur
  // l'id qui ne correspond pas à sa liste) pour ne pas avoir à distinguer
  // leur origine.
  const pendingRef = useRef([]);
  function clearPending() {
    pendingRef.current.forEach((id) => {
      clearTimeout(id);
      cancelAnimationFrame(id);
    });
    pendingRef.current = [];
  }

  useEffect(() => {
    clearPending();
    if (open) {
      setMounted(true);
      setDrag(0);
      // Le panneau doit d'abord se poser hors-écran (translateY 1000px)
      // avant qu'on bascule "entered" à true — sinon le navigateur peint
      // directement la position finale et il n'y a pas de transition
      // visible. Deux requestAnimationFrame imbriqués garantissent que ce
      // premier état hors-écran a bien été peint au moins une fois.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setEntered(true));
        pendingRef.current.push(raf2);
      });
      pendingRef.current.push(raf1);
    } else if (mounted) {
      setEntered(false);
      const t = setTimeout(() => {
        setMounted(false);
        setDrag(0);
      }, closeDurationMs);
      pendingRef.current.push(t);
    }
    return clearPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    function handleTouchStart(e) {
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = false;
    }
    function handleTouchMove(e) {
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        // Le doigt remonte : jamais une fermeture — on relâche la main au
        // scroll natif normal.
        if (draggingRef.current) {
          draggingRef.current = false;
          setDrag(0);
        }
        return;
      }
      if (!draggingRef.current) {
        // Le doigt descend, mais on ne "prend la main" pour fermer que si
        // le contenu est déjà remonté tout en haut — sinon on laisse
        // d'abord le scroll natif remonter le contenu normalement.
        if (el.scrollTop > 0) return;
        draggingRef.current = true;
      }
      e.preventDefault();
      setDrag(delta);
    }
    function handleTouchEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (dragYRef.current > 90) {
        onRequestClose();
      } else {
        setDrag(0);
      }
    }
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  return {
    mounted,
    sheetRef,
    sheetStyle: {
      transform: `translateY(${entered ? dragY : 1000}px)`,
      transition: draggingRef.current ? "none" : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
    },
  };
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
  const [listingsOpen, setListingsOpen] = useState(false); // affiche la liste détaillée des annonces retenues (repliée par défaut, page plus courte)
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
    const text = t("referral_share_text");
    if (navigator.share) {
      try {
        await navigator.share({ title: "estim'", text, url: link });
      } catch (e) {}
    } else {
      copyReferralLink();
    }
  }
  const [adGenCount, setAdGenCount] = useState(0); // nb de générations/régénérations d'annonce pour l'estimation en cours (max 3, pour éviter un abus d'appels IA gratuits)
  // Photos IA sous d'autres angles (jusqu'à 2), fonctionnalité Premium :
  // extraAngles = [{ mime_type, data(base64) }, ...] une fois générées.
  const [extraAngles, setExtraAngles] = useState(null);
  const [extraAnglesLoading, setExtraAnglesLoading] = useState(false);
  const [extraAnglesError, setExtraAnglesError] = useState(null);
  const [extraAnglesAttempted, setExtraAnglesAttempted] = useState(false); // masque le bouton une fois un essai réussi (coût réel par génération)
  const fileInputRef = useRef(null); // conservé pour compat, non utilisé directement

  // Langue de l'interface (persistée localement) — volet de traduction
  // volontairement limité, voir TRANSLATIONS plus haut. Déclarée ici (avant
  // la reconnaissance vocale ci-dessous) pour que `lang`/`localeTag` soient
  // utilisables dans son tableau de dépendances.
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
  // Tag de locale pour toLocaleDateString/toLocaleString (dates, séparateurs
  // de milliers) — suit désormais la langue choisie au lieu d'être toujours
  // en "fr-FR" (demandé par Dylan : toute l'appli doit être traduite).
  const LANG_LOCALE = { fr: "fr-FR", en: "en-US", es: "es-ES" };
  function localeTag() {
    return LANG_LOCALE[lang] || "fr-FR";
  }
  // Instruction ajoutée aux prompts IA (voir callClaude) pour que les champs
  // en langage naturel de la réponse (objet, commentaire, conseil, hypothèse,
  // etc.) reviennent dans la langue choisie par l'utilisateur, au lieu
  // d'être toujours en français (demandé par Dylan : toute l'appli doit
  // être traduite, y compris ce que l'IA renvoie).
  const AI_LANGUAGE_NAME = { fr: "français", en: "anglais", es: "espagnol" };
  function aiLangInstruction() {
    const name = AI_LANGUAGE_NAME[lang] || "français";
    return ` Réponds en ${name} pour tous les champs de texte en langage naturel de ta réponse JSON (pas les nombres, ni les valeurs fixes/énumérées comme "type_sujet").`;
  }

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
    recognition.lang = localeTag();
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
  }, [lang]);

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
  const [creditQuantity, setCreditQuantity] = useState(10); // valeur numérique validée (>=1), utilisée pour le calcul et l'achat
  const [creditQuantityText, setCreditQuantityText] = useState("10"); // texte affiché dans le champ, peut être vide pendant la saisie
  const [creditCheckoutLoading, setCreditCheckoutLoading] = useState(false);
  const [creditError, setCreditError] = useState(null);

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
        "plan, subscription_status, quota_mensuel, estimations_utilisees, gratuit_utilisees, gratuit_pubs_vues, bonus_pub_disponible, stripe_customer_id, pseudo, avatar_character, avatar_display_mode, credits_achetes, has_password"
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
      if (!res.ok || !data.url) throw new Error(data.error || t("err_payment_creation"));
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setPaywallInfo((prev) => ({ ...(prev || {}), message: e.message || t("err_payment_creation") }));
      setCheckoutLoading(null);
    }
  }

  // Achat d'estimations à l'unité (hors abonnement) : session Stripe en
  // mode paiement unique, quantité choisie via le stepper +/-. Le prix
  // réel (0,30 €/estimation, sans remise) est recalculé côté serveur —
  // "quantity" est la seule donnée envoyée, jamais un prix.
  async function startCreditCheckout() {
    if (!user) return;
    setCreditError(null);
    setCreditCheckoutLoading(true);
    try {
      const res = await fetch(PROXY_URL + "/create-credit-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          quantity: creditQuantity,
          return_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || t("err_payment_creation"));
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setCreditError(e.message || t("err_payment_creation"));
      setCreditCheckoutLoading(false);
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
      if (!res.ok || !data.url) throw new Error(data.error || t("err_portal_open"));
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setError(e.message || t("err_portal_open_subscription"));
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
      setPasswordError(t("err_password_min_length"));
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
      // Persiste côté serveur (table "profiles") que ce compte a désormais
      // un mot de passe, pour que le formulaire ne réapparaisse pas à la
      // prochaine connexion — "passwordStatus" seul ne survit pas à un
      // rechargement de page.
      supabase.rpc("mark_password_set").then(({ error: rpcError }) => {
        if (!rpcError) setProfile((prev) => (prev ? { ...prev, has_password: true } : prev));
      });
    }
  }

  // Menu principal (☰) : historique, recherche produit, tendances,
  // abonnement, contact, langue, déconnexion.
  const [showMenu, setShowMenu] = useState(false);
  // Anime l'ouverture/fermeture du panneau + geste de balayage vers le bas
  // pour le refermer (voir useBottomSheet plus haut).
  const menuSheet = useBottomSheet(showMenu, () => setShowMenu(false));

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

  // Rang du plan d'abonnement actif (voir PLAN_GRADE_RANK plus haut) — 0 si
  // non connecté, plan gratuit, ou abonnement non actif (résilié, impayé,
  // etc. — même vérification que isPremiumPlan ailleurs dans le fichier).
  // Sert au déblocage des avatars (CHARACTERS_META plus bas) — l'ancien
  // système d'"habillages" bronze/argent/or/diamant qui l'utilisait aussi a
  // été retiré (voir plus bas, `accent`/`accentDark`/`accentLight` viennent
  // maintenant de l'affichage choisi, pas du plan).
  const userPlanRank = profile && profile.subscription_status === "active" ? PLAN_GRADE_RANK[profile.plan] || 0 : 0;

  // Exception personnelle (compte de Dylan uniquement) : peut sélectionner
  // n'importe quel avatar pour l'aperçu, même non débloqué. N'affecte que le
  // style affiché sur SON compte — le vrai compteur/seuils de déblocage
  // restent inchangés pour tout le monde (y compris pour lui).
  const isOwnerPreview = !!(user && user.email && user.email.toLowerCase() === "dyloo999@gmail.com");

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

  // Nombre de jours DISTINCTS où l'appli a été ouverte, et jours
  // CONSÉCUTIFS jusqu'à aujourd'hui (streak) — sert à débloquer certains
  // personnages de l'avatar (voir CHARACTERS_META plus bas). Ne sert plus à
  // débloquer les affichages (AFFICHAGES plus haut, tous disponibles
  // d'emblée pour l'instant — mécanisme de déblocage à définir plus tard).
  // Propre à l'appareil (local uniquement) : on garde la liste des dates
  // (YYYY-MM-DD) déjà vues dans localStorage, et on ajoute la date du jour
  // une seule fois au montage si elle n'y est pas encore.
  function computeConnectionStreak(days) {
    try {
      const set = new Set(Array.isArray(days) ? days : []);
      let streak = 0;
      const cursor = new Date();
      while (set.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    } catch (e) {
      return 0;
    }
  }
  const [lifetimeConnectionDays, setLifetimeConnectionDays] = useState(() => {
    try {
      const raw = localStorage.getItem("estim_lifetime_connection_days");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) {
      return 0;
    }
  });
  const [connectionStreak, setConnectionStreak] = useState(() => {
    try {
      const raw = localStorage.getItem("estim_lifetime_connection_days");
      const arr = raw ? JSON.parse(raw) : [];
      return computeConnectionStreak(arr);
    } catch (e) {
      return 0;
    }
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("estim_lifetime_connection_days");
      const arr = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(arr) ? arr : [];
      const today = new Date().toISOString().slice(0, 10);
      if (!list.includes(today)) {
        const next = list.concat([today]);
        localStorage.setItem("estim_lifetime_connection_days", JSON.stringify(next));
        setLifetimeConnectionDays(next.length);
        setConnectionStreak(computeConnectionStreak(next));
      } else {
        setConnectionStreak(computeConnectionStreak(list));
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedAffichageKey, setSelectedAffichageKey] = useState(() => {
    try {
      const stored = localStorage.getItem("estim_affichage");
      if (stored && AFFICHAGES.some((a) => a.key === stored)) return stored;
    } catch (e) {}
    return "classique";
  });
  useEffect(() => {
    try {
      localStorage.setItem("estim_affichage", selectedAffichageKey);
    } catch (e) {}
  }, [selectedAffichageKey]);

  // Tous les affichages sont débloqués d'emblée (`threshold: 0` pour
  // chacun, voir AFFICHAGES plus haut) — le mécanisme de déblocage sera
  // défini dans un second temps, ce qui garde la sélection ci-dessous très
  // simple (pas de notion de "plus haut débloqué"/toast/progression).
  const activeAffichage = AFFICHAGES.find((a) => a.key === selectedAffichageKey) || AFFICHAGES[0];

  // Couleur de mise en avant (boutons, prix, liens, lueurs...) : vient
  // maintenant de l'affichage choisi (voir `accent`/`accentDark`/
  // `accentLight`/`glow` sur chaque entrée d'AFFICHAGES) plutôt que d'un
  // palier d'abonnement bronze/argent/or/diamant, retiré à la demande de
  // Dylan — l'accent reste ainsi toujours cohérent avec le thème affiché.
  const accent = activeAffichage.accent;
  const accentDark = activeAffichage.accentDark;
  const accentLight = activeAffichage.accentLight;
  const accentRgb = hexToRgbString(activeAffichage.accent);
  const accentGlow = activeAffichage.glow || 0;

  const menuTheme = activeAffichage.mode;
  // "blanc" (variante claire de Classique) se comporte comme "light" pour
  // tout ce qui dépend juste de "fond clair vs fond sombre" (logo, sens des
  // dégradés...) — seules les couleurs PANEL_THEMES.blanc changent.
  const lightSurface = menuTheme === "light" || menuTheme === "blanc";
  const pt = { ...(PANEL_THEMES[menuTheme] || PANEL_THEMES.dark) };
  // Arrière-plans : on ne retouche que les grandes surfaces (page,
  // panneaux, header, carte résultat, écran de chargement, zone photo) —
  // "Classique" (pas de base/mid/high) reste strictement identique à avant.
  if (activeAffichage.base) {
    pt.pageBg = activeAffichage.base;
    pt.sheetBg = `linear-gradient(160deg, ${activeAffichage.base} 0%, ${activeAffichage.mid} 45%, ${activeAffichage.high} 100%)`;
    // Header/carte résultat : pour un affichage sombre, on part d'un
    // quasi-noir vers la teinte forte (comportement d'origine). Pour un
    // affichage clair (ex: Vintage), un départ noir jure avec le papier
    // clair et écrase le texte/logo/menu déjà en noir dessus (remonté par
    // Dylan) — on part donc de la teinte forte (accent) vers le plus clair,
    // sans jamais passer par du noir.
    pt.headerBg =
      menuTheme === "light"
        ? `linear-gradient(135deg, ${activeAffichage.high} 0%, ${activeAffichage.mid} 55%, ${activeAffichage.base} 100%)`
        : `linear-gradient(135deg, #04060C 0%, ${activeAffichage.mid} 52%, ${activeAffichage.high} 100%)`;
    pt.resultCardBg = pt.headerBg;
    pt.loadingBg = `linear-gradient(160deg, ${activeAffichage.high} 0%, ${activeAffichage.mid} 100%)`;
    pt.loadingBorder = activeAffichage.high;
    pt.dropZoneBg = `radial-gradient(circle at 50% 32%, ${activeAffichage.mid} 0%, ${activeAffichage.base} 72%)`;
  }
  // Contours : même principe, on ne change que la teinte (r, g, b) des
  // bordures/séparateurs/pointillés — jamais leur épaisseur ni leur style
  // ("1px solid"/"1px dashed" conservés tels quels) — "Classique" (pas de
  // borderRgb) reste strictement identique à avant.
  if (activeAffichage.borderRgb) {
    const b = activeAffichage.borderRgb;
    pt.rowBorder = `1px solid rgba(${b}, 0.22)`;
    pt.chipBorder = `1px solid rgba(${b}, 0.32)`;
    pt.inputBorder = `1px solid rgba(${b}, 0.4)`;
    pt.dashedBorder = `1px dashed rgba(${b}, 0.32)`;
    pt.cardBorder = `1px solid rgba(${b}, 0.22)`;
    pt.formCardBorder = `1px solid rgba(${b}, 0.28)`;
    pt.langUnselectedBorder = `1px solid rgba(${b}, 0.22)`;
    pt.ghostBorder = `rgba(${b}, 0.45)`;
    pt.menuBtnBorder = `rgba(${b}, 0.4)`;
  }
  // Texte : uniquement pour un affichage clair au ton marqué (ex: Vintage,
  // encre sur papier) où les gris-bleutés hérités de PANEL_THEMES.light
  // jureraient avec la palette chaude — absent ailleurs (textes d'origine
  // inchangés). `textStrong` = titres/texte fort, `textSoft` = texte
  // secondaire/atténué.
  if (activeAffichage.textStrong) {
    pt.titleColor = activeAffichage.textStrong;
    pt.strongColor = activeAffichage.textStrong;
    pt.rowText = activeAffichage.textStrong;
    pt.cardTitleColor = activeAffichage.textStrong;
    pt.closeColor = activeAffichage.textStrong;
    pt.menuBtnColor = activeAffichage.textStrong;
    pt.ghostColor = activeAffichage.textStrong;
    pt.dropZoneText = activeAffichage.textStrong;
    pt.inputText = activeAffichage.textStrong;
  }
  if (activeAffichage.textSoft) {
    pt.subText = activeAffichage.textSoft;
    pt.chevronColor = activeAffichage.textSoft;
    pt.chipText = activeAffichage.textSoft;
  }
  // Taille des titres `.brand` (voir brandSize() plus bas) : certaines
  // polices "affichage" (Orbitron, Bungee...) sont nettement plus larges
  // que Fraunces au même corps — sans compensation, de longues phrases
  // (ex: l'accroche "Tout a un prix.") débordent ou se recassent sur
  // plusieurs lignes. `displayScale` (défaut 1) réduit proportionnellement
  // tous les titres de l'affichage concerné pour qu'ils gardent la même
  // disposition (une phrase = une ligne), sans jamais toucher aux tailles
  // des autres éléments.
  function brandSize(px) {
    return Math.round(px * (activeAffichage.displayScale ?? 1));
  }
  // Taille du titre et du sous-titre de l'accroche d'accueil — distincte de
  // `brandSize()` (voir `heroScale` dans AFFICHAGES ci-dessus) : Dylan a
  // trouvé le titre "Combien ça vaut, vraiment ?" et le sous-titre "Meuble,
  // bijoux, vieux jouet..." trop gros sur Vintage/Rétro/Robotique, alors
  // que Futuriste allait bien — donc un réglage à part, pas un nouvel
  // ajustement de `displayScale` qui toucherait aussi les autres titres.
  pt.heroTitleSize = Math.round(brandSize(33) * (activeAffichage.heroScale ?? 1));
  pt.heroSubtitleSize = Math.round(14 * (activeAffichage.heroScale ?? 1));
  // Couleur (et graisse) du titre de l'accroche ("Combien ça vaut,")
  // et du compteur d'estimations restantes juste en dessous : sur
  // Vintage, pt.strongColor (textStrong, quasi noir) rendait ces deux
  // éléments trop "bruts/agressifs" en grand/gras selon Dylan — un premier
  // passage au brun textSoft réglait ça, mais rendait le titre pas assez
  // mis en valeur à son goût. Couleur intermédiaire dédiée (#4A3620, plus
  // soutenue que textSoft #6B5D48 sans revenir au quasi-noir de
  // textStrong) + graisse remontée à 800 (Playfair Display, qui a une
  // vraie graisse "black", contrairement à Anton) pour lui redonner de la
  // présence. Uniquement pour ces deux éléments précis, sans toucher aux
  // autres titres/panneaux qui gardent pt.strongColor.
  pt.heroEmphasisColor = activeAffichage.key === "vintage" ? "#4A3620" : pt.strongColor;
  pt.heroTitleWeight = activeAffichage.key === "vintage" ? 800 : 600;
  // Liseré tout en haut de l'appli : pour un affichage avec sa propre
  // palette (Vintage, Rétro, Robotique, Futuriste — tout ce qui a
  // base/mid/high), il reprend désormais ces couleurs plutôt que le
  // navy/gris + accent de palier fixe d'origine (demandé par Dylan) — même
  // sens que le header (clair : de la teinte forte vers le plus clair ;
  // sombre : du quasi-noir vers la teinte forte). "Classique" (pas de
  // base/mid/high) garde son dégradé d'origine, qui se termine toujours
  // sur l'accent de palier actif.
  pt.topBarGradient = activeAffichage.base
    ? menuTheme === "light"
      ? `linear-gradient(90deg, ${activeAffichage.high} 0%, ${activeAffichage.mid} 55%, ${activeAffichage.base} 100%)`
      : `linear-gradient(90deg, ${activeAffichage.base} 0%, ${activeAffichage.mid} 45%, ${activeAffichage.high} 100%)`
    : lightSurface
      ? `linear-gradient(90deg, #D7DEE6 0%, #93A4BC 35%, ${accent} 100%)`
      : `linear-gradient(90deg, #152238 0%, #29394F 35%, ${accent} 100%)`;
  pt.grabBg =
    lightSurface
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
      if (!res.ok) throw new Error(data.error || t("err_search"));
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
      if (!res.ok) throw new Error(data.error || t("err_loading"));
      setCatTrendingCache((prev) => ({ ...prev, [cat.key]: data.items || [] }));
    } catch (e) {
      console.error(e);
      setCatTrendingError(e.message || t("err_loading"));
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
      if (!res.ok) throw new Error(data.error || t("err_loading"));
      setTrendingItems(data.items || []);
      setTrendingPage(1);
    } catch (e) {
      console.error(e);
      setTrendingError(e.message || t("err_loading"));
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
      setLeaderboardError(e.message || t("err_loading"));
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
  // de l'avatar (personnage choisi) est déclaré plus bas, juste après
  // CHARACTERS_META dont il dépend.
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  // Panneau "Profil" — connexion/compte + accès à l'avatar, ouvert depuis
  // l'icône en haut à droite du header (plus dans le menu hamburger).
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const profileSheet = useBottomSheet(showProfilePanel, () => setShowProfilePanel(false));
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
    longueur_invalide: t("pseudo_err_length"),
    caracteres_invalides: t("pseudo_err_chars"),
    deja_pris: t("pseudo_err_taken"),
    profil_introuvable: t("pseudo_err_no_profile"),
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
        setPseudoError(PSEUDO_ERROR_LABELS[data && data.reason] || t("err_retry"));
      }
    } catch (e) {
      console.error(e);
      setPseudoError(t("err_retry"));
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
  // Message de confirmation avant "tout effacer" dans l'historique — évite
  // une suppression accidentelle et irréversible.
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

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
      label: new Date(h.date).toLocaleDateString(localeTag(), { day: "numeric", month: "short" }),
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
  // jour. Distinct du catalogue de personnages de l'avatar (CHARACTERS_META
  // plus bas), qui réutilise les mêmes stats mais pour un tout autre usage
  // (débloquer un personnage, pas des icônes de badge).
  const COLLECTION_BADGES = [
    { id: "first", emoji: "🎉", label: t("badge_first"), test: () => history.length >= 1 },
    { id: "five", emoji: "📸", label: t("badge_five"), test: () => history.length >= 5 },
    { id: "ten", emoji: "🔥", label: t("badge_ten"), test: () => history.length >= 10 },
    { id: "fifty", emoji: "🏆", label: t("badge_fifty"), test: () => history.length >= 50 },
    { id: "streak3", emoji: "⚡", label: t("badge_streak3"), test: () => portfolioStreak >= 3 },
    { id: "streak7", emoji: "🌟", label: t("badge_streak7"), test: () => portfolioStreak >= 7 },
    { id: "streak30", emoji: "👑", label: t("badge_streak30"), test: () => portfolioStreak >= 30 },
    { id: "powerday5", emoji: "🚀", label: t("badge_powerday5"), test: () => portfolioMaxPerDay >= 5 },
    { id: "bigfind", emoji: "💰", label: t("badge_bigfind"), test: () => portfolioBestFind >= 200 },
    { id: "collector500", emoji: "📦", label: t("badge_collector500"), test: () => portfolioValue >= 500 },
    { id: "collector2000", emoji: "💎", label: t("badge_collector2000"), test: () => portfolioValue >= 2000 },
    { id: "adgen10", emoji: "📣", label: t("badge_adgen10"), test: () => lifetimeAdGenerations >= 10 },
    { id: "adgen50", emoji: "📢", label: t("badge_adgen50"), test: () => lifetimeAdGenerations >= 50 },
  ];

  // Panneau "Avatar" : on choisit un PERSONNAGE tout fait, illustré avec un
  // vrai portrait généré (Google Flow — Nano Banana Pro, voir
  // CHARACTER_IMAGES tout en haut du fichier — plus aucun dessin SVG). Le
  // Chineur et La Chineuse sont débloqués dès le départ (gratuit) ; les
  // autres se débloquent au fil des estimations générées (lifetimeEstimations)
  // — les mêmes règles pour tout le monde, gratuit ou abonné (l'abonnement
  // ne change que le quota d'estimations, pas l'avatar). Plus le seuil est
  // haut, plus le perso est stylé, jusqu'aux personnages SECRETS tout en
  // haut (100 000 estimations, non affichés tant qu'ils ne sont pas
  // débloqués). Accessible depuis le menu ET depuis "Classement" (à côté
  // du pseudo).
  //
  // IMPORTANT : seuls les personnages qui ont déjà un vrai portrait
  // (CHARACTER_IMAGES) figurent ici.
  const DEFAULT_CHARACTER_ID = "chineur";
  // Sentinelle pour l'option "Aucun avatar" du panneau de sélection — ne
  // fait volontairement pas partie de CHARACTERS_META (jamais envoyée telle
  // quelle au serveur, voir saveAvatar) ni des ids valides côté Supabase.
  const NO_AVATAR_ID = "aucun";
  // Ces 3 personnages ne se débloquent QUE par abonnement (aucun seuil
  // d'estimations, contrairement au Hibou qui a les deux voies) — tant
  // qu'ils ne sont PAS débloqués, ils n'apparaissent pas du tout dans la
  // grille de sélection (un utilisateur qui n'a pas le pack ne doit même
  // pas savoir qu'ils existent, demandé par Dylan). Une fois débloqués via
  // le pack correspondant, ils réapparaissent normalement, mélangés aux
  // autres selon l'ordre de rareté — voir le filtre plus bas.
  const PACK_ONLY_HIDDEN_IDS = ["ratonMasque", "spectreElegant", "griffonCeleste"];
  // Vrai uniquement si l'utilisateur a explicitement choisi un avatar au
  // moins une fois — SANS repli sur DEFAULT_CHARACTER_ID. Un nouvel
  // utilisateur n'a aucun avatar sélectionné (même pas "chineur") et doit
  // voir le cadre "prendre une photo" dans son mode de base (avec texte),
  // pas le mode immersif plein cadre.
  const hasChosenAvatar = !!(profile && profile.avatar_character);
  // Portrait "en action" à incruster en plein cadre dans "prendre une
  // photo" — celui du personnage réellement équipé, seulement s'il en a un
  // (voir CHARACTER_ACTION_IMAGES tout en haut du fichier) ; sinon (ou si
  // aucun avatar n'est choisi) le cadre reste en mode de base, sans repli
  // sur un autre personnage. Egalement absent si l'utilisateur a choisi de
  // n'utiliser son avatar que comme icône (avatar_display_mode = "icone" —
  // voir le choix proposé dans le panneau Avatars) : dans ce cas l'écran
  // photo garde son interface de base, sans le perso en grand. "icone" est
  // le comportement par défaut (demandé par Dylan, septembre 2026) : choisir
  // un avatar ne change d'abord QUE la petite icône ; la mascotte en fond
  // est une option secondaire explicite, pas automatique.
  const avatarDisplayMode = (profile && profile.avatar_display_mode) || "icone";
  const dropZoneMascot =
    hasChosenAvatar && avatarDisplayMode !== "icone" ? CHARACTER_ACTION_IMAGES[profile.avatar_character] || null : null;
  // Nouvelle progression (demandée par Dylan, septembre 2026) : seuils
  // d'estimations entièrement revus, et 4 personnages passent en
  // déblocage par ABONNEMENT plutôt que par nombre d'estimations (voir
  // planRank, comparé à userPlanRank — un plan plus élevé débloque aussi
  // tous les paliers en dessous, voir PLAN_GRADE_RANK plus haut).
  // Hibou Sage garde en plus son seuil d'estimations : il se débloque par
  // L'UN OU L'AUTRE des deux chemins (voir isCharacterUnlocked).
  // Les noms de personnages restent identiques dans les 3 langues (comme
  // des noms de marque/personnages de jeu) — seuls les indices de
  // déblocage ("dès N estimations" / "avec le pack X") sont traduits, via
  // `threshold`/`packLabel` (au lieu d'un texte `hint` figé) + la fonction
  // characterHint() juste après ce tableau.
  const CHARACTERS_META = [
    // --- Palier 0 : gratuits dès le départ ---
    { id: "chineur", name: "Le Chineur", tier: 0, free: true },
    { id: "chineuse", name: "La Chineuse", tier: 0, free: true },
    // --- Palier 1 ---
    { id: "renard", name: "Renard Malin", tier: 1, test: () => lifetimeEstimations >= 10, threshold: 10 },
    { id: "robotChrome", name: "Robot Chrome", tier: 1, test: () => lifetimeEstimations >= 25, threshold: 25 },
    { id: "lapin", name: "Lapin Chanceux", tier: 1, test: () => lifetimeEstimations >= 50, threshold: 50 },
    { id: "tigreStyle", name: "Tigre Stylé", tier: 1, test: () => lifetimeEstimations >= 100, threshold: 100 },
    // --- Palier 2 ---
    { id: "astroDebutant", name: "Astro Débutant", tier: 2, test: () => lifetimeEstimations >= 250, threshold: 250 },
    { id: "hiboo", name: "Hibou Sage", tier: 2, planRank: PLAN_GRADE_RANK.debutant, packLabel: "Starter" },
    { id: "loupDetective", name: "Loup Détective", tier: 2, test: () => lifetimeEstimations >= 500, threshold: 500 },
    { id: "sorciereFutee", name: "Sorcière Futée", tier: 2, test: () => lifetimeEstimations >= 750, threshold: 750 },
    // --- Palier 3 ---
    { id: "alienCurieux", name: "Alien Curieux", tier: 3, test: () => lifetimeEstimations >= 1000, threshold: 1000 },
    { id: "ninjaSilencieux", name: "Ninja Silencieux", tier: 3, test: () => lifetimeEstimations >= 1300, threshold: 1300 },
    { id: "chevalierDore", name: "Chevalier Doré", tier: 3, test: () => lifetimeEstimations >= 1800, threshold: 1800 },
    { id: "bebeDragon", name: "Bébé Dragon", tier: 3, test: () => lifetimeEstimations >= 2500, threshold: 2500 },
    // --- Palier 4 ---
    { id: "capitainePirate", name: "Capitaine Pirate", tier: 4, test: () => lifetimeEstimations >= 3500, threshold: 3500 },
    { id: "ratonMasque", name: "Raton Masqué", tier: 4, planRank: PLAN_GRADE_RANK.pro, packLabel: "Pro" },
    { id: "pieuvreMystique", name: "Pieuvre Mystique", tier: 4, test: () => lifetimeEstimations >= 5000, threshold: 5000 },
    { id: "phenixArdent", name: "Phénix Ardent", tier: 4, test: () => lifetimeEstimations >= 7000, threshold: 7000 },
    // --- Palier 5 ---
    { id: "panthereNuit", name: "Panthère des Nuits", tier: 5, test: () => lifetimeEstimations >= 10000, threshold: 10000 },
    { id: "spectreElegant", name: "Spectre Élégant", tier: 5, planRank: PLAN_GRADE_RANK.premium, packLabel: "Premium" },
    { id: "griffonCeleste", name: "Griffon Céleste", tier: 5, planRank: PLAN_GRADE_RANK.elite, packLabel: "Elite" },
    // --- Palier 6 : le secret ---
    { id: "diableEcarlate", name: "Le Diable Écarlate", tier: 6, secret: true, test: () => lifetimeEstimations >= 20000, threshold: 20000 },
  ];
  function characterMeta(id) {
    return CHARACTERS_META.find((c) => c.id === id) || CHARACTERS_META[0];
  }
  function isCharacterUnlocked(id) {
    const meta = characterMeta(id);
    if (meta.free) return true;
    const byEstimations = meta.test ? meta.test() : false;
    const byPlan = meta.planRank ? userPlanRank >= meta.planRank : false;
    return byEstimations || byPlan;
  }
  // Indice de déblocage traduit ("dès 10 estimations" / "avec le pack
  // Starter" / "??? (secret)") — calculé à partir de `threshold`/`packLabel`
  // plutôt qu'un texte `hint` figé en français (voir CHARACTERS_META).
  function characterHint(meta) {
    if (meta.packLabel) {
      return `${t("avatar_hint_pack_prefix")}${meta.packLabel}${t("avatar_hint_pack_suffix")}`;
    }
    if (typeof meta.threshold === "number") {
      return `${t("avatar_hint_from_prefix")}${meta.threshold.toLocaleString(localeTag())}${t("avatar_hint_estimations_suffix")}`;
    }
    return t("avatar_hint_secret");
  }
  // Libellé + couleur du niveau de confiance d'une estimation (voir
  // CONFIDENCE_DOTS plus haut) — le texte est traduit ici (accès à t()),
  // les couleurs restent dans la constante hors composant.
  const CONFIDENCE_LABEL_KEYS = {
    haute: "confidence_haute",
    moyenne: "confidence_moyenne",
    basse: "confidence_basse",
    indicative: "confidence_indicative",
  };
  function confidenceInfo(key) {
    const labelKey = CONFIDENCE_LABEL_KEYS[key];
    return { label: labelKey ? t(labelKey) : key, dot: CONFIDENCE_DOTS[key] || "muted" };
  }
  // Message "félicitations, tu viens de débloquer un avatar" au moment où
  // l'abonnement est validé (demandé par Dylan) : on ignore le tout premier
  // calcul après le chargement du profil (pas un vrai déblocage, juste la
  // synchronisation initiale), et seule une VRAIE montée de palier
  // d'abonnement en cours de session déclenche le toast.
  const prevAvatarPlanRankRef = useRef(userPlanRank);
  const avatarPlanRankSyncedRef = useRef(false);
  const [avatarUnlockToast, setAvatarUnlockToast] = useState(null);
  useEffect(() => {
    if (!profile) return;
    if (!avatarPlanRankSyncedRef.current) {
      avatarPlanRankSyncedRef.current = true;
      prevAvatarPlanRankRef.current = userPlanRank;
      return;
    }
    if (userPlanRank > prevAvatarPlanRankRef.current) {
      const newlyUnlocked = CHARACTERS_META.filter(
        (m) => m.planRank && m.planRank > prevAvatarPlanRankRef.current && m.planRank <= userPlanRank
      );
      prevAvatarPlanRankRef.current = userPlanRank;
      if (newlyUnlocked.length > 0) {
        setAvatarUnlockToast({ names: newlyUnlocked.map((m) => m.name) });
        setTimeout(() => setAvatarUnlockToast(null), 5000);
      }
    } else {
      prevAvatarPlanRankRef.current = userPlanRank;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPlanRank, profile]);
  // Repli sur NO_AVATAR_ID (pas DEFAULT_CHARACTER_ID) : un profil sans
  // avatar_character doit s'afficher comme "Aucun avatar" sélectionné dans
  // le panneau, pas comme si Le Chineur avait été choisi.
  const [avatarCharacterInput, setAvatarCharacterInput] = useState(NO_AVATAR_ID);
  // "fond" = mascotte plein cadre sur l'écran photo (option secondaire,
  // choisie explicitement). "icone" = avatar utilisé seulement comme icône
  // (haut à droite / classement), l'écran photo garde son interface de
  // base — c'est le choix par défaut : sélectionner un avatar ne doit
  // d'abord changer que l'icône, la mascotte en fond restant un second
  // geste volontaire (demandé par Dylan, septembre 2026).
  const [avatarDisplayModeInput, setAvatarDisplayModeInput] = useState("icone");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarSavedFlash, setAvatarSavedFlash] = useState(false);
  useEffect(() => {
    if (showAvatarPanel) {
      setAvatarCharacterInput((profile && profile.avatar_character) || NO_AVATAR_ID);
      setAvatarDisplayModeInput((profile && profile.avatar_display_mode) || "icone");
      setAvatarError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAvatarPanel, profile]);
  // isOwnerPreview (défini plus haut, pour l'habillage/les fonds) permet
  // aussi à ce compte d'essayer — sans réellement les débloquer pour de
  // vrai — tous les personnages de l'avatar, à titre exceptionnel,
  // exactement comme pour l'habillage et les fonds. "Aucun avatar" est
  // toujours sélectionnable, par tout le monde.
  function pickCharacter(id) {
    if (id !== NO_AVATAR_ID && !isCharacterUnlocked(id) && !isOwnerPreview) return;
    setAvatarCharacterInput(id);
  }
  const avatarDirty =
    !!profile &&
    (avatarCharacterInput !== ((profile.avatar_character || NO_AVATAR_ID)) ||
      avatarDisplayModeInput !== (profile.avatar_display_mode || "icone"));
  async function saveAvatar() {
    if (!user || avatarSaving) return;
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      const { data, error } = await supabase.rpc("set_avatar", {
        // "aucun" est le mot-clé reconnu côté serveur pour effacer
        // avatar_character (voir set_avatar dans supabase_schema.sql) —
        // NO_AVATAR_ID a la même valeur ici, mais on le passe explicitement
        // pour ne pas dépendre de cette coïncidence si l'un des deux change.
        p_character_id: avatarCharacterInput === NO_AVATAR_ID ? "aucun" : avatarCharacterInput,
        p_display_mode: avatarDisplayModeInput,
      });
      if (error) throw new Error(error.message);
      if (data && data.ok) {
        setProfile((prev) =>
          prev ? { ...prev, avatar_character: data.avatar_character, avatar_display_mode: data.avatar_display_mode } : prev
        );
        setAvatarSavedFlash(true);
        setTimeout(() => setAvatarSavedFlash(false), 2500);
        // L'avatar peut avoir changé l'affichage du classement — on vide le
        // cache pour forcer un rechargement à la prochaine vue.
        setLeaderboardCache({});
      } else {
        setAvatarError(t("err_retry"));
      }
    } catch (e) {
      console.error(e);
      setAvatarError(t("err_retry"));
    } finally {
      setAvatarSaving(false);
    }
  }

  // Avatar de l'utilisateur, ou icône neutre si "aucun avatar" a été choisi
  // (avatar_character === "") — même logique que l'icône en haut à droite
  // du header, réutilisée ici pour ne pas faire retomber sur "chineur" par
  // défaut dès qu'un avatar_character est vide (bug remonté par Dylan).
  function renderAvatarOrPlaceholder(characterId, size) {
    if (characterId) {
      return <CharacterAvatar id={characterId} size={size} />;
    }
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: pt.rowBg,
        }}
      >
        <User size={Math.max(10, Math.round(size * 0.5))} color={pt.subText} />
      </span>
    );
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
            {/* Carte d'identité : avatar + pseudo (ou email à défaut) + plan
                en pastille — remplace l'ancien "Connecté : email" / "Plan :
                Starter" affichés comme du texte brut l'un sous l'autre. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: `radial-gradient(circle at 20% 30%, rgba(${accentRgb}, 0.18) 0%, transparent 75%)`,
                borderRadius: 14,
                padding: "12px 12px",
              }}
            >
              {renderAvatarOrPlaceholder(profile && profile.avatar_character, 52)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: pt.strongColor,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(profile && profile.pseudo) || user.email}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: pt.subText,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {profile && profile.pseudo ? user.email : t("account_synced_history")}
                </div>
              </div>
              {profile && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#152238",
                    background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
                    borderRadius: 20,
                    padding: "4px 10px",
                    flexShrink: 0,
                  }}
                >
                  {profile.plan !== "gratuit" && profile.subscription_status === "active"
                    ? PLANS.find((p) => p.key === profile.plan)?.label || profile.plan
                    : t("account_plan_free")}
                </span>
              )}
            </div>

            {/* "Avatars" — placé juste sous la carte d'identité, avant le
                compteur d'estimations restantes (demandé par Dylan). */}
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
                background: "none",
                border: "none",
                borderBottom: pt.dashedBorder,
                marginTop: 10,
                padding: "10px 2px",
                cursor: "pointer",
              }}
            >
              <Smile size={16} color={accent} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: pt.rowText }}>{t("account_avatars_row")}</span>
              <ChevronRight size={14} color={pt.chevronColor} />
            </button>

            {profile && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, padding: "0 2px" }}>
                <span className="mono" style={{ fontSize: 11, color: pt.subText }}>
                  {profile.plan !== "gratuit" && profile.subscription_status === "active"
                    ? `${Math.max(0, profile.quota_mensuel - profile.estimations_utilisees)}/${profile.quota_mensuel}${t("account_quota_paid_suffix")}`
                    : `${Math.max(0, 3 - profile.gratuit_utilisees)}${t("account_quota_free_suffix")}`}
                </span>
                {profile.stripe_customer_id ? (
                  <button
                    className="btn-ghost"
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    style={{ flexShrink: 0 }}
                  >
                    <CreditCard size={14} /> {portalLoading ? "…" : t("account_manage_button")}
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
                    <Sparkles size={14} /> {t("account_subscribe_button")}
                  </button>
                )}
              </div>
            )}

            {profile && profile.credits_achetes > 0 && (
              <div style={{ padding: "0 2px", marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 11, color: pt.strongColor, fontWeight: 700 }}>
                  +{profile.credits_achetes} {t("credits_balance_label")}
                </span>
              </div>
            )}

            {/* Liste d'actions : un seul style de ligne (icône + titre +
                chevron ou contrôle), pour un panneau plus lisible d'un
                coup d'œil qu'une succession de blocs bordés hétérogènes. */}
            <div style={{ borderTop: pt.dashedBorder, marginTop: 12, paddingTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", borderBottom: pt.dashedBorder }}>
                <Gift size={16} color={accent} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: pt.rowText }}>{t("account_refer_friend")}</span>
                <button className="btn-ghost" onClick={shareReferralLink} style={{ flexShrink: 0 }} aria-label={t("aria_share_link")}>
                  <Share2 size={14} />
                </button>
                <button className="btn-ghost" onClick={copyReferralLink} style={{ flexShrink: 0 }} aria-label={t("aria_copy_link")}>
                  {referralCopied ? t("account_link_copied") : <Copy size={14} />}
                </button>
              </div>

              <div style={{ padding: "10px 2px", borderBottom: pt.dashedBorder }}>
                {passwordStatus === "done" || (profile && profile.has_password) ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Lock size={16} color={accent} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: pt.rowText }}>{t("account_password_set")}</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Lock size={16} color={accent} style={{ flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 11, color: pt.subText }}>
                        {t("account_password_set_note")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div className="password-field">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t("account_new_password_placeholder")}
                          style={{
                            width: "100%",
                            fontFamily: "'Inter', sans-serif",
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
                          aria-label={showNewPassword ? t("aria_hide_password") : t("aria_show_password")}
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
                        {t("account_set_password_button")}
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

              <button
                onClick={() => {
                  signOut();
                  setShowProfilePanel(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "10px 2px 2px",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} color={pt.subText} style={{ flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 12, color: pt.subText }}>{t("account_sign_out")}</span>
              </button>
            </div>
          </div>
        ) : authStatus === "sent" ? (
          <p style={{ fontSize: 12, color: pt.rowText, margin: 0 }}>
            {t("account_magic_link_sent_prefix")}{authEmail}{t("account_magic_link_sent_suffix")}
          </p>
        ) : authStatus === "signup_sent" ? (
          <p style={{ fontSize: 12, color: pt.rowText, margin: 0 }}>
            {t("account_signup_sent_prefix")}{authEmail}{t("account_signup_sent_suffix")}
          </p>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: pt.rowText, marginTop: 0, marginBottom: 8 }}>
              {t("account_login_intro")}
            </p>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={t("account_email_placeholder")}
              style={{
                width: "100%",
                fontFamily: "'Inter', sans-serif",
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
                placeholder={t("account_password_placeholder")}
                style={{
                  width: "100%",
                  fontFamily: "'Inter', sans-serif",
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
                aria-label={showAuthPassword ? t("aria_hide_password") : t("aria_show_password")}
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
                {t("account_signin_button")}
              </button>
              <button
                className="btn-ghost"
                onClick={signUpWithPassword}
                disabled={authStatus === "sending"}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {t("account_signup_button")}
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
              {t("account_or_divider")}
              <div style={{ flex: 1, height: 1, background: pt.rowBorder.replace("1px solid ", "") }} />
            </div>
            <button
              className="btn-ghost"
              onClick={sendMagicLink}
              disabled={authStatus === "sending" || !authEmail.trim()}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Mail size={14} /> {t("account_magic_link_button")}
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
    setListingsOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
    setExtraAngles(null);
    setExtraAnglesLoading(false);
    setExtraAnglesError(null);
    setExtraAnglesAttempted(false);
    setStatus("idle");
    setListingSeed(null); // on repart d'une vraie photo, plus d'une annonce

    const isHeic =
      /\.hei[cf]$/i.test(file.name || "") || /heic|heif/i.test(file.type || "");
    if (isHeic) {
      setError(t("err_heic_format"));
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
      setError(t("err_file_read"));
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
      throw new Error(t("err_api_network_prefix") + e.message);
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
      throw new Error(t("err_api_prefix") + data.error.message);
    }
    if (data?.stop_reason === "max_tokens") {
      throw new Error(t("err_api_truncated"));
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
      t("err_api_unreadable_prefix") + res.status + t("err_api_unreadable_middle") +
        rawText.slice(0, 400)
    );
  }

  function extractJson(text) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error(t("err_json_not_found_prefix") + text.slice(0, 300));
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      throw new Error(t("err_json_invalid_prefix") + text.slice(0, 300));
    }
  }

  // Le prompt d'estimation demande déjà à l'IA un prix "brocante" prudent,
  // déjà réduit pour tenir compte du marchandage typique — mais en
  // pratique elle reste souvent trop optimiste (retour utilisateur). On ne
  // se repose donc plus uniquement sur son texte libre : on en extrait le
  // ou les nombres, on leur applique une décote supplémentaire fixe de
  // 20%, et on reconstruit un texte simple. Garantit le comportement
  // demandé à chaque estimation, plutôt que d'espérer que l'IA l'applique
  // correctement elle-même.
  // Une estimation lancée depuis "Rechercher un produit" / "Produits du
  // moment" avec la catégorie "Immobilier" ou "Véhicules" passe par le même
  // pipeline générique que n'importe quel objet (voir identification.type_
  // sujet forcé à "objet" pour ce cas dans runEstimationCore) — mais un prix
  // "brocante" n'a aucun sens pour une maison ou une voiture. On se base sur
  // le libellé de catégorie CHOISI dans le menu (fixe, dans PRODUCT_
  // CATEGORIES), jamais sur une catégorie en texte libre générée par l'IA,
  // pour ne jamais exclure à tort un vrai petit objet vendable (ex: un
  // casque de moto) à cause d'un simple mot dans sa description.
  function isBrocanteExcludedCategory(categoryLabel) {
    if (!categoryLabel) return false;
    const c = categoryLabel.toLowerCase();
    return c.includes("immobilier") || c.includes("véhicule") || c.includes("vehicule");
  }

  function applyBrocanteDiscount(rawText, prixBasFallback) {
    const numbers =
      typeof rawText === "string"
        ? (rawText.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(",", ".")))
        : [];
    let low, high;
    if (numbers.length >= 2) {
      low = Math.min(...numbers);
      high = Math.max(...numbers);
    } else if (numbers.length === 1) {
      low = numbers[0] * 0.85;
      high = numbers[0] * 1.05;
    } else {
      // Repli: aucun nombre exploitable dans le texte de l'IA (rare), on
      // part directement de prix_bas — déjà le bas de la fourchette
      // "normale" — pour rester cohérent.
      low = (prixBasFallback || 0) * 0.55;
      high = (prixBasFallback || 0) * 0.7;
    }
    low = Math.max(1, Math.round(low * 0.8));
    high = Math.max(low + 1, Math.round(high * 0.8));
    return low === high ? `environ ${low} €` : `environ ${low}–${high} €`;
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
      throw new Error(t("err_relay_unreachable_prefix") + e.message);
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(t("err_relay_unreadable_prefix") + res.status + t("err_relay_unreadable_suffix"));
    }
    if (data.error) {
      throw new Error(t("err_relay_error_prefix") + data.error);
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
      setError(t("err_login_required_estimate"));
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
      setError(t("err_login_required_estimate"));
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
    setListingsOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
    setExtraAngles(null);
    setExtraAnglesLoading(false);
    setExtraAnglesError(null);
    setExtraAnglesAttempted(false);

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
    setListingsOpen(false);
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
              'Réponds UNIQUEMENT en JSON: {"titre": "...", "description": "..."}' +
              aiLangInstruction(),
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
      setAdError(t("err_ad_generation_failed"));
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
        setAdError(t("err_ad_copy_failed"));
      });
  }

  // Génère jusqu'à 2 photos supplémentaires du même objet sous d'autres
  // angles (IA), pour compléter une annonce avec plusieurs vraies photos au
  // lieu d'une seule. Réservé aux abonnés payants : ça a un coût réel par
  // génération, revérifié aussi côté serveur (le Worker ignore toute requête
  // directe d'un compte non payant, même en contournant l'appli). On ne
  // relance pas automatiquement après un premier succès (extraAnglesAttempted)
  // pour éviter un abus de clics — un échec permet en revanche de réessayer.
  async function generateExtraAngles() {
    if (!image || !image.base64 || !user) return;
    if (!isPremiumPlan) {
      setPaywallInfo(null);
      setShowPaywall(true);
      return;
    }
    setExtraAnglesAttempted(true);
    setExtraAnglesLoading(true);
    setExtraAnglesError(null);
    try {
      const res = await fetch(PROXY_URL + "/generate-angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          image_base64: image.base64,
          mime_type: image.mediaType || "image/jpeg",
          object_label: result ? result.objet : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("err_extra_angles_generation"));
      if (!data.images || data.images.length === 0) {
        throw new Error(data.error || t("err_extra_angles_none"));
      }
      setExtraAngles(data.images);
    } catch (e) {
      setExtraAnglesAttempted(false); // on relibère le bouton "réessayer"
      setExtraAnglesError(e.message || t("err_extra_angles_failed"));
    } finally {
      setExtraAnglesLoading(false);
    }
  }

  // Enregistrement d'une photo générée. On tente d'abord le partage natif
  // (Web Share API avec fichier) : sur mobile, ça ouvre la feuille de
  // partage du système avec l'option "Enregistrer l'image", qui range la
  // photo directement dans la pellicule/Photos — contrairement à un simple
  // lien <a download>, qui atterrit dans le dossier Téléchargements. On
  // garde ce lien <a download> comme repli pour desktop ou navigateurs qui
  // ne supportent pas le partage de fichiers.
  async function downloadExtraAngle(img, index) {
    const safeLabel = (result?.objet || "objet").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    const filename = `estim-${safeLabel || "objet"}-angle-${index + 1}.jpg`;

    try {
      const byteChars = atob(img.data);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: img.mime_type });
      const file = new File([blob], filename, { type: img.mime_type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return; // partage annulé par l'utilisateur
    }

    try {
      const link = document.createElement("a");
      link.href = `data:${img.mime_type};base64,${img.data}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {}
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
      ctx.font = "700 32px 'Inter', sans-serif";
      ctx.fillText((result.categorie || "").toUpperCase(), W / 2, 945);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 46px Fraunces, Georgia, serif";
      canvasWrapText(ctx, result.objet || "", W / 2, 1005, 900, 54, 2);

      ctx.fillStyle = accent;
      ctx.font = "800 90px 'Inter', sans-serif";
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
    setExtraAngles(null);
    setExtraAnglesLoading(false);
    setExtraAnglesError(null);
    setExtraAnglesAttempted(false);
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
          etat: t("seed_etat_unverifiable"),
          etat_note: t("seed_etat_note"),
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
                    : "") +
                  aiLangInstruction() +
                  ' IMPORTANT: le champ "recherche" doit toujours rester en français quelle que soit la langue demandée ci-dessus, car ces mots-clés servent à chercher directement sur des sites français (Leboncoin, Vinted, eBay.fr) — seul "objet" (et les autres champs en langage naturel) doit suivre la langue demandée.',
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
                'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "la blague/remarque, 1 à 2 phrases", "rappel": "le rappel légal/éthique tourné avec humour, 1 phrase"}' +
                aiLangInstruction(),
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
          source: t("src_humor_mode"),
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
                "Exclus aussi toute annonce d'un produit clairement d'une autre gamme ou d'un autre positionnement que l'objet identifié " +
                "(par exemple : l'objet identifié est un modèle basique/premier prix/générique sans marque reconnue, mais l'annonce concerne un modèle premium ou d'une marque reconnue nettement plus chère — ou inversement). " +
                "Même s'il s'agit globalement du même type de produit, un écart de gamme ou de marque trop important fausse l'estimation et doit être exclu. " +
                'Réponds UNIQUEMENT en JSON: {"indices_pertinents": [0, 2]} (liste vide si rien ne correspond vraiment).',
            },
          ], "claude-haiku-4-5-20251001", 0.1);
          // temperature basse (0.1): ce filtre décide QUELLES annonces entrent
          // dans le calcul du prix — une sélection qui varie d'un essai à
          // l'autre sur les mêmes annonces trouvées rendrait l'estimation
          // finale incohérente pour un même objet (signalé par Dylan).
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
            throw new Error(t("err_listings_no_match"));
          }

          // Les ventes eBay confirmées sont un signal beaucoup plus fiable
          // qu'une simple annonce active (prix réellement payé, pas juste
          // demandé) — on les distingue pour le prompt IA juste en dessous.
          const soldResults = usedResults.filter((r) => r.source === "ebaySold");
          const askingResults = usedResults.filter((r) => r.source !== "ebaySold");
          const soldPrices = soldResults.map((r) => r.extracted_price).sort((a, b) => a - b);
          const askingPrices = askingResults.map((r) => r.extracted_price).sort((a, b) => a - b);
          const usedSource =
            t("src_used_prefix") +
            usedPrices.length +
            t("src_used_middle") +
            (soldPrices.length > 0 ? `${t("src_used_sold_prefix")}${soldPrices.length}${t("src_used_sold_suffix")}` : "");

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
                'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre, "prix_haut": nombre, "prix_brocante": "...", "conseil": "...", "alerte": "...", "facilite_vente": nombre_0_a_10, "rarete": nombre_0_a_10, "tendance_marche": [nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, 100]}' +
                aiLangInstruction(),
            },
          ], "claude-haiku-4-5-20251001", 0.2);
          // temperature basse (0.2): c'est cet appel qui fixe prix_bas/prix_haut
          // à partir des mêmes annonces réelles — au défaut (température ~1),
          // un même objet pouvait ressortir avec des prix assez différents
          // d'une estimation à l'autre, y compris depuis un autre appareil
          // (signalé par Dylan). Voir aussi la température basse déjà en
          // place sur l'étape d'identification, pour la même raison.
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
            prix_brocante: isBrocanteExcludedCategory(effectiveListingSeed && effectiveListingSeed.category)
              ? null
              : applyBrocanteDiscount(extra.prix_brocante, prix_bas),
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
          throw new Error(t("err_listings_not_enough"));
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
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre, "prix_haut": nombre, "prix_brocante": "...", "conseil": "...", "facilite_vente": nombre_0_a_10, "rarete": nombre_0_a_10, "tendance_marche": [nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, nombre, 100]}' +
              aiLangInstruction(),
          },
        ], "claude-haiku-4-5-20251001", 0.2);
        // temperature basse (0.2), même raison que ci-dessus: un même objet
        // sans annonces trouvées doit renvoyer un prix stable d'une fois sur
        // l'autre plutôt que de varier à chaque appel.
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
          prix_brocante: isBrocanteExcludedCategory(effectiveListingSeed && effectiveListingSeed.category)
            ? null
            : applyBrocanteDiscount(fallback.prix_brocante, fbBas),
          facilite_vente: typeof fallback.facilite_vente === "number" ? fallback.facilite_vente : null,
          rarete: typeof fallback.rarete === "number" ? fallback.rarete : null,
          tendance_marche: Array.isArray(fallback.tendance_marche)
            ? fallback.tendance_marche.filter((n) => typeof n === "number" && !isNaN(n))
            : null,
          confiance: "basse",
          source: t("src_ai_no_listings_prefix") + marketError.message + t("src_ai_no_listings_suffix"),
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
      setError(e.message || t("err_estimation_failed"));
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
    setListingsOpen(false);
    setCorrectionInput("");
    setAdText(null);
    setAdLoading(false);
    setAdError(null);
    setAdCopied(false);
    setAdGenCount(0);
    setExtraAngles(null);
    setExtraAnglesLoading(false);
    setExtraAnglesError(null);
    setExtraAnglesAttempted(false);
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
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "1 à 2 phrases sur la cote de ce véhicule", "hypothese": "..."}' +
              aiLangInstruction(),
          },
        ],
        "claude-haiku-4-5-20251001",
        0.2
        // temperature basse: même véhicule (mêmes caractéristiques) → même
        // fourchette de prix d'une estimation à l'autre.
      );
      const data = extractJson(text);
      const finalResult = {
        ...pendingIdentification,
        prix_bas: data.prix_bas,
        prix_haut: data.prix_haut,
        commentaire: data.commentaire,
        hypothese: data.hypothese || null,
        confiance: "indicative",
        source: t("src_ai_vehicle"),
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
      setError(e.message || t("err_vehicle_estimation_failed"));
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
              'Réponds UNIQUEMENT en JSON: {"prix_bas": nombre_euros, "prix_haut": nombre_euros, "commentaire": "1 à 2 phrases sur l\'estimation", "hypothese": "..."}' +
              aiLangInstruction(),
          },
        ],
        "claude-haiku-4-5-20251001",
        0.2
        // temperature basse: même bien (mêmes caractéristiques) → même
        // fourchette de prix d'une estimation à l'autre.
      );
      const data = extractJson(text);
      const finalResult = {
        ...pendingIdentification,
        prix_bas: data.prix_bas,
        prix_haut: data.prix_haut,
        commentaire: data.commentaire,
        hypothese: data.hypothese || null,
        confiance: "indicative",
        source: t("src_ai_realestate"),
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
      setError(e.message || t("err_realestate_estimation_failed"));
      setStatus("error");
    }
  }

  // Bloc réutilisé à deux endroits (panneau "Abonnement" + paywall quota
  // atteint) : stepper +/- pour choisir la quantité, prix live (0,30 €
  // pièce, sans remise) et rappel du bonus "10 offertes tous les 100".
  function renderCreditPurchaseBlock() {
    const bonus = Math.floor(creditQuantity / 100) * CREDIT_BONUS_PER_HUNDRED;
    const total = creditQuantity + bonus;
    const priceLabel = (creditQuantity * CREDIT_UNIT_PRICE).toFixed(2).replace(".", ",") + " €";
    return (
      <div style={{ borderTop: pt.dashedBorder, paddingTop: 14, marginTop: 14 }}>
        <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 2 }}>
          {t("credits_section_title")}
        </p>
        <p className="mono" style={{ fontSize: 10.5, color: pt.subText, marginTop: 0, marginBottom: 10, opacity: 0.85 }}>
          {t("credits_section_subtitle")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() =>
              setCreditQuantity((q) => {
                const next = Math.max(1, q - 1);
                setCreditQuantityText(String(next));
                return next;
              })
            }
            className="btn-ghost"
            style={{ padding: "6px 10px", borderColor: pt.ghostBorder, color: pt.ghostColor, background: pt.ghostBg }}
            aria-label={t("aria_minus")}
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min={1}
            value={creditQuantityText}
            onChange={(e) => {
              const raw = e.target.value;
              setCreditQuantityText(raw);
              // On ne met à jour la quantité validée (prix/bonus, achat) que
              // si ce qui est tapé est déjà un entier valide — le champ peut
              // rester vide ou partiel pendant la saisie sans jamais se
              // faire réinitialiser à "1" sous les doigts de l'utilisateur.
              const v = parseInt(raw, 10);
              if (Number.isInteger(v) && v >= 1 && String(v) === raw.trim()) {
                setCreditQuantity(v);
              }
            }}
            onBlur={() => {
              // En sortant du champ, si ce qui reste tapé n'est pas un
              // nombre valide (vide, 0, négatif...), on retombe sur la
              // dernière quantité valide connue plutôt que de laisser le
              // champ dans un état incohérent.
              setCreditQuantityText(String(creditQuantity));
            }}
            className="mono"
            style={{
              width: 76,
              textAlign: "center",
              fontSize: 15,
              fontWeight: 800,
              color: pt.strongColor,
              background: pt.rowBg,
              border: pt.rowBorder,
              borderRadius: 8,
              padding: "6px 4px",
            }}
          />
          <button
            type="button"
            onClick={() =>
              setCreditQuantity((q) => {
                const next = q + 1;
                setCreditQuantityText(String(next));
                return next;
              })
            }
            className="btn-ghost"
            style={{ padding: "6px 10px", borderColor: pt.ghostBorder, color: pt.ghostColor, background: pt.ghostBg }}
            aria-label={t("aria_plus")}
          >
            <Plus size={14} />
          </button>
          <span className="mono" style={{ fontSize: 12, color: pt.subText }}>
            {creditQuantity > 1 ? t("credits_unit_plural") : t("credits_unit_singular")}
          </span>
        </div>
        {bonus > 0 && (
          <p className="mono" style={{ fontSize: 11, color: accent, marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
            + {bonus} {t("credits_bonus_suffix")} → {total} {t("credits_total_suffix")}
          </p>
        )}
        {creditError && (
          <p className="mono" style={{ fontSize: 11, color: accent, marginTop: 0, marginBottom: 8 }}>
            {creditError}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={() => (user ? startCreditCheckout() : null)}
          disabled={!user || creditCheckoutLoading}
          style={{ justifyContent: "space-between", width: "100%", opacity: user ? 1 : 0.6 }}
        >
          <span>{t("credits_buy_button")}</span>
          <span>
            {creditCheckoutLoading ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              priceLabel
            )}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        // Les calques décoratifs de l'affichage actif sont posés SOUS la
        // couleur de fond (pt.pageBg, réutilisée ailleurs comme couleur
        // unie — ex: contour SVG des graphiques — donc jamais modifiée
        // elle-même) : purement décoratif, n'affecte ni la disposition ni
        // aucune taille. `decor` (motifs en rapport avec le thème, ancrés
        // en haut) passe AU-DESSUS de `texture` (grain/vignette/trame/
        // scanlines, sur toute la page).
        background: [activeAffichage.decor, activeAffichage.texture, pt.pageBg].filter(Boolean).join(", "),
        // La police de corps par défaut (héritée par tout texte sans
        // classe .brand/.mono, ex: le sous-titre de l'accroche) suit
        // désormais l'affichage sélectionné.
        fontFamily: `${activeAffichage.fontBody}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        color: pt.strongColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px 60px",
      }}
    >
      {/* Étoiles scintillantes de Futuriste : posées ici, au niveau du FOND
          de la page (comme `decor`/`texture` juste au-dessus, pas dans le
          <header>/"cadran") — Dylan avait raison de corriger : la première
          version les avait mises dans le header par erreur. Ancrées en
          pixels depuis le haut (même convention que les autres calques
          `decor`, voir plus haut) pour rester groupées près du
          header/de l'accroche quelle que soit la longueur de la page,
          `left` en % de la pleine largeur. Vraies étoiles DOM (et non un
          calque CSS statique) pour qu'elles clignotent réellement via
          @keyframes sparkle-pulse ; tailles variées (5 à 13px), délais/
          durées différents pour un effet naturel. */}
      {activeAffichage.key === "futuriste" &&
        [
          { top: 18, left: "78%", size: 13, delay: "0s", duration: "2.6s" },
          { top: 174, left: "92%", size: 8, delay: "0.5s", duration: "3.1s" },
          { top: 101, left: "6%", size: 9, delay: "1s", duration: "2.4s" },
          { top: 56, left: "95%", size: 6, delay: "1.4s", duration: "2.9s" },
          { top: 213, left: "14%", size: 7, delay: "0.8s", duration: "2.2s" },
          { top: 140, left: "88%", size: 11, delay: "1.8s", duration: "3.4s" },
          { top: 8, left: "50%", size: 5, delay: "0.3s", duration: "2.7s" },
          { top: 230, left: "60%", size: 6, delay: "1.6s", duration: "2.5s" },
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
              animationDuration: s.duration,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            ✦
          </span>
        ))}

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

      {avatarUnlockToast && (
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
            background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
            color: "#152238",
            borderRadius: 30,
            padding: "10px 16px",
            boxShadow: "0 8px 24px rgba(4, 6, 12, 0.4)",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: 18 }}>🎉</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
            {t("avatar_unlock_toast_prefix")}
            {avatarUnlockToast.names.length > 1 ? t("avatar_unlock_toast_plural") : t("avatar_unlock_toast_singular")}
            {t("avatar_unlock_toast_colon")}
            {avatarUnlockToast.names.join(", ")}
            {t("avatar_unlock_toast_suffix")}
          </span>
        </div>
      )}

      <style>{`
        /* Toutes les polices des 5 affichages sont chargées d'un coup (une
           seule requête) pour permettre un changement d'affichage instantané,
           sans "flash" le temps qu'une police se télécharge. */
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800;900&family=Courier+Prime:wght@400;700&family=Bungee&family=Space+Mono:wght@400;700&family=Orbitron:wght@400..900&family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&family=Chakra+Petch:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        /* Les deux polices dépendent de l'affichage sélectionné (voir
           AFFICHAGES/activeAffichage plus haut) — c'est ce qui fait changer
           l'écriture de TOUTE l'appli sans toucher aux tailles/dispositions,
           qui restent fixées dans chaque style inline. */
        .brand {
          font-family: ${activeAffichage.fontDisplay};
          letter-spacing: ${activeAffichage.displayLetterSpacing || "normal"};
          text-transform: ${activeAffichage.displayTransform || "none"};
        }
        .mono {
          font-family: ${activeAffichage.fontBody};
          letter-spacing: ${activeAffichage.bodyLetterSpacing || "normal"};
          text-transform: ${activeAffichage.bodyTransform || "none"};
        }
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
          border-radius: ${Math.round(14 * (activeAffichage.radiusScale ?? 1))}px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          box-shadow: 0 6px 16px rgba(${accentRgb}, ${0.32 + accentGlow * 0.3});
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-primary:active { transform: scale(0.98); box-shadow: 0 3px 10px rgba(${accentRgb}, 0.28); }
        .btn-primary:disabled { opacity: 0.55; box-shadow: none; }
        .btn-cta-pill { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .btn-cta-pill:active { transform: scale(0.94); box-shadow: 0 3px 10px rgba(${accentRgb}, 0.28); }
        .btn-ghost {
          background: transparent;
          color: ${pt.ghostColor};
          border: 1px solid ${pt.ghostBorder};
          padding: 10px 16px;
          border-radius: ${Math.round(12 * (activeAffichage.radiusScale ?? 1))}px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-mic {
          background: transparent;
          color: ${pt.ghostColor};
          border: 1px solid ${pt.ghostBorder};
          border-radius: ${Math.round(12 * (activeAffichage.radiusScale ?? 1))}px;
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
          border-radius: ${Math.round(18 * (activeAffichage.radiusScale ?? 1))}px;
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
          border-radius: ${Math.round(12 * (activeAffichage.radiusScale ?? 1))}px;
          pointer-events: none;
        }
        .drop-zone:active { transform: scale(0.99); }
        .drop-zone-mascot-immersive {
          position: absolute;
          width: auto;
          max-width: none;
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
        }
        .tag-card {
          background: ${pt.formCardBg};
          border: 1px solid ${pt.rowBorder.replace("1px solid ", "")};
          border-top: 3px solid ${accent};
          border-radius: ${Math.round(16 * (activeAffichage.radiusScale ?? 1))}px;
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
          border-color: rgba(${accentRgb}, ${0.4 + accentGlow * 0.4});
          box-shadow: 0 14px 32px rgba(4, 6, 12, 0.35)${accentGlow ? `, 0 0 26px rgba(${accentRgb}, ${accentGlow * 0.55})` : ""};
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
          box-shadow: ${accentGlow ? `0 0 14px rgba(${accentRgb}, ${accentGlow})` : "none"};
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
            boxShadow: accentGlow
              ? `0 0 0 1px rgba(${accentRgb}, ${accentGlow * 0.6}), 0 18px 40px rgba(${accentRgb}, ${accentGlow * 0.5})`
              : "none",
          }}
        >
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
            {/* Trou de l'étiquette : un VRAI trou géométrique (le cercle est
                une seconde sous-tracée du même path, avec fillRule
                "evenodd") plutôt qu'une forme dessinée par-dessus — on voit
                donc vraiment le fond de l'appli à travers, comme pour le
                "e" du logo, quel que soit l'affichage. */}
            <path
              d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M9.1,7.5 A1.6,1.6 0 1,1 5.9,7.5 A1.6,1.6 0 1,1 9.1,7.5 Z"
              fill={accent}
              fillRule="evenodd"
            />
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
              src={lightSurface ? logoWordmarkDark : logoWordmarkLight}
              alt="estim'"
              style={{ height: 26, width: "auto", display: "block" }}
            />
            {activeAffichage.key !== "classique" && activeAffichage.key !== "blanc" && (
              <span
                title={`Affichage ${activeAffichage.label}`}
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
                {activeAffichage.emoji}
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
              {t("beta_badge")}
            </span>
            {/* Profil : connexion / déconnexion / avatar — icône unique en
                haut à droite du header (plus dans le menu hamburger).
                Personnage miniature si un avatar a déjà été personnalisé,
                icône neutre sinon (ou si pas connecté). */}
            <button
              onClick={() => setShowProfilePanel(true)}
              aria-label={t("aria_my_profile")}
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
              {user && profile && profile.avatar_character ? (
                <CharacterAvatar id={profile.avatar_character} size={30} />
              ) : (
                <User size={16} color={pt.menuBtnColor} />
              )}
            </button>
          </div>
          <h1
            className="brand"
            style={{ fontSize: pt.heroTitleSize, fontWeight: pt.heroTitleWeight, margin: 0, lineHeight: 1.12, color: pt.heroEmphasisColor, position: "relative" }}
          >
            {t("hero_title_1")}
            <br />
            <span style={{ color: accent }}>{t("hero_title_2")}</span>
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: pt.heroSubtitleSize,
              color: pt.subText,
              lineHeight: 1.5,
              position: "relative",
              // Le sous-titre est bien composé de deux idées distinctes (les
              // objets concernés, puis comment Estim' fait) : whiteSpace
              // "pre-line" restitue le retour à la ligne présent dans le
              // texte traduit (demandé par Dylan) sans avoir besoin de deux
              // <p> séparés ni de <br/> côté JSX.
              whiteSpace: "pre-line",
            }}
          >
            {t("hero_subtitle")}
          </p>
        </header>

        {!image && (
          <label className="drop-zone" htmlFor="photo-input">
            {dropZoneMascot ? (
              <>
                <img
                  src={dropZoneMascot.src}
                  alt=""
                  aria-hidden="true"
                  className="drop-zone-mascot-immersive"
                  style={{
                    height: `${dropZoneMascot.scale * 100}%`,
                    left: "50%",
                    top: "50%",
                    transform: `translate(-${dropZoneMascot.aimX * 100}%, -${dropZoneMascot.aimY * 100}%)`,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Doublure qui épouse exactement le contour de l'icône
                      appareil photo (même tracé, légèrement plus grand) pour
                      effacer uniquement cette forme précise de l'avatar en
                      dessous. `pt.dropZoneBg` est un dégradé CSS (pas une
                      couleur unie) donc inutilisable comme `fill` SVG — on
                      passe par un masque CSS (mask-image) qui applique le
                      vrai fond du cadre (exactement le même, dégradé compris,
                      quel que soit le thème choisi) découpé à la forme de
                      l'icône. */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: pt.dropZoneBg,
                      WebkitMaskImage:
                        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\'/%3E%3Ccircle cx=\'12\' cy=\'13\' r=\'3\'/%3E%3C/svg%3E")',
                      maskImage:
                        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\'/%3E%3Ccircle cx=\'12\' cy=\'13\' r=\'3\'/%3E%3C/svg%3E")',
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                    }}
                  />
                  <Camera size={30} strokeWidth={1.5} style={{ position: "relative", color: accent }} />
                </div>
              </>
            ) : (
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Camera size={30} strokeWidth={1.5} style={{ color: accent }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t("drop_zone_title")}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{t("drop_zone_sub")}</div>
                <span
                  className="btn-ghost"
                  style={{
                    marginTop: 6,
                    pointerEvents: "none",
                    borderColor: pt.ghostBorder,
                    color: pt.ghostColor,
                  }}
                >
                  <Upload size={14} /> {t("drop_zone_choose_file")}
                </span>
              </div>
            )}
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </label>
        )}

        {/* Compteur d'estimations restantes + CTA "Obtenir plus d'estim'" —
            déplacés sous la zone photo (demandé par Dylan, initialement
            juste sous l'accroche) et recomposés en colonne centrée plutôt
            qu'en ligne à gauche, plus soigné visuellement. Reste masqué une
            fois une photo choisie (résultat/chargement prennent le relais),
            comme avant. */}
        {!image && user && profile && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              onClick={() => setShowHistory(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
                position: "relative",
                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.16) 0%, rgba(${accentRgb}, 0.05) 100%)`,
                border: `1.5px solid rgba(${accentRgb}, 0.35)`,
                borderRadius: 999,
                padding: "5px 13px 5px 5px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
                  boxShadow: `0 2px 6px rgba(${accentRgb}, 0.45)`,
                }}
              >
                <Sparkles size={13} color="#FFFFFF" className="sparkle" />
              </span>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
                <span className="brand" style={{ fontSize: brandSize(17), fontWeight: 600, color: pt.heroEmphasisColor }}>
                  {profile.plan !== "gratuit" && profile.subscription_status === "active"
                    ? Math.max(0, profile.quota_mensuel - profile.estimations_utilisees)
                    : Math.max(0, 3 - profile.gratuit_utilisees)}
                </span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: pt.subText }}>
                  {profile.plan !== "gratuit" && profile.subscription_status === "active"
                    ? `/${profile.quota_mensuel} estim' restantes`
                    : "estim' gratuite(s) restante(s)"}
                </span>
              </span>
              {profile.credits_achetes > 0 && (
                <span
                  className="mono"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7A5300",
                    background: "linear-gradient(135deg, #FFE9A8 0%, #FFD056 60%, #F2B33D 100%)",
                    borderRadius: 999,
                    padding: "3px 9px",
                    boxShadow: "0 2px 6px rgba(178, 129, 22, 0.35)",
                  }}
                >
                  <Tag size={11} strokeWidth={2.5} style={{ transform: "rotate(-8deg)" }} />+{profile.credits_achetes}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setPaywallInfo(null);
                setShowSubscriptionPanel(true);
              }}
              className="mono btn-cta-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 55%, ${accentDark} 100%)`,
                border: "none",
                borderRadius: 999,
                padding: "9px 16px",
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: "#FFFFFF",
                boxShadow: `0 6px 16px rgba(${accentRgb}, 0.35)`,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>⚡</span> Obtenir plus d'estim'
            </button>
          </div>
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
              alt={t("alt_object_to_estimate")}
              style={{
                width: "100%",
                aspectRatio: "4/3",
                objectFit: "cover",
                borderRadius: 4,
                border: pt.formCardBorder,
              }}
            />
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
                        d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M9.2,7.5 A1.7,1.7 0 1,1 5.8,7.5 A1.7,1.7 0 1,1 9.2,7.5 Z"
                        fill={accent}
                        fillRule="evenodd"
                      />
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
                    {t("details_label")}
                  </label>
                  {isListening && (
                    <span className="mono" style={{ fontSize: 11, color: accent }}>
                      {t("listening_indicator")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={t("details_placeholder")}
                    rows={2}
                    style={{
                      flex: 1,
                      fontFamily: "'Inter', sans-serif",
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
                      aria-label={isListening ? t("aria_stop_dictation") : t("aria_start_dictation")}
                      title={isListening ? t("dictation_stop_title") : t("dictation_start_title")}
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
                      {t("btn_identifying")}
                    </>
                  )}
                  {status === "pricing" && (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      {t("btn_pricing")}
                    </>
                  )}
                  {(status === "idle" || status === "error") && (
                    <>
                      <Tag size={16} />
                      {t("btn_estimate_value")}
                    </>
                  )}
                </button>
                <button className="btn-ghost" onClick={reset} aria-label={t("aria_change_photo")}>
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {status === "vehicule_form" && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 10 }}>
                  {t("vehicle_form_title")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
                      {t("vehicle_year_label")}
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.annee}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, annee: e.target.value }))}
                      placeholder={t("vehicle_year_placeholder")}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
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
                      {t("vehicle_mileage_label")}
                    </label>
                    <input
                      type="number"
                      value={vehicleForm.kilometrage}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, kilometrage: e.target.value }))}
                      placeholder={t("vehicle_mileage_placeholder")}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
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
                      {t("vehicle_condition_label")}
                    </label>
                    <select
                      value={vehicleForm.etat}
                      onChange={(e) => setVehicleForm((v) => ({ ...v, etat: e.target.value }))}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: 3,
                        border: pt.inputBorder,
                        background: pt.inputBg,
                        color: pt.inputText,
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Les `value` restent en français (valeurs envoyées à
                          l'API d'estimation, pas du texte affiché) — seul le
                          libellé visible dans le <select> suit la langue. */}
                      <option value="excellent état">{t("vehicle_condition_excellent")}</option>
                      <option value="bon état">{t("vehicle_condition_good")}</option>
                      <option value="état moyen">{t("vehicle_condition_average")}</option>
                      <option value="à réviser / défauts visibles">{t("vehicle_condition_poor")}</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className="btn-primary" onClick={estimateVehicule}>
                    <Tag size={16} />
                    {t("btn_estimate")}
                  </button>
                  <button className="btn-ghost" onClick={reset} aria-label={t("aria_change_photo")}>
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            )}

            {status === "immobilier_form" && (
              <div className="tag-card">
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 10 }}>
                  {t("realestate_form_title")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="mono" style={{ fontSize: 12, color: pt.subText, display: "block", marginBottom: 4 }}>
                      {t("realestate_city_label")}
                    </label>
                    <input
                      type="text"
                      value={realEstateForm.ville}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, ville: e.target.value }))}
                      placeholder={t("realestate_city_placeholder")}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
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
                      {t("realestate_surface_label")}
                    </label>
                    <input
                      type="number"
                      value={realEstateForm.surface}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, surface: e.target.value }))}
                      placeholder={t("realestate_surface_placeholder")}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
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
                      {t("realestate_rooms_label")}
                    </label>
                    <input
                      type="number"
                      value={realEstateForm.pieces}
                      onChange={(e) => setRealEstateForm((v) => ({ ...v, pieces: e.target.value }))}
                      placeholder={t("realestate_rooms_placeholder")}
                      style={{
                        width: "100%",
                        fontFamily: "'Inter', sans-serif",
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
                    {t("btn_estimate")}
                  </button>
                  <button className="btn-ghost" onClick={reset} aria-label={t("aria_change_photo")}>
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
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M9.1,7.5 A1.6,1.6 0 1,1 5.9,7.5 A1.6,1.6 0 1,1 9.1,7.5 Z"
                    fill={accent}
                    fillRule="evenodd"
                  />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  {t("humor_mode_badge")}
                </div>
                <div className="brand" style={{ fontSize: brandSize(20), fontWeight: 600, marginBottom: 12, color: pt.strongColor, position: "relative" }}>
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
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M9.1,7.5 A1.6,1.6 0 1,1 5.9,7.5 A1.6,1.6 0 1,1 9.1,7.5 Z"
                    fill={accent}
                    fillRule="evenodd"
                  />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  {result.type_sujet === "vehicule" ? t("vehicle_estimate_badge") : t("realestate_estimate_badge")}
                  {t("indicative_suffix")}
                </div>
                <div className="brand" style={{ fontSize: brandSize(20), fontWeight: 600, marginBottom: 12, color: pt.strongColor, position: "relative" }}>
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
                    {t("hypothesis_prefix")}
                    {result.hypothese}
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
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M9.1,7.5 A1.6,1.6 0 1,1 5.9,7.5 A1.6,1.6 0 1,1 9.1,7.5 Z"
                    fill={accent}
                    fillRule="evenodd"
                  />
                </svg>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: accent, marginBottom: 4, position: "relative" }}>
                  {result.categorie}
                </div>
                <div className="brand" style={{ fontSize: brandSize(20), fontWeight: 600, marginBottom: 4, color: pt.strongColor, position: "relative" }}>
                  {result.objet}
                </div>
                <div style={{ fontSize: 13, color: pt.subText, marginBottom: 16, position: "relative" }}>
                  {result.etat} · <em>{result.etat_note}</em>
                </div>

                {listingSeed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      fontSize: 11,
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
                    <span className="brand" style={{ fontStyle: "italic" }}>
                      {listingSeed.fromHistory ? t("reestimate_badge") : t("listing_seed_badge")}
                    </span>
                    {listingSeed.link && (
                      <a
                        href={listingSeed.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{ fontSize: 10, color: accent, textDecoration: "underline" }}
                      >
                        {t("listing_seed_link")}
                      </a>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {[
                    { key: "estimation", label: t("tab_estimation") },
                    { key: "statistiques", label: t("tab_statistiques") },
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
                    <Gauge label={t("gauge_sell_ease_label")} value={result.facilite_vente} lowLabel={t("gauge_sell_ease_low")} highLabel={t("gauge_sell_ease_high")} theme={menuTheme} accent={accent} accentRgb={accentRgb} />
                    <Gauge label={t("gauge_rarity_label")} value={result.rarete} lowLabel={t("gauge_rarity_low")} highLabel={t("gauge_rarity_high")} theme={menuTheme} accent={accent} accentRgb={accentRgb} />

                    {Array.isArray(result.tendance_marche) && result.tendance_marche.length >= 2 && (() => {
                      const trendPoints = buildTrendSeries(
                        result.tendance_marche,
                        trendRange,
                        result.objet || "objet",
                        (result.prix_bas + result.prix_haut) / 2,
                        lang
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
                            {t("trend_title")}
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
                                {t(`trend_range_${r.key}`)}
                              </button>
                            ))}
                          </div>
                          {trendPoints && <PriceEvolutionChart theme={menuTheme} points={trendPoints} />}
                          <div style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.5, marginTop: 10 }}>
                            {t("trend_disclaimer")}
                            {isShortRange && t("trend_short_range_note")}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.5 }}>
                      {t("trend_ai_evaluation_note")}
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
                  {shareStatus === "generating" ? t("share_generating") : shareStatus === "downloaded" ? t("share_downloaded") : t("share_button")}
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

                {((result.breakdown && Object.keys(result.breakdown).length > 0) ||
                  (result.listings && result.listings.length > 0)) && (
                  <div
                    style={{
                      borderTop: pt.dashedBorder,
                      paddingTop: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      className="brand"
                      style={{ fontSize: brandSize(13), fontStyle: "italic", fontWeight: 500, color: pt.rowText, marginBottom: 6 }}
                    >
                      {t("breakdown_title")}
                    </div>
                    {result.breakdown &&
                      ["leboncoin", "vinted", "ebay", "ebaySold"].map((key) => {
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
                                {b.min === b.max ? `${b.min} €` : `${b.min}–${b.max} €`} ({b.count}{" "}
                                {key === "ebaySold" ? t("breakdown_sale_unit") : t("breakdown_listing_unit")}
                                {b.count > 1 ? "s" : ""})
                              </span>
                            ) : (
                              <span style={{ color: pt.chevronColor, fontStyle: "italic" }}>{t("breakdown_unavailable")}</span>
                            )}
                          </div>
                        );
                      })}

                    {result.listings && result.listings.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setListingsOpen((v) => !v)}
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: pt.chevronColor,
                            background: "none",
                            border: "none",
                            padding: 0,
                            marginTop: 10,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {listingsOpen
                            ? t("listings_collapse")
                            : `${t("listings_expand_prefix")}${result.listings.length} ${
                                result.listings.length > 1
                                  ? t("listings_expand_middle_plural")
                                  : t("listings_expand_middle_singular")
                              }`}
                        </button>
                        {listingsOpen && (
                          <div style={{ marginTop: 8 }}>
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
                      </>
                    )}
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
                  {result.prix_brocante && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>{t("brocante_label")}</strong> {result.prix_brocante}
                    </div>
                  )}
                  <div>
                    <strong>{t("conseil_label")}</strong> {result.conseil}
                  </div>
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
                      {t("correction_prompt")}
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                        {t("correction_instructions")}
                      </div>
                      <textarea
                        value={correctionInput}
                        onChange={(e) => setCorrectionInput(e.target.value)}
                        placeholder={t("correction_placeholder")}
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
                          {t("recalculate_button")}
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
                          {t("cancel_button")}
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
                      {t("generate_ad_button")}
                    </button>
                  )}

                  {!adText && !adLoading && adGenCount >= 3 && (
                    <div style={{ fontSize: 12, color: pt.chevronColor }}>
                      {t("ad_limit_reached")}
                    </div>
                  )}

                  {adLoading && (
                    <div style={{ fontSize: 12, color: pt.chevronColor }}>{t("ad_generating")}</div>
                  )}

                  {adError && (
                    <div style={{ fontSize: 12, color: accent, marginTop: adText ? 8 : 0 }}>{adError}</div>
                  )}

                  {adText && !adLoading && (
                    <div>
                      <div style={{ fontSize: 12, color: pt.chevronColor, marginBottom: 6 }}>
                        {t("ad_ready_label")}
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
                          {adCopied ? t("ad_copied") : t("ad_copy_button")}
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
                            {t("ad_regenerate_prefix")}
                            {3 - adGenCount}
                            {3 - adGenCount > 1 ? t("ad_regenerate_suffix_plural") : t("ad_regenerate_suffix_singular")}
                          </button>
                        )}
                      </div>
                      {adGenCount >= 3 && (
                        <div style={{ fontSize: 11, color: pt.chevronColor, marginBottom: 8 }}>
                          {t("ad_limit_reached_edit_note")}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: pt.chevronColor, marginBottom: 6, lineHeight: 1.5 }}>
                        {t("ad_paste_instructions")}
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

                {image && image.base64 && (
                  <div
                    style={{
                      borderTop: pt.dashedBorder,
                      paddingTop: 12,
                      marginTop: 14,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: pt.strongColor,
                        marginBottom: 8,
                      }}
                    >
                      {t("extra_angles_title")}
                    </div>

                    {!isPremiumPlan && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaywallInfo(null);
                          setShowPaywall(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          background: `rgba(${accentRgb}, 0.12)`,
                          border: `1px dashed rgba(${accentRgb}, 0.5)`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          cursor: "pointer",
                        }}
                      >
                        <Lock size={13} color={accent} style={{ flexShrink: 0 }} />
                        <span className="mono" style={{ fontSize: 11, color: accent, textAlign: "left", lineHeight: 1.4 }}>
                          {t("extra_angles_premium_note")}
                        </span>
                      </button>
                    )}

                    {isPremiumPlan && !extraAnglesAttempted && !extraAnglesLoading && (
                      <button
                        type="button"
                        onClick={generateExtraAngles}
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
                        {t("extra_angles_generate_button")}
                      </button>
                    )}

                    {extraAnglesLoading && (
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          {[0, 1].map((i) => (
                            <div
                              key={i}
                              style={{
                                width: 92,
                                height: 92,
                                borderRadius: 10,
                                background: pt.rowBg,
                                border: pt.rowBorder,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Loader2 size={18} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: pt.chevronColor }}>
                          {t("extra_angles_generating")}
                        </div>
                      </div>
                    )}

                    {extraAnglesError && !extraAnglesLoading && (
                      <div>
                        <div style={{ fontSize: 12, color: accent, marginBottom: 8 }}>{extraAnglesError}</div>
                        <button
                          type="button"
                          onClick={generateExtraAngles}
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
                          {t("extra_angles_retry_button")}
                        </button>
                      </div>
                    )}

                    {extraAngles && extraAngles.length > 0 && !extraAnglesLoading && (
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          {extraAngles.map((img, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img
                                src={`data:${img.mime_type};base64,${img.data}`}
                                alt=""
                                style={{
                                  width: 110,
                                  height: 110,
                                  objectFit: "cover",
                                  borderRadius: 10,
                                  border: pt.rowBorder,
                                  display: "block",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => downloadExtraAngle(img, i)}
                                aria-label={t("aria_download_photo")}
                                style={{
                                  position: "absolute",
                                  bottom: 6,
                                  right: 6,
                                  background: "rgba(21, 34, 56, 0.72)",
                                  border: "none",
                                  borderRadius: 20,
                                  padding: 6,
                                  display: "flex",
                                  cursor: "pointer",
                                }}
                              >
                                <Download size={13} color="#FFFFFF" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: pt.chevronColor, lineHeight: 1.5 }}>
                          {t("extra_angles_download_note")}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                  const conf = confidenceInfo(result.confiance);
                  const dotColor = conf.dot === "muted" ? pt.chevronColor : conf.dot || accent;
                  return (
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <span className="brand" style={{ fontSize: brandSize(13), fontStyle: "italic", fontWeight: 500, color: pt.rowText }}>
                        {conf.label}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: pt.chevronColor }}>
                        · {result.source}
                      </span>
                    </div>
                  );
                })()}
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
          onClick={() => {
            setShowHistory(false);
            setConfirmClearHistory(false);
          }}
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
              <h2 className="brand" style={{ fontSize: brandSize(20), margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <Tag size={16} color={accent} style={{ transform: "rotate(90deg)" }} />
                {t("history_title")}
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {history.length > 0 && (
                  <button
                    className="mono"
                    onClick={() => setConfirmClearHistory(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: pt.subText,
                      fontSize: 12,
                      textDecoration: "underline",
                    }}
                  >
                    {t("history_clear_all")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setConfirmClearHistory(false);
                  }}
                  style={{ background: "none", border: "none", padding: 4 }}
                  aria-label={t("close_label")}
                >
                  <X size={20} color={pt.closeColor} />
                </button>
              </div>
            </div>

            {!user && (
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginBottom: 14 }}>
                {t("history_login_note")}
              </p>
            )}

            {history.length === 0 && (
              <p className="mono" style={{ fontSize: 13, color: pt.subText }}>
                {t("history_empty")}
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
                      {new Date(h.date).toLocaleDateString(localeTag(), {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => reestimateFromHistory(h)}
                    title={t("history_reestimate_title")}
                    aria-label={t("aria_reestimate")}
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
                    aria-label={t("aria_delete")}
                  >
                    <Trash2 size={16} color={accent} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation avant suppression totale de l'historique — se superpose
          au panneau Historique (même famille de bottom-sheet, zIndex plus
          élevé pour rester au-dessus). */}
      {showHistory && confirmClearHistory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 36, 28, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 11,
          }}
          onClick={() => setConfirmClearHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: pt.sheetBg,
              width: "100%",
              maxWidth: 420,
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px 28px",
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Trash2 size={18} color={pt.errorColor} />
              <h2 className="brand" style={{ fontSize: brandSize(18), margin: 0, color: pt.titleColor }}>
                {t("history_clear_confirm_title")}
              </h2>
            </div>
            <p className="mono" style={{ fontSize: 13, color: pt.subText, marginBottom: 20, lineHeight: 1.5 }}>
              {t("history_clear_confirm_body_prefix")}
              {history.length}
              {history.length > 1 ? t("history_clear_confirm_body_middle_plural") : t("history_clear_confirm_body_middle_singular")}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="mono"
                onClick={() => setConfirmClearHistory(false)}
                style={{
                  flex: 1,
                  background: pt.rowBg,
                  border: pt.rowBorder,
                  borderRadius: 10,
                  padding: "12px 0",
                  color: pt.rowText,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("cancel_button")}
              </button>
              <button
                className="mono"
                onClick={() => {
                  clearHistory();
                  setConfirmClearHistory(false);
                }}
                style={{
                  flex: 1,
                  background: pt.errorColor,
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("history_clear_confirm_button")}
              </button>
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
              <h2 className="brand" style={{ fontSize: brandSize(20), margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <BarChart3 size={16} color={accent} />
                {t("collection_title")}
              </h2>
              <button onClick={() => setShowCollection(false)} style={{ background: "none", border: "none", padding: 4 }} aria-label={t("close_label")}>
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="mono" style={{ fontSize: 13, color: pt.subText }}>
                {t("collection_empty")}
              </p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: "14px 12px" }}>
                    <div className="mono" style={{ fontSize: 10, color: pt.subText, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t("collection_stat_value_label")}
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
                        {t("collection_stat_objects_label")}
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
                      <strong>
                        {portfolioStreak} {portfolioStreak > 1 ? t("collection_streak_days_plural") : t("collection_streak_days_singular")}
                      </strong>
                      {t("collection_streak_suffix")}
                    </span>
                  </div>
                )}

                {portfolioChartPoints.length >= 2 && (
                  <div style={{ background: pt.rowBg, border: pt.rowBorder, borderRadius: 10, padding: 14, marginBottom: 16, position: "relative" }}>
                    <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}>
                      {t("collection_chart_title")}
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
                          {t("collection_chart_premium_prefix")}
                          {portfolioChartPoints.length - 5}
                          {portfolioChartPoints.length - 5 > 1
                            ? t("collection_chart_premium_suffix_plural")
                            : t("collection_chart_premium_suffix_singular")}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: 6 }}>
                  <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.strongColor, marginBottom: 10 }}>
                    {t("collection_badges_title")}
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
              <h2 className="brand" style={{ fontSize: brandSize(20), margin: 0, display: "flex", alignItems: "center", gap: 8, color: pt.titleColor }}>
                <BarChart3 size={16} color={accent} />
                {t("scanned_objects_title")}
              </h2>
              <button onClick={() => setShowScannedObjectsList(false)} style={{ background: "none", border: "none", padding: 4 }} aria-label={t("close_label")}>
                <X size={20} color={pt.closeColor} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: pt.subText, marginTop: 0, marginBottom: 14 }}>
              {t("scanned_objects_subtitle_prefix")}
              <strong style={{ color: pt.rowText }}>{t("scanned_objects_subtitle_strong")}</strong> ({Math.round(portfolioValue)} €).
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
                        {h.objet || t("object_fallback_label")}
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
      {menuSheet.mounted && (
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
            ref={menuSheet.sheetRef}
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
              ...menuSheet.sheetStyle,
            }}
          >
            {/* Le geste de balayage pour fermer fonctionne depuis presque
                n'importe où sur le panneau (voir useBottomSheet) — ce
                trait n'est qu'une poignée visuelle. */}
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Menu size={17} color={accent} />
                {t("menu_title")}
              </h2>
              <button
                onClick={() => setShowMenu(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Moon size={17} color={accent} />
                {t("menu_display")}
              </h2>
              <button
                onClick={() => setShowDisplayPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: pt.rowText, marginBottom: 8 }}>
                {t("display_theme_title")}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {AFFICHAGES.map((aff) => {
                  const isActive = activeAffichage.key === aff.key;
                  const swatchHigh = aff.high || "#F2662E";
                  const swatchMid = aff.mid || (aff.key === "blanc" ? "#FFFFFF" : "#152238");
                  const swatchBase = aff.base || (aff.key === "blanc" ? "#FFFFFF" : "#0A1220");
                  return (
                    <button
                      key={aff.key}
                      onClick={() => setSelectedAffichageKey(aff.key)}
                      title={aff.label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${swatchHigh} 0%, ${swatchMid} 55%, ${swatchBase} 100%)`,
                          border: isActive ? "3px solid #FFFFFF" : "2px solid rgba(255, 255, 255, 0.25)",
                          boxShadow: isActive ? `0 0 0 2px ${swatchHigh}` : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                      <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center" }}>
                        {aff.emoji} {aff.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Profil (connexion / déconnexion / avatar) ============ */}
      {profileSheet.mounted && (
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
            ref={profileSheet.sheetRef}
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
              ...profileSheet.sheetStyle,
            }}
          >
            {/* Le geste de balayage pour fermer fonctionne depuis presque
                n'importe où sur le panneau (voir useBottomSheet) — ce
                trait n'est qu'une poignée visuelle. */}
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 3, background: pt.grabBg, margin: "0 auto 16px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2
                className="brand"
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <User size={17} color={accent} />
                {t("profile_title")}
              </h2>
              <button
                onClick={() => setShowProfilePanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Smile size={17} color={accent} />
                {t("menu_avatar")}
              </h2>
              <button
                onClick={() => setShowAvatarPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                  {t("avatar_choose_intro")}
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
                    {t("avatar_owner_preview_note")}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 18,
                    background: `radial-gradient(circle at 50% 30%, rgba(${accentRgb}, 0.16) 0%, transparent 70%)`,
                    borderRadius: 16,
                    padding: "16px 0 10px",
                  }}
                >
                  {avatarCharacterInput === NO_AVATAR_ID ? (
                    <span
                      style={{
                        width: 150,
                        height: 150,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.2)",
                        flexShrink: 0,
                      }}
                    >
                      <X size={64} color={pt.chevronColor} />
                    </span>
                  ) : (
                    <CharacterAvatar id={avatarCharacterInput} size={150} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: pt.strongColor, marginTop: 6 }}>
                    {avatarCharacterInput === NO_AVATAR_ID ? t("avatar_none_label") : characterMeta(avatarCharacterInput).name}
                  </span>
                  <span
                    className="mono"
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: pt.subText, marginTop: 4 }}
                  >
                    {avatarCharacterInput === NO_AVATAR_ID ? t("avatar_none_sub") : t("avatar_current_sub")}
                  </span>
                </div>

                {/* Liste unique à la suite : "Aucun avatar" en premier, puis
                    tous les persos débloqués (estimations ou pack) triés par
                    rareté, puis les verrouillés dans le même ordre — les 3
                    persos 100% pack (Raton/Spectre/Griffon) sont masqués ici
                    (demandé par Dylan). */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  <button
                    onClick={() => pickCharacter(NO_AVATAR_ID)}
                    title={t("avatar_none_label")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      width: 76,
                      background: avatarCharacterInput === NO_AVATAR_ID ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                      border: avatarCharacterInput === NO_AVATAR_ID ? `2px solid ${accent}` : pt.rowBorder,
                      borderRadius: 10,
                      padding: "8px 4px",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.2)",
                        flexShrink: 0,
                      }}
                    >
                      <X size={20} color={pt.chevronColor} />
                    </span>
                    <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center", lineHeight: 1.2 }}>
                      {t("avatar_none_label")}
                    </span>
                  </button>
                  {[
                    ...CHARACTERS_META.filter((m) => isCharacterUnlocked(m.id)),
                    ...CHARACTERS_META.filter((m) => !isCharacterUnlocked(m.id) && !PACK_ONLY_HIDDEN_IDS.includes(m.id)),
                  ].map((meta) => {
                    const unlocked = isCharacterUnlocked(meta.id);
                    const selected = avatarCharacterInput === meta.id;
                    const revealArt = unlocked || isOwnerPreview;
                    const clickable = unlocked || isOwnerPreview;
                    const isHiddenSecret = meta.secret && !revealArt;
                    // Un perso verrouillé (non secret) affiche désormais une
                    // silhouette grisée générique à la place de son
                    // illustration réelle — seul le seuil requis reste lisible
                    // en dessous (demandé par Dylan) — sauf en mode
                    // propriétaire (aperçu autorisé, voir isOwnerPreview).
                    const isLockedHidden = !meta.secret && !revealArt;
                    return (
                      <button
                        key={meta.id}
                        onClick={() => pickCharacter(meta.id)}
                        disabled={!clickable}
                        title={
                          isHiddenSecret
                            ? t("avatar_secret_title")
                            : unlocked
                            ? meta.name
                            : isOwnerPreview
                            ? `${meta.name} — ${t("avatar_owner_preview_template").replace("{hint}", characterHint(meta))}`
                            : `${meta.name} — ${characterHint(meta)}`
                        }
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          width: 76,
                          background: selected ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                          border: selected ? `2px solid ${accent}` : pt.rowBorder,
                          borderRadius: 10,
                          padding: "8px 4px",
                          opacity: unlocked ? 1 : isOwnerPreview ? 0.75 : 0.4,
                          cursor: clickable ? "pointer" : "default",
                        }}
                      >
                        {isHiddenSecret ? (
                          <span
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(0,0,0,0.35)",
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{t("avatar_secret_placeholder")}</span>
                          </span>
                        ) : isLockedHidden ? (
                          <span
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(0,0,0,0.35)",
                              flexShrink: 0,
                            }}
                          >
                            <User size={20} color={pt.chevronColor} />
                          </span>
                        ) : (
                          <CharacterAvatar id={meta.id} size={42} />
                        )}
                        <span className="mono" style={{ fontSize: 9, color: pt.subText, textAlign: "center", lineHeight: 1.2 }}>
                          {isHiddenSecret ? t("avatar_secret_placeholder") : meta.name}
                        </span>
                        {!unlocked && (
                          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Lock size={8} color={pt.chevronColor} />
                            <span className="mono" style={{ fontSize: 7, color: pt.chevronColor, textAlign: "center", lineHeight: 1.1 }}>
                              {isHiddenSecret ? t("avatar_secret_hint") : characterHint(meta)}
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Choix proposé dès qu'un personnage est sélectionné : mascotte
                    plein cadre sur l'écran photo, ou juste l'icône (haut à
                    droite / classement) en gardant l'interface de base pour
                    prendre une photo (demandé par Dylan). */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: pt.subText, marginBottom: 8 }}
                  >
                    {t("avatar_where_show_prefix")}
                    {characterMeta(avatarCharacterInput).name}
                    {t("avatar_where_show_suffix")}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* "Icône seulement" est présenté en premier : c'est le
                        choix par défaut (demandé par Dylan) — l'arrière-plan
                        avec la mascotte reste possible mais en second temps,
                        via un geste explicite sur cette seconde carte. */}
                    <button
                      onClick={() => setAvatarDisplayModeInput("icone")}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        background: avatarDisplayModeInput === "icone" ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                        border: avatarDisplayModeInput === "icone" ? `2px solid ${accent}` : pt.rowBorder,
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: pt.strongColor }}>{t("avatar_icon_only_label")}</span>
                      <span className="mono" style={{ fontSize: 10, color: pt.subText, lineHeight: 1.3 }}>
                        {t("avatar_icon_only_desc")}
                      </span>
                    </button>
                    <button
                      onClick={() => setAvatarDisplayModeInput("fond")}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        background: avatarDisplayModeInput === "fond" ? `rgba(${accentRgb}, 0.18)` : pt.rowBg,
                        border: avatarDisplayModeInput === "fond" ? `2px solid ${accent}` : pt.rowBorder,
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: pt.strongColor }}>{t("avatar_background_label")}</span>
                      <span className="mono" style={{ fontSize: 10, color: pt.subText, lineHeight: 1.3 }}>
                        {t("avatar_background_desc")}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={saveAvatar}
                  disabled={avatarSaving || !avatarDirty}
                  style={{ marginTop: 16, opacity: avatarSaving || !avatarDirty ? 0.6 : 1 }}
                >
                  {avatarSaving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  {t("avatar_save_button")}
                </button>
                {avatarError && (
                  <div className="mono" style={{ fontSize: 11, color: pt.errorColor, marginTop: 8 }}>
                    {avatarError}
                  </div>
                )}
                {avatarSavedFlash && (
                  <div className="mono" style={{ fontSize: 11, color: "#4ADE80", marginTop: 8 }}>
                    {t("avatar_saved_flash")}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
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
                aria-label={t("close_label")}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <TrendingUp size={17} color={accent} />
                {t("trending_title")}
              </h2>
              <button
                onClick={() => setShowTrending(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                            aria-label={t("aria_next")}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Trophy size={17} color={accent} />
                {t("leaderboard_title")}
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                      {renderAvatarOrPlaceholder(profile && profile.avatar_character, 17)}
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
                    // L'avatar de chaque joueur est stocké côté serveur comme
                    // un simple id de personnage (avatar_character) — le
                    // portrait est résolu localement via CHARACTER_IMAGES.
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
                          <CharacterAvatar id={row.avatar_character || DEFAULT_CHARACTER_ID} size={22} />
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Sparkles size={17} color={accent} />
                {t("subscription_title")}
              </h2>
              <button
                onClick={() => setShowSubscriptionPanel(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
                    <span style={{ textAlign: "left" }}>
                      <span style={{ display: "block" }}>
                        {plan.label} — {plan.quota}{t("plan_per_month_suffix")}
                      </span>
                      {plan.bonus > 0 && (
                        <span style={{ display: "block", fontSize: 11, opacity: 0.85 }}>
                          + {plan.bonus} {t("subscription_bonus_suffix")}
                        </span>
                      )}
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
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 10, marginBottom: 0 }}>
                {t("subscription_cancel_anytime")}
              </p>
            </div>

            {renderCreditPurchaseBlock()}
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
                style={{ fontSize: brandSize(21), margin: 0, display: "flex", alignItems: "center", gap: 9, color: pt.titleColor }}
              >
                <Mail size={17} color={accent} />
                {t("contact_title")}
              </h2>
              <button
                onClick={() => setShowContact(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
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
              <h2 className="brand" style={{ fontSize: brandSize(20), margin: 0, color: pt.titleColor }}>
                {t("paywall_title")}
              </h2>
              <button
                onClick={() => setShowPaywall(false)}
                style={{ background: "none", border: "none", padding: 4 }}
                aria-label={t("close_label")}
              >
                <X size={20} color={pt.closeColor} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: pt.rowText, lineHeight: 1.5, marginTop: 0 }}>
              {paywallInfo?.reason === "quota_epuise" && t("paywall_reason_quota_epuise")}
              {paywallInfo?.reason === "gratuit_epuise" && t("paywall_reason_gratuit_epuise")}
              {!paywallInfo?.reason && t("paywall_reason_default")}
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
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {t("paywall_watching_ad")}
                  </>
                ) : (
                  <>
                    <PlayCircle size={14} /> {t("paywall_watch_ad_button")}
                  </>
                )}
              </button>
            )}

            <div style={{ borderTop: pt.dashedBorder, paddingTop: 14 }}>
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 0, marginBottom: 10 }}>
                {t("paywall_or_subscribe")}
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
                    <span style={{ textAlign: "left" }}>
                      <span style={{ display: "block" }}>
                        {plan.label} — {plan.quota}{t("plan_per_month_suffix")}
                      </span>
                      {plan.bonus > 0 && (
                        <span style={{ display: "block", fontSize: 11, opacity: 0.85 }}>
                          + {plan.bonus} {t("subscription_bonus_suffix")}
                        </span>
                      )}
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
              <p className="mono" style={{ fontSize: 11, color: pt.subText, marginTop: 10, marginBottom: 0 }}>
                {t("subscription_cancel_anytime")}
              </p>
            </div>

            {renderCreditPurchaseBlock()}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
