/* ============================================================
   LABEL TEMPLATES — designed, not assembled
   ------------------------------------------------------------
   Six finished label designs in El Mundo's colours. Pick one, it
   fills itself with the recipe's data, print. Colours are editable
   if you want to move away from the brand palette.

   Each template works on circle, square and rectangle. The layout
   adapts, so a "Pine Band" circle and a "Pine Band" rectangle are
   the same design, not two different ones.
   ============================================================ */

const BRAND = { primary: "#08300D", accent: "#F5A508", bg: "#EADBC8", text: "#08300D" };

const LABEL_TEMPLATES = {
  classic: {
    name: "Classic Ring",
    blurb: "Double border, gold rule under the name. Our default — safe on any stock."
  },
  seal: {
    name: "Gold Seal",
    blurb: "Deep green with a gold edge. Bold and premium — uses the most ink."
  },
  clean: {
    name: "Clean Cream",
    blurb: "Almost no ink. Cheapest to print and very legible."
  },
  band: {
    name: "Pine Band",
    blurb: "Name reversed out of a green band. Reads well from across a table."
  },
  stamp: {
    name: "Rustic Stamp",
    blurb: "Dashed border, typewriter feel. Suits artisan bread."
  },
  split: {
    name: "Split",
    blurb: "Half green, half cream. Modern — name on top, details below."
  },
  artisan: {
    name: "Artisan",
    blurb: "Bread picture above the name, gold rule, contact underneath. Built for the picture.",
    wantsArt: true
  },
  crest: {
    name: "Crest",
    blurb: "Your logo on top, bread below, contact around the rim. The full badge.",
    wantsArt: true,
    wantsLogo: true
  }
};

/* All template CSS, generated for the chosen colours. Used by both the
   on-screen preview and the print window so they can never diverge. */
function labelTemplateCss(c) {
  return `
    .lb { box-sizing: border-box; overflow: hidden; display: flex; align-items: center;
          justify-content: center; text-align: center; position: relative;
          font-family: Georgia, 'Times New Roman', serif; background: #fff; color: ${c.text};
          padding: 1.6mm; page-break-inside: avoid; }
    .lb-inner { width: 100%; line-height: 1.22; padding: 0 1mm; position: relative; z-index: 2; }
    .lb-round { border-radius: 50%; }
    .lb-name { font-weight: bold; font-size: 1.3em; line-height: 1.05; }
    .lb-weight { font-size: 0.95em; font-weight: bold; }
    .lb-price { font-size: 1em; font-weight: bold; }
    .lb-ing { font-size: 0.58em; margin-top: 0.3em; line-height: 1.2; }
    .lb-allergen { font-size: 0.62em; margin-top: 0.2em; font-weight: bold; }
    .lb-bb, .lb-batch { font-size: 0.6em; margin-top: 0.15em; font-family: 'Courier New', monospace; }
    .lb-foot { font-size: 0.55em; margin-top: 0.35em; line-height: 1.25; }

    /* ---- Classic Ring ---- */
    .tpl-classic { background: ${c.bg}; border: 0.7mm solid ${c.primary}; }
    .tpl-classic .lb-inner::before { content: ""; position: absolute; inset: -0.8mm -0.5mm;
      border: 0.25mm solid ${c.accent}; border-radius: inherit; pointer-events: none; }
    .tpl-classic.lb-round .lb-inner::before { border-radius: 50%; inset: -1.5mm; }
    .tpl-classic .lb-name { color: ${c.primary}; padding-bottom: 0.6mm;
      border-bottom: 0.4mm solid ${c.accent}; display: inline-block; }
    .tpl-classic .lb-weight { color: ${c.primary}; margin-top: 0.7mm; }
    .tpl-classic .lb-foot { color: ${c.primary}; opacity: 0.85; border-top: 0.15mm dotted ${c.primary};
      padding-top: 0.5mm; }

    /* ---- Gold Seal ---- */
    .tpl-seal { background: ${c.primary}; border: 0.8mm solid ${c.accent}; color: ${c.bg}; }
    .tpl-seal .lb-name { color: ${c.accent}; letter-spacing: 0.02em; }
    .tpl-seal .lb-weight, .tpl-seal .lb-price { color: ${c.bg}; }
    .tpl-seal .lb-ing, .tpl-seal .lb-allergen, .tpl-seal .lb-bb, .tpl-seal .lb-batch { color: ${c.bg}; opacity: 0.92; }
    .tpl-seal .lb-foot { color: ${c.accent}; border-top: 0.15mm solid ${c.accent}; padding-top: 0.5mm; opacity: 0.9; }

    /* ---- Clean Cream ---- */
    .tpl-clean { background: #fff; border: 0.2mm solid ${c.primary}; }
    .tpl-clean .lb-name { color: ${c.primary}; font-size: 1.35em; }
    .tpl-clean .lb-weight { color: ${c.primary}; opacity: 0.75; font-weight: normal; }
    .tpl-clean .lb-foot { color: ${c.primary}; opacity: 0.6; border-top: 0.15mm solid ${c.accent}; padding-top: 0.5mm; }

    /* ---- Pine Band ---- */
    .tpl-band { background: ${c.bg}; border: 0.3mm solid ${c.primary}; align-items: flex-start; }
    .tpl-band::before { content: ""; position: absolute; top: 0; left: 0; right: 0;
      height: 34%; background: ${c.primary}; z-index: 1; }
    .tpl-band.lb-round::before { height: 42%; }
    .tpl-band .lb-inner { padding-top: 0; }
    .tpl-band .lb-name { color: ${c.bg}; padding: 1.2mm 0 1mm; margin-bottom: 0.8mm; }
    .tpl-band.lb-round .lb-name { padding-top: 2.5mm; }
    .tpl-band .lb-weight { color: ${c.primary}; }
    .tpl-band .lb-foot { color: ${c.primary}; opacity: 0.8; }

    /* ---- Rustic Stamp ---- */
    .tpl-stamp { background: ${c.bg}; border: 0.5mm dashed ${c.primary}; }
    .tpl-stamp .lb-inner { font-family: 'Courier New', monospace; }
    .tpl-stamp .lb-name { color: ${c.primary}; text-transform: uppercase; letter-spacing: 0.06em;
      font-size: 1.1em; font-family: 'Courier New', monospace; }
    .tpl-stamp .lb-weight { color: ${c.primary}; font-family: 'Courier New', monospace; }
    .tpl-stamp .lb-name::after { content: ""; display: block; width: 40%; height: 0.3mm;
      background: ${c.accent}; margin: 0.6mm auto; }
    .tpl-stamp .lb-foot { color: ${c.primary}; opacity: 0.75; font-family: 'Courier New', monospace; }

    /* ---- Split ---- */
    .tpl-split { background: ${c.bg}; border: 0.3mm solid ${c.primary}; }
    .tpl-split::before { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 55%;
      background: ${c.primary}; z-index: 1; }
    .tpl-split .lb-name { color: ${c.bg}; margin-bottom: 0.5mm; }
    .tpl-split .lb-weight { color: ${c.primary}; }
    .tpl-split .lb-price { color: ${c.accent}; background: ${c.primary}; display: inline-block;
      padding: 0.3mm 1.2mm; border-radius: 1mm; }
    .tpl-split .lb-foot { color: ${c.primary}; opacity: 0.8; }

    /* ---- Shared art + logo blocks ---- */
    .lb-art { display: block; margin: 0 auto 0.6mm; }
    .lb-art-svg { display: block; width: 100%; height: 100%; }
    .lb-logo { display: block; margin: 0 auto 0.5mm; object-fit: contain; }

    /* ---- Artisan: the picture leads ---- */
    .tpl-artisan { background: ${c.bg}; border: 0.6mm solid ${c.primary}; }
    .tpl-artisan .lb-name { color: ${c.primary}; padding-bottom: 0.5mm; }
    .tpl-artisan .lb-name::after { content: ""; display: block; width: 55%; height: 0.35mm;
      background: ${c.accent}; margin: 0.7mm auto 0; }
    .tpl-artisan .lb-weight { color: ${c.primary}; margin-top: 0.6mm; }
    .tpl-artisan .lb-foot { color: ${c.primary}; opacity: 0.85; }

    /* ---- Crest: logo, bread, contact rim ---- */
    .tpl-crest { background: ${c.bg}; border: 0.8mm solid ${c.primary};
      box-shadow: inset 0 0 0 0.25mm ${c.accent}; }
    .tpl-crest.lb-round { box-shadow: inset 0 0 0 0.25mm ${c.accent}; }
    .tpl-crest .lb-logo { filter: none; }
    .tpl-crest .lb-name { color: ${c.primary}; text-transform: uppercase;
      letter-spacing: 0.03em; font-size: 1.15em; }
    .tpl-crest .lb-weight { color: ${c.primary}; }
    .tpl-crest .lb-foot { color: ${c.bg}; background: ${c.primary};
      margin: 0.6mm -1mm -0.5mm; padding: 0.6mm 1mm; border-radius: 0 0 1mm 1mm; opacity: 1; }
    .tpl-crest.lb-round .lb-foot { background: none; color: ${c.primary};
      margin: 0.5mm 0 0; padding: 0.4mm 0 0; border-top: 0.2mm solid ${c.accent}; border-radius: 0; }
  `;
}
