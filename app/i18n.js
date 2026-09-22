// Phase C / C6 — localization framework. English is the always-present fallback; other locales
// are optional overlays filled progressively (a natural future community-contribution surface).
// Add a locale by adding a key block; any missing string falls back to English automatically.
window.CC_I18N = {
  en: {
    "wordmark": "Conscious Consuming",
    "nav.home": "Home", "nav.guides": "Guides", "nav.explore": "Explore", "nav.scan": "Scan", "nav.browse": "Browse", "nav.contribute": "Contribute", "nav.lab": "Lab", "nav.discover": "Discover",
    "home.mission": "Compare everyday choices by your values. Sources stay attached; nothing is sponsored or tracked.",
    "home.search": "Search a product, brand, bank, app, or barcode",
    "home.searchBtn": "Search",
    "door.guide.t": "Read a guide", "door.guide.d": "Plain-language explainers that show their sources.",
    "door.explore.t": "Explore by your values", "door.explore.d": "Rank real options by place, category, or value.",
    "door.browse.t": "Browse the commons", "door.browse.d": "By category and entry type.",
    "door.discover.t": "Filter the commons", "door.discover.d": "Filter by value, label, region, or type.",
    "home.mapHdr": "What is covered, and what is still missing"
  },
  es: {
    "wordmark": "Consumo Consciente",
    "nav.home": "Inicio", "nav.guides": "Guías", "nav.explore": "Explorar", "nav.scan": "Escanear", "nav.browse": "Ver todo", "nav.contribute": "Contribuir", "nav.lab": "Lab", "nav.discover": "Descubrir",
    "home.mission": "Compara decisiones cotidianas según tus valores. Las fuentes siguen visibles; nada está patrocinado ni rastreado.",
    "home.search": "Busca un producto, marca, banco, aplicación o código de barras",
    "home.searchBtn": "Buscar",
    "door.guide.t": "Leer una guía", "door.guide.d": "Explicaciones claras que muestran sus fuentes.",
    "door.explore.t": "Explora por tus valores", "door.explore.d": "Ordena opciones reales por lugar, categoría o valor.",
    "door.browse.t": "Ver el común", "door.browse.d": "Por categoría y tipo.",
    "door.discover.t": "Filtra el común", "door.discover.d": "Filtra por valor, etiqueta, región o tipo.",
    "home.mapHdr": "Lo que está cubierto y lo que aún falta"
  }
};

// What each locale actually reaches. The picker reads this and says it out loud, because a
// language menu that silently hands back an English page is the kind of quiet promise this
// catalogue exists to refuse. `covers` is the honest scope; `strings` is checked against the
// English table at runtime, so it cannot drift from the file.
window.CC_LOCALE_META = {
  en: {
    label: 'English',
    endonym: 'English',
    covers: 'Everything: the interface, the guides, every decision and every source note.',
    complete: true
  },
  es: {
    label: 'Spanish',
    endonym: 'Espa\u00f1ol',
    covers: 'The interface only: navigation, search and labels. Guides, scores and entries stay in English.',
    complete: false
  }
};
