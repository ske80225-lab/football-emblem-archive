/* ==========================================================
   印刷リスト
   ・検索メニューの Print → 絞り込み結果を印刷モーダルに一覧表示
   ・順位（1からの連番）はドラッグ or 数字入力で並べ替え、行ごとに削除可
   ・チーム名は印刷用に書き換え可（図鑑のデータは変えない）
   ・モーダルの Print → A4 縦・2列の表で印刷（1ページ最大40件）
   ========================================================== */

(function () {
  const ROWS_PER_COLUMN = 20; // 1列の行数（行高 12.4mm × 20 が A4 に収まる上限）

  const $ = (sel) => document.querySelector(sel);
  const el = {
    modal: $("#printModal"),
    list: $("#printList"),
    count: $("#printCount"),
    run: $("#printRun"),
    reset: $("#printReset"),
    close: $("#printClose"),
    sheet: $("#printSheet"),
  };

  let source = []; // 開いたときの絞り込み結果（元に戻す用）
  let items = []; // { club, name }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // 印刷時は遅延読み込みさせない
  const emblemHTML = (club, cls) =>
    club.emblem
      ? `<img class="${cls}" src="${club.emblem}" alt="" data-fallback="${club.id}">`
      : renderEmblem(club);

  const HANDLE_ICON =
    '<svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor" aria-hidden="true">' +
    '<circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/>' +
    '<circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>';

  /* ---------- 一覧（モーダル） ---------- */

  function rowHTML(item, i) {
    return `
      <li class="print-row" data-index="${i}">
        <button type="button" class="print-row__handle" aria-label="ドラッグして並べ替え">${HANDLE_ICON}</button>
        <input type="number" class="print-row__rank" min="1" max="${items.length}" value="${i + 1}"
               inputmode="numeric" aria-label="${esc(item.name)}の順位">
        <div class="print-row__emblem">${emblemHTML(item.club, "emblem-img")}</div>
        <input type="text" class="print-row__name" value="${esc(item.name)}" aria-label="印刷するチーム名">
        <button type="button" class="print-row__delete">削除</button>
      </li>`;
  }

  function render() {
    el.list.innerHTML = items.map(rowHTML).join("");
    el.count.textContent = `全${items.length}件`;
    el.run.disabled = items.length === 0;
  }

  function move(from, to) {
    to = Math.max(0, Math.min(items.length - 1, to));
    if (from === to) return;
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
  }

  /* ---------- ドラッグで並べ替え（マウス・タッチ共通） ---------- */

  let drag = null;

  function onPointerDown(e) {
    const handle = e.target.closest(".print-row__handle");
    if (!handle) return;
    e.preventDefault();
    const row = handle.closest(".print-row");
    drag = { row, from: Number(row.dataset.index), pointerId: e.pointerId };
    row.classList.add("is-dragging");
    handle.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rows = [...el.list.children].filter((r) => r !== drag.row);
    const after = rows.find((r) => {
      const b = r.getBoundingClientRect();
      return e.clientY < b.top + b.height / 2;
    });
    after ? el.list.insertBefore(drag.row, after) : el.list.appendChild(drag.row);
    autoScroll(e.clientY);
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const to = [...el.list.children].indexOf(drag.row);
    drag.row.classList.remove("is-dragging");
    move(drag.from, to);
    drag = null;
    render();
  }

  // モーダルの上下端に近づいたら自動スクロール
  function autoScroll(y) {
    const box = el.modal.getBoundingClientRect();
    if (y < box.top + 60) el.modal.scrollTop -= 12;
    else if (y > box.bottom - 60) el.modal.scrollTop += 12;
  }

  /* ---------- 印刷用の紙面 ---------- */

  function tableHTML(part, offset) {
    return `
      <table>
        <colgroup><col class="c-rank"><col class="c-lg"><col></colgroup>
        <tbody>
          ${part
            .map(
              (it, i) => `
            <tr>
              <td class="rank">${offset + i + 1}</td>
              <td class="lg">${emblemHTML(it.club, "")}</td>
              <td class="nm">${esc(it.name)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function buildSheet() {
    const perPage = ROWS_PER_COLUMN * 2;
    const pages = [];
    for (let p = 0; p < items.length; p += perPage) {
      const chunk = items.slice(p, p + perPage);
      const half = Math.ceil(chunk.length / 2); // 左右の列をなるべく同じ行数に
      pages.push(`
        <section class="sheet">
          ${p === 0 ? `<h1>クラブ一覧</h1><p class="sub">全${items.length}件</p>` : ""}
          <div class="grid">
            ${tableHTML(chunk.slice(0, half), p)}
            ${chunk.length > half ? tableHTML(chunk.slice(half), p + half) : "<div></div>"}
          </div>
        </section>`);
    }
    el.sheet.innerHTML = pages.join("");
  }

  // 画像の読み込みを待ってから印刷（最大 5 秒）
  function waitImages(root) {
    const imgs = [...root.querySelectorAll("img")].filter((img) => !img.complete);
    const all = Promise.all(
      imgs.map(
        (img) =>
          new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          })
      )
    );
    return Promise.race([all, new Promise((r) => setTimeout(r, 5000))]);
  }

  async function runPrint() {
    if (!items.length) return;
    buildSheet();
    el.run.disabled = true;
    await waitImages(el.sheet);
    el.run.disabled = false;
    document.body.classList.add("is-printing");
    el.modal.close();
    window.print();
  }

  window.addEventListener("afterprint", () => {
    if (!document.body.classList.contains("is-printing")) return;
    document.body.classList.remove("is-printing");
    el.modal.showModal();
  });

  /* ---------- 開閉 ---------- */

  window.openPrintList = function (clubs) {
    source = clubs;
    items = clubs.map((club) => ({ club, name: club.name }));
    render();
    el.modal.showModal();
    el.modal.scrollTop = 0;
  };

  function bindEvents() {
    el.list.addEventListener("pointerdown", onPointerDown);
    el.list.addEventListener("pointermove", onPointerMove);
    el.list.addEventListener("pointerup", onPointerUp);
    el.list.addEventListener("pointercancel", onPointerUp);

    el.list.addEventListener("click", (e) => {
      const del = e.target.closest(".print-row__delete");
      if (!del) return;
      items.splice(Number(del.closest(".print-row").dataset.index), 1);
      render();
    });

    // 順位の数字を書き換えたら、その位置へ移動
    el.list.addEventListener("change", (e) => {
      if (!e.target.classList.contains("print-row__rank")) return;
      const from = Number(e.target.closest(".print-row").dataset.index);
      const to = parseInt(e.target.value, 10);
      if (Number.isFinite(to)) move(from, to - 1);
      render();
      el.list.children[Math.max(0, Math.min(items.length - 1, (to || from + 1) - 1))]
        ?.querySelector(".print-row__rank")
        .focus();
    });

    el.list.addEventListener("input", (e) => {
      if (!e.target.classList.contains("print-row__name")) return;
      items[Number(e.target.closest(".print-row").dataset.index)].name = e.target.value;
    });

    el.list.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.classList.contains("print-row__rank")) e.target.blur();
    });

    el.run.addEventListener("click", runPrint);
    el.reset.addEventListener("click", () => window.openPrintList(source));
    el.close.addEventListener("click", () => el.modal.close());
    el.modal.addEventListener("click", (e) => {
      if (e.target === el.modal) el.modal.close();
    });
  }

  bindEvents();
})();
