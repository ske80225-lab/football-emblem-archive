/* ==========================================================
   マスターデータ（国・色・形・カテゴリーのラベル定義）
   クラブデータからはキーだけを参照し、表示名はここで一元管理する
   ========================================================== */

// 国：key はクラブデータの country と対応。flag は flagcdn.com のコード
window.COUNTRIES = [
  { key: "england",     name: "イングランド",   flag: "gb-eng", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { key: "spain",       name: "スペイン",       flag: "es",     emoji: "🇪🇸" },
  { key: "italy",       name: "イタリア",       flag: "it",     emoji: "🇮🇹" },
  { key: "germany",     name: "ドイツ",         flag: "de",     emoji: "🇩🇪" },
  { key: "france",      name: "フランス",       flag: "fr",     emoji: "🇫🇷" },
  { key: "netherlands", name: "オランダ",       flag: "nl",     emoji: "🇳🇱" },
  { key: "portugal",    name: "ポルトガル",     flag: "pt",     emoji: "🇵🇹" },
  { key: "belgium",     name: "ベルギー",       flag: "be",     emoji: "🇧🇪" },
  { key: "turkey",      name: "トルコ",         flag: "tr",     emoji: "🇹🇷" },
  { key: "austria",     name: "オーストリア",   flag: "at",     emoji: "🇦🇹" },
  { key: "scotland",    name: "スコットランド", flag: "gb-sct", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { key: "czech",       name: "チェコ",         flag: "cz",     emoji: "🇨🇿" },
  { key: "norway",      name: "ノルウェー",     flag: "no",     emoji: "🇳🇴" },
  { key: "poland",      name: "ポーランド",     flag: "pl",     emoji: "🇵🇱" },
  { key: "greece",      name: "ギリシャ",       flag: "gr",     emoji: "🇬🇷" },
  { key: "ukraine",     name: "ウクライナ",     flag: "ua",     emoji: "🇺🇦" },
  { key: "denmark",     name: "デンマーク",     flag: "dk",     emoji: "🇩🇰" },
  { key: "switzerland", name: "スイス",         flag: "ch",     emoji: "🇨🇭" },
  { key: "croatia",     name: "クロアチア",     flag: "hr",     emoji: "🇭🇷" },
  { key: "sweden",      name: "スウェーデン",   flag: "se",     emoji: "🇸🇪" },
  { key: "slovakia",    name: "スロバキア",     flag: "sk",     emoji: "🇸🇰" },
  { key: "serbia",      name: "セルビア",       flag: "rs",     emoji: "🇷🇸" },
];

// エンブレムカラー：hex はスウォッチ表示とダミーエンブレム生成に使用
// pos は検索メニューのカラーゲージ上の位置（0〜100）。ゲージを動かすと近い色順に並び替える
window.COLORS = [
  { key: "red",    name: "赤",       hex: "#d7263d", pos: 0 },
  { key: "orange", name: "オレンジ", hex: "#f07c1b", pos: 17 },
  { key: "yellow", name: "黄",       hex: "#f2c230", pos: 34 },
  { key: "white",  name: "白",       hex: "#ffffff", pos: 45 },
  { key: "green",  name: "緑",       hex: "#1c8a4a", pos: 59 },
  { key: "blue",   name: "青",       hex: "#1f4e9c", pos: 70 },
  { key: "purple", name: "紫",       hex: "#6b3fa0", pos: 82 },
  { key: "black",  name: "黒",       hex: "#1d1d1f", pos: 95 },
  { key: "other",  name: "その他",   hex: "#9a9a9a", pos: null },
];

// エンブレムの形（1クラブに複数指定可）
// icon：24×24 のシルエット（fill は currentColor）
window.SHAPES = [
  { key: "circle", name: "円形",
    icon: '<circle cx="12" cy="12" r="9"/>' },
  { key: "shield", name: "盾型",
    icon: '<path d="M4 3h16v8.5c0 5-3.6 8.6-8 10.5-4.4-1.9-8-5.5-8-10.5z"/>' },
  { key: "tall", name: "縦長",
    icon: '<path d="M7.5 1.5h9v14c0 3.4-2 5.7-4.5 7-2.5-1.3-4.5-3.6-4.5-7z"/>' },
  { key: "wide", name: "横長",
    icon: '<rect x="1.5" y="6.5" width="21" height="11" rx="2.5"/>' },
  { key: "animal", name: "動物・人物モチーフ",
    icon: '<path d="M4 2.5l4.5 4.5h7L20 2.5V13a8 8 0 0 1-16 0z"/>' },
  { key: "letter", name: "文字・イニシャル中心",
    icon: '<path fill-rule="evenodd" d="M9.6 2.5h4.8L21 21.5h-4.6l-1.4-4.3H9l-1.4 4.3H3zm.6 11h3.6L12 7.8z"/>' },
  { key: "other", name: "その他",
    icon: '<circle cx="4.5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/>' },
];

// 形アイコンの SVG
window.shapeIcon = (shape, cls = "shape-icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${shape.icon}</svg>`;

// リーグカテゴリー
window.DIVISIONS = [
  { key: 1, name: "Div. 1" },
  { key: 2, name: "Div. 2" },
];

// 所属リーグ名（country → [1部, 2部]）
window.LEAGUES = {
  england:     ["プレミアリーグ", "EFLチャンピオンシップ"],
  spain:       ["ラ・リーガ", "セグンダ・ディビシオン"],
  italy:       ["セリエA", "セリエB"],
  germany:     ["ブンデスリーガ", "2.ブンデスリーガ"],
  france:      ["リーグ・アン", "リーグ・ドゥ"],
  netherlands: ["エールディヴィジ", "エールステ・ディヴィジ"],
  portugal:    ["プリメイラ・リーガ", "リーガ・ポルトガル2"],
  belgium:     ["ベルギー・プロリーグ", "チャレンジャー・プロリーグ"],
  turkey:      ["スュペル・リグ", "TFF 1.リグ"],
  austria:     ["オーストリア・ブンデスリーガ", "2.リーガ"],
  scotland:    ["スコティッシュ・プレミアシップ", "スコティッシュ・チャンピオンシップ"],
  czech:       ["チェコ・ファーストリーグ", "チェコ・ナショナルリーグ"],
  norway:      ["エリテセリエン", "OBOSリーガエン"],
  poland:      ["エクストラクラサ", "Iリーガ"],
  greece:      ["スーパーリーグ・ギリシャ", "スーパーリーグ2"],
  ukraine:     ["ウクライナ・プレミアリーグ", "ウクライナ・ファーストリーグ"],
  denmark:     ["デンマーク・スーペルリーガ", "デンマーク1部リーグ"],
  switzerland: ["スイス・スーパーリーグ", "スイス・チャレンジリーグ"],
  croatia:     ["HNL", "プルヴァ・NL"],
  sweden:      ["アルスヴェンスカン", "スーペルエッタン"],
  slovakia:    ["ニケ・リガ", "2.リガ"],
  serbia:      ["セルビア・スーペルリーガ", "セルビア・プルヴァリーガ"],
};

// key → マスター項目 を引くためのヘルパー
window.lookup = (list, key) => list.find((item) => item.key === key);
