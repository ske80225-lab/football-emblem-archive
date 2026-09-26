/* ==========================================================
   一覧・絞り込み・詳細表示
   詳細は URL ハッシュ（#/club/<id>）で開くので、
   将来は /club/<id>/ の個別ページにも移行しやすい構成
   ========================================================== */

(function () {
  const GAUGE_DEFAULT = 15; // デザイン上のつまみの初期位置（並び替えはしない）

  const state = {
    countries: new Set(),
    shapes: new Set(),
    division: "all",
    query: "",
    colorPos: null, // null＝並び替えなし。数値ならゲージ位置に近い色順
  };

  const $ = (sel) => document.querySelector(sel);
  const el = {
    grid: $("#clubGrid"),
    count: $("#resultCount"),
    empty: $("#emptyState"),
    country: $("#filterCountry"),
    shape: $("#filterShape"),
    division: $("#filterDivision"),
    gauge: $("#colorGauge"),
    clear: $("#clearFilters"),
    search: $("#searchInput"),
    toggle: $("#searchToggle"),
    panel: $("#searchPanel"),
    panelClose: $("#searchClose"),
    overlay: $("#searchOverlay"),
    modal: $("#clubModal"),
    modalBody: $("#modalBody"),
  };

  const countryOf = (club) => lookup(COUNTRIES, club.country);
  const divisionName = (d) => lookup(DIVISIONS, d)?.name ?? "—";
  const leagueName = (club) => club.league || LEAGUES[club.country]?.[club.division - 1] || "—";
  // ひらがな→カタカナ・全角英数→半角・中黒などを除いて比較
  const normalize = (s) =>
    (s || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
      .replace(/[・\s=＝\-]/g, "");
  const flagSrc = (country) => `https://flagcdn.com/w80/${country.flag}.png`;
  const flagImg = (country, size = "sm") =>
    `<img class="flag flag--${size}" src="${flagSrc(country)}"
          alt="${country.name}の国旗" width="20" height="15" loading="lazy">`;

  /* ---------- 検索メニューのUI生成 ---------- */

  function buildFilters() {
    el.country.innerHTML = COUNTRIES.map((c) => `
      <button type="button" class="pill" data-group="countries" data-key="${c.key}" aria-pressed="false">
        <img class="pill__flag" src="${flagSrc(c)}" alt="" width="22" height="13" loading="lazy">${c.name}
      </button>`).join("");

    el.shape.innerHTML = SHAPES.map((sh) => `
      <button type="button" class="shape-btn" data-group="shapes" data-key="${sh.key}" aria-pressed="false"
              aria-label="${sh.name}" title="${sh.name}">
        <img class="shape-btn__ring" src="images/ui/shape-circle.svg" alt="" width="32" height="32">
        ${shapeIcon(sh)}
      </button>`).join("");

    el.division.innerHTML = [{ key: "all", name: "ALL" }, ...DIVISIONS]
      .map((d) => `<button type="button" class="seg" data-division="${d.key}" aria-pressed="${d.key === "all"}">${d.name}</button>`)
      .join("");

    el.gauge.value = GAUGE_DEFAULT;
  }

  function syncFilterUI() {
    document.querySelectorAll("[data-group]").forEach((b) => {
      b.setAttribute("aria-pressed", state[b.dataset.group].has(b.dataset.key));
    });
    document.querySelectorAll(".seg").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.division) === String(state.division));
    });
    const active =
      state.countries.size + state.shapes.size +
      (state.division !== "all" ? 1 : 0) + (state.query ? 1 : 0) + (state.colorPos !== null ? 1 : 0);
    el.clear.disabled = active === 0;
  }

  /* ---------- 絞り込み ---------- */
  // 同じ項目内は OR、項目間は AND
  function matches(club) {
    if (state.countries.size && !state.countries.has(club.country)) return false;
    if (state.shapes.size && !club.shapes.some((s) => state.shapes.has(s))) return false;
    if (state.division !== "all" && club.division !== Number(state.division)) return false;
    if (state.query && !normalize(`${club.name}${club.city}${club.nickname || ""}`).includes(state.query)) return false;
    return true;
  }

  /* ---------- カラーゲージによる並び替え ---------- */
  // クラブの色（面積の大きい順）のうち、ゲージ位置に最も近いもの。後ろの色ほど少し不利にする
  function colorDistance(club, pos) {
    let best = Infinity;
    club.colors.forEach((key, i) => {
      const p = lookup(COLORS, key)?.pos;
      if (p == null) return;
      best = Math.min(best, Math.abs(p - pos) + i * 6);
    });
    return best;
  }

  function sortByColor(list) {
    if (state.colorPos === null) return list;
    return list
      .map((club, i) => ({ club, i, d: colorDistance(club, state.colorPos) }))
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .map((x) => x.club);
  }

  /* ---------- 一覧 ---------- */

  function cardHTML(club) {
    const country = countryOf(club);
    return `
      <li>
        <a class="card" href="#/club/${club.id}" aria-label="${club.name}の詳細">
          <img class="card__plus" src="images/ui/plus.svg" alt="" width="33" height="33">
          <div class="card__emblem">${renderEmblem(club)}</div>
          <div class="card__info">
            <p class="card__meta">
              <img class="card__flag" src="${flagSrc(country)}" alt="${country.name}" width="28" height="16" loading="lazy">
              <span class="card__division">${divisionName(club.division)}</span>
            </p>
            <h2 class="card__name">${club.name}</h2>
          </div>
        </a>
      </li>`;
  }

  function renderList() {
    const list = sortByColor(CLUBS.filter(matches));
    el.grid.innerHTML = list.map(cardHTML).join("");
    el.count.textContent = `${list.length} / ${CLUBS.length} クラブ`;
    el.empty.hidden = list.length > 0;
    syncFilterUI();
  }

  /* ---------- 検索メニューの開閉 ---------- */

  function openPanel() {
    el.panel.classList.add("is-open");
    el.panel.removeAttribute("inert");
    el.panel.setAttribute("aria-hidden", "false");
    el.overlay.hidden = false;
    el.toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-search-open");
    setTimeout(() => el.search.focus({ preventScroll: true }), 50);
  }

  function closePanel() {
    if (!el.panel.classList.contains("is-open")) return;
    el.panel.classList.remove("is-open");
    el.panel.setAttribute("inert", "");
    el.panel.setAttribute("aria-hidden", "true");
    el.overlay.hidden = true;
    el.toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-search-open");
    el.toggle.focus({ preventScroll: true });
  }

  /* ---------- 詳細 ---------- */

  function detailHTML(club) {
    const country = countryOf(club);
    const info = [
      ["創設", club.founded ? `${club.founded}年` : "—"],
      ["愛称", club.nickname || "—"],
      ["スタジアム", club.stadium || "—"],
      ["収容人数", club.capacity ? `${club.capacity.toLocaleString("ja-JP")}人` : "—"],
      ["所属リーグ", leagueName(club)],
      ["カテゴリー", divisionName(club.division)],
    ];
    const titles = (club.titles || []).filter((t) => t.count > 0);
    const colors = club.colors.map((k) => lookup(COLORS, k)).filter(Boolean);
    const shapes = club.shapes.map((k) => lookup(SHAPES, k)).filter(Boolean);

    return `
      <div class="detail">
        <div class="detail__emblem">${renderEmblem(club)}</div>

        <div class="detail__main">
          <p class="detail__division division division--${club.division}">${divisionName(club.division)}</p>
          <h2 class="detail__name" id="modalTitle">${club.name}</h2>
          <p class="detail__place">${flagImg(country, "md")}<span>${country.name}</span><span class="sep">／</span><span>${club.city}</span></p>

          <section class="detail__section">
            <h3 class="detail__heading">基本情報</h3>
            <dl class="info">
              ${info.map(([k, v]) => `<div class="info__row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
            </dl>
          </section>

          ${titles.length ? `
          <section class="detail__section">
            <h3 class="detail__heading">主要タイトル</h3>
            <ul class="titles">
              ${titles.map((t) => `
                <li class="title">
                  <span class="title__name"><span aria-hidden="true">🏆</span>${t.name}</span>
                  <span class="title__count">${t.count}</span>
                </li>`).join("")}
            </ul>
          </section>` : ""}

          <section class="detail__section">
            <h3 class="detail__heading">エンブレム情報</h3>
            <dl class="info">
              <div class="info__row">
                <dt>メインカラー</dt>
                <dd class="color-list">
                  ${colors.map((c) => `<span class="color-tag"><span class="swatch swatch--${c.key}" style="--swatch:${c.hex}"></span>${c.name}</span>`).join("")}
                </dd>
              </div>
              <div class="info__row">
                <dt>形</dt>
                <dd class="color-list">
                  ${shapes.map((sh) => `<span class="shape-tag">${shapeIcon(sh)}${sh.name}</span>`).join("") || "—"}
                </dd>
              </div>
              <div class="info__row"><dt>モチーフ</dt><dd>${club.motif || "—"}</dd></div>
            </dl>
          </section>
        </div>
      </div>`;
  }

  let lastFocus = null;

  function openDetail(id) {
    const club = CLUBS.find((c) => c.id === id);
    if (!club) return closeDetail();
    lastFocus = document.activeElement;
    el.modalBody.innerHTML = detailHTML(club);
    document.title = `${club.name}｜サッカーエンブレム図鑑`;
    if (!el.modal.open) el.modal.showModal();
    el.modal.scrollTop = 0;
  }

  function closeDetail() {
    if (el.modal.open) el.modal.close();
    document.title = "サッカーエンブレム図鑑";
  }

  /* ---------- ルーティング（#/club/<id>） ---------- */

  function route() {
    const m = location.hash.match(/^#\/club\/([\w-]+)$/);
    m ? openDetail(m[1]) : closeDetail();
  }

  function goHome() {
    if (location.hash) history.pushState("", document.title, location.pathname + location.search);
    route();
    lastFocus?.focus();
  }

  /* ---------- イベント ---------- */

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-group]");
      if (b) {
        const set = state[b.dataset.group];
        set.has(b.dataset.key) ? set.delete(b.dataset.key) : set.add(b.dataset.key);
        return renderList();
      }
      const s = e.target.closest(".seg");
      if (s) {
        state.division = s.dataset.division;
        return renderList();
      }
    });

    el.search.addEventListener("input", () => {
      state.query = normalize(el.search.value);
      renderList();
    });

    el.gauge.addEventListener("input", () => {
      state.colorPos = Number(el.gauge.value);
      renderList();
    });

    el.clear.addEventListener("click", () => {
      state.countries.clear();
      state.shapes.clear();
      state.division = "all";
      state.query = "";
      state.colorPos = null;
      el.search.value = "";
      el.gauge.value = GAUGE_DEFAULT;
      renderList();
    });

    // 検索メニュー：ボタン・閉じる・外側クリック・Esc
    el.toggle.addEventListener("click", openPanel);
    el.panelClose.addEventListener("click", closePanel);
    el.overlay.addEventListener("click", closePanel);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.modal.open) closePanel();
    });

    // 閉じるボタン・背景クリック・Esc
    el.modal.addEventListener("click", (e) => {
      if (e.target === el.modal || e.target.closest("[data-close]")) goHome();
    });
    el.modal.addEventListener("cancel", (e) => {
      e.preventDefault();
      goHome();
    });

    window.addEventListener("hashchange", route);
  }

  buildFilters();
  bindEvents();
  renderList();
  route();
})();
