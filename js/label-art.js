/* ============================================================
   LABEL ART — bread that looks worth buying
   ------------------------------------------------------------
   Two kinds of picture:

   VECTOR (drawn): shaded, appetizing illustrations in natural
   golden-brown bread tones. Bread is brown even when the brand is
   green — realistic art keeps its own colours; the simple flat
   marks (wheat, sliced) follow the palette for a matching look.
   Vector prints razor-sharp at any size and sips ink.

   PHOTO (your real pictures from assets/): richest look, best on
   60 mm+ labels and a decent printer. At 40 mm photos can go
   muddy on cheap sticker stock — print one sheet to check before
   a big run.
   ============================================================ */

/* Natural bread tones — fixed on purpose so bread looks like bread. */
const BREAD_TONES = {
  crustDeep: "#8B4A16", crust: "#C07022", crustLight: "#E39A45",
  glow: "#F6C46B", flour: "#F8EFDC", shadow: "#6B3A12"
};

const LABEL_ART = {
  none: {
    name: "No picture",
    svg: () => ""
  },

  /* ---- PREMIUM SHADED ILLUSTRATIONS (natural colours) ---- */

  /* Golden bloomer: gradient crust, glossy highlight, three scored slashes
     with pale crumb showing through, flour dust. */
  golden: {
    name: "Golden loaf",
    svg: () => `
      <svg class="lb-art-svg" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="lbgCrust" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${BREAD_TONES.glow}"/>
            <stop offset="0.45" stop-color="${BREAD_TONES.crustLight}"/>
            <stop offset="1" stop-color="${BREAD_TONES.crustDeep}"/>
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="62" rx="46" ry="5" fill="${BREAD_TONES.shadow}" opacity="0.18"/>
        <path d="M14 58 C10 32 26 14 60 12 C94 14 110 32 106 58 Z" fill="url(#lbgCrust)"/>
        <path d="M14 58 C10 32 26 14 60 12 C94 14 110 32 106 58 Z" fill="none"
              stroke="${BREAD_TONES.shadow}" stroke-width="1.4" opacity="0.35"/>
        <path d="M24 30 C34 18 52 14 60 14 C68 14 74 16 78 18 C60 16 38 22 24 30 Z"
              fill="#FFF6E0" opacity="0.5"/>
        <g stroke-linecap="round">
          <path d="M34 30 L46 44" stroke="${BREAD_TONES.flour}" stroke-width="5.5"/>
          <path d="M34 30 L46 44" stroke="${BREAD_TONES.shadow}" stroke-width="1.2" opacity="0.5"/>
          <path d="M54 24 L66 38" stroke="${BREAD_TONES.flour}" stroke-width="5.5"/>
          <path d="M54 24 L66 38" stroke="${BREAD_TONES.shadow}" stroke-width="1.2" opacity="0.5"/>
          <path d="M74 30 L86 44" stroke="${BREAD_TONES.flour}" stroke-width="5.5"/>
          <path d="M74 30 L86 44" stroke="${BREAD_TONES.shadow}" stroke-width="1.2" opacity="0.5"/>
        </g>
        <g fill="${BREAD_TONES.flour}" opacity="0.9">
          <circle cx="30" cy="52" r="1.1"/><circle cx="88" cy="50" r="1.3"/>
          <circle cx="70" cy="54" r="0.9"/><circle cx="46" cy="55" r="1"/>
        </g>
      </svg>`
  },

  /* Crusty boule: round country loaf, cross-scored, dusted with flour. */
  crusty: {
    name: "Crusty boule",
    svg: () => `
      <svg class="lb-art-svg" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="lbgBoule" cx="0.38" cy="0.3" r="0.85">
            <stop offset="0" stop-color="${BREAD_TONES.glow}"/>
            <stop offset="0.55" stop-color="${BREAD_TONES.crust}"/>
            <stop offset="1" stop-color="${BREAD_TONES.crustDeep}"/>
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="62" rx="38" ry="4.5" fill="${BREAD_TONES.shadow}" opacity="0.18"/>
        <ellipse cx="60" cy="36" rx="36" ry="28" fill="url(#lbgBoule)"/>
        <ellipse cx="60" cy="36" rx="36" ry="28" fill="none" stroke="${BREAD_TONES.shadow}" stroke-width="1.4" opacity="0.35"/>
        <g stroke-linecap="round">
          <path d="M42 24 L78 48" stroke="${BREAD_TONES.flour}" stroke-width="5"/>
          <path d="M42 24 L78 48" stroke="${BREAD_TONES.shadow}" stroke-width="1.1" opacity="0.5"/>
          <path d="M78 24 L42 48" stroke="${BREAD_TONES.flour}" stroke-width="5"/>
          <path d="M78 24 L42 48" stroke="${BREAD_TONES.shadow}" stroke-width="1.1" opacity="0.5"/>
        </g>
        <path d="M34 20 C42 12 54 9 62 10 C50 12 40 16 34 20 Z" fill="#FFF6E0" opacity="0.55"/>
        <g fill="${BREAD_TONES.flour}" opacity="0.85">
          <circle cx="28" cy="44" r="1.2"/><circle cx="92" cy="40" r="1"/>
          <circle cx="80" cy="16" r="0.9"/><circle cx="50" cy="58" r="1.1"/>
        </g>
      </svg>`
  },

  /* Sugar bread bun trio — soft rolls with a syrup shine, very Ghanaian. */
  buns: {
    name: "Soft buns",
    svg: () => `
      <svg class="lb-art-svg" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="lbgBun" cx="0.4" cy="0.28" r="0.9">
            <stop offset="0" stop-color="${BREAD_TONES.glow}"/>
            <stop offset="0.6" stop-color="${BREAD_TONES.crustLight}"/>
            <stop offset="1" stop-color="${BREAD_TONES.crust}"/>
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="62" rx="44" ry="4.5" fill="${BREAD_TONES.shadow}" opacity="0.18"/>
        <circle cx="34" cy="42" r="20" fill="url(#lbgBun)" stroke="${BREAD_TONES.shadow}" stroke-width="1.2" opacity="0.97"/>
        <circle cx="86" cy="42" r="20" fill="url(#lbgBun)" stroke="${BREAD_TONES.shadow}" stroke-width="1.2" opacity="0.97"/>
        <circle cx="60" cy="32" r="22" fill="url(#lbgBun)" stroke="${BREAD_TONES.shadow}" stroke-width="1.3"/>
        <path d="M48 20 C52 14 62 12 68 14 C60 14 52 17 48 20 Z" fill="#FFF6E0" opacity="0.6"/>
        <g fill="${BREAD_TONES.flour}" opacity="0.9">
          <circle cx="56" cy="26" r="0.9"/><circle cx="66" cy="30" r="0.8"/><circle cx="60" cy="38" r="0.8"/>
        </g>
      </svg>`
  },

  /* ---- FLAT PALETTE MARKS (follow your brand colours) ---- */

  wheat: {
    name: "Wheat (brand)",
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

  sliced: {
    name: "Sliced (brand)",
    svg: (c, on) => `
      <svg class="lb-art-svg" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22 54 L22 28 C22 16 32 10 46 10 C60 10 70 16 70 28 L70 54 Z" fill="${c.primary}"/>
        <path d="M70 54 L70 28 C70 18 76 13 84 15 C90 17 92 24 92 32 L92 54 Z" fill="${c.primary}" opacity="0.75"/>
        <g stroke="${on}" stroke-width="1.6" opacity="0.4">
          <path d="M30 30 L62 30"/><path d="M30 38 L62 38"/><path d="M30 46 L62 46"/>
        </g>
        <rect x="14" y="54" width="78" height="3.2" rx="1.6" fill="${c.accent}"/>
      </svg>`
  },

  /* ---- YOUR REAL PHOTOS (from assets/) ---- */

  photo_loaf: {
    name: "Photo: loaf",
    photo: "assets/loaf.png",
    svg: () => `<img class="lb-art-img" src="assets/loaf.png" alt="">`
  },
  photo_doughnuts: {
    name: "Photo: doughnuts",
    photo: "assets/doughnuts.png",
    svg: () => `<img class="lb-art-img" src="assets/doughnuts.png" alt="">`
  },
  photo_pastries: {
    name: "Photo: pastries",
    photo: "assets/pastries.png",
    svg: () => `<img class="lb-art-img" src="assets/pastries.png" alt="">`
  }
};

/* The logo file that already ships with the project. */
const LABEL_LOGO_SRC = "assets/logo.png";
