/* ==========================================================
   エンブレム表示
   ・club.emblem の画像を表示し、読み込めない場合は
     色・形データからダミーエンブレム（SVG）を生成して差し替える
   ========================================================== */

(function () {
  const hexOf = (key) => (lookup(COLORS, key) || lookup(COLORS, "other")).hex;

  // 背景色に対して読みやすい文字色（白 or 黒）
  const textColorOn = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1d1d1f" : "#ffffff";
  };

  // 形ごとの輪郭パス（viewBox 0 0 100 100）
  const OUTLINES = {
    circle: '<circle cx="50" cy="50" r="46" />',
    shield: '<path d="M14 10 H86 V48 C86 72 68 86 50 94 C32 86 14 72 14 48 Z" />',
    tall:   '<path d="M28 6 H72 V66 C72 82 62 92 50 96 C38 92 28 82 28 66 Z" />',
    wide:   '<rect x="6" y="24" width="88" height="52" rx="10" />',
  };

  function outlineKey(shapes) {
    return ["circle", "tall", "wide", "shield"].find((s) => shapes.includes(s)) || "shield";
  }

  function placeholderSVG(club) {
    const [c1 = "other", c2 = "white", c3] = club.colors;
    const main = hexOf(c1);
    const sub = hexOf(c2);
    const accent = c3 ? hexOf(c3) : sub;
    const outline = OUTLINES[outlineKey(club.shapes)];
    const label = (club.abbr || club.name).slice(0, 2);
    const clipId = `clip-${club.id}`;

    return `
      <svg class="emblem-svg" viewBox="0 0 100 100" role="img" aria-label="${club.name}のエンブレム（仮）">
        <defs><clipPath id="${clipId}">${outline}</clipPath></defs>
        <g clip-path="url(#${clipId})">
          <rect width="100" height="100" fill="${main}" />
          <rect x="0" y="62" width="100" height="10" fill="${accent}" />
        </g>
        <g fill="none" stroke="${sub}" stroke-width="5">${outline}</g>
        <g fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1">${outline}</g>
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
              font-size="22" font-weight="700" fill="${textColorOn(main)}"
              font-family="'Noto Sans JP', sans-serif">${label}</text>
      </svg>`;
  }

  // 画像 → 失敗時はダミーSVGに差し替え
  window.renderEmblem = function (club) {
    if (!club.emblem) return placeholderSVG(club);
    return `<img class="emblem-img" src="${club.emblem}" alt="${club.name}のエンブレム"
              loading="lazy" data-fallback="${club.id}">`;
  };

  // onerror はインライン属性ではなく、キャプチャで一括処理
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
      // 一時的なアクセス制限（429）対策：1回だけ時間をおいて再読み込み
      if (!img.dataset.retried) {
        img.dataset.retried = "1";
        const src = img.src;
        setTimeout(() => { img.src = src + (src.includes("?") ? "&" : "?") + "r=1"; }, 1500 + Math.random() * 1500);
        return;
      }
      const club = CLUBS.find((c) => c.id === img.dataset.fallback);
      if (club) img.outerHTML = placeholderSVG(club);
    },
    true
  );
})();
