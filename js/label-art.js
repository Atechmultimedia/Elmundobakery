/* ============================================================
   LABEL ART — vector bread, drawn to print
   ------------------------------------------------------------
   These are SVG, not photographs. At 40 mm a photo turns to mud on
   sticker paper and drinks ink; vector stays sharp at any size and
   prints in flat brand colour.

   Every piece takes the palette, so art always matches the design.
   ============================================================ */

const LABEL_ART = {
  none: {
    name: "No picture",
    svg: () => ""
  },

  /* Classic bloomer — domed top, three slashes across the crust. */
  loaf: {
    name: "Loaf",
    svg: (c, on) => `
      <svg class="lb-art-svg" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11 52 C8 30 22 13 50 11 C78 13 92 30 89 52 Z" fill="${c.primary}"/>
        <path d="M11 52 C8 30 22 13 50 11 C78 13 92 30 89 52 Z" fill="none"
              stroke="${on}" stroke-width="1.2" opacity="0.35"/>
        <g stroke="${on}" stroke-width="3.6" stroke-linecap="round" opacity="0.9">
          <path d="M29 27 L39 39"/>
          <path d="M45 22 L55 34"/>
          <path d="M61 27 L71 39"/>
        </g>
        <rect x="6" y="52" width="88" height="3.4" rx="1.7" fill="${c.accent}"/>
      </svg>`
  },

  /* Round boule with a cross score — reads well inside a circular label. */
  boule: {
    name: "Round loaf",
    svg: (c, on) => `
      <svg class="lb-art-svg" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="33" rx="31" ry="26" fill="${c.primary}"/>
        <g stroke="${on}" stroke-width="3.4" stroke-linecap="round" opacity="0.9">
          <path d="M36 22 L64 44"/>
          <path d="M64 22 L36 44"/>
        </g>
        <rect x="10" y="56" width="80" height="3.2" rx="1.6" fill="${c.accent}"/>
      </svg>`
  },

  /* Two wheat ears — decorative, uses the least ink of the three. */
  wheat: {
    name: "Wheat",
    svg: (c) => `
      <svg class="lb-art-svg" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g stroke="${c.primary}" stroke-width="2.2" stroke-linecap="round" fill="none">
          <path d="M50 58 L50 20"/>
        </g>
        <g fill="${c.accent}" stroke="${c.primary}" stroke-width="0.9">
          ${[0, 1, 2, 3, 4].map(i => {
            const y = 20 + i * 7.5;
            return `<ellipse cx="42" cy="${y + 3}" rx="6.5" ry="3.4" transform="rotate(-32 42 ${y + 3})"/>
                    <ellipse cx="58" cy="${y + 3}" rx="6.5" ry="3.4" transform="rotate(32 58 ${y + 3})"/>`;
          }).join("")}
          <ellipse cx="50" cy="16" rx="4.5" ry="7" />
        </g>
      </svg>`
  },

  /* Sliced sandwich loaf — for tin breads. */
  sliced: {
    name: "Sliced bread",
    svg: (c, on) => `
      <svg class="lb-art-svg" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22 54 L22 28 C22 16 32 10 46 10 C60 10 70 16 70 28 L70 54 Z" fill="${c.primary}"/>
        <path d="M70 54 L70 28 C70 18 76 13 84 15 C90 17 92 24 92 32 L92 54 Z" fill="${c.primary}" opacity="0.75"/>
        <g stroke="${on}" stroke-width="1.6" opacity="0.4">
          <path d="M30 30 L62 30"/><path d="M30 38 L62 38"/><path d="M30 46 L62 46"/>
        </g>
        <rect x="14" y="54" width="78" height="3.2" rx="1.6" fill="${c.accent}"/>
      </svg>`
  }
};

/* The logo file that already ships with the project. */
const LABEL_LOGO_SRC = "assets/logo.png";
