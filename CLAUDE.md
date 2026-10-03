# Football Emblem Archive（サッカーエンブレム図鑑）

ヨーロッパ各国の1部・2部（イングランドは3部まで）クラブのエンブレムを一覧し、国・色・形・リーグで絞り込める個人用の図鑑サイト。
**ユーザーへの返答は日本語で。** 自宅用（個人利用）であることはユーザー確認済み。

- 公開：GitHub Pages（`origin` = https://github.com/ske80225-lab/football-emblem-archive.git, `main`）
- 構成：素の HTML / CSS / JavaScript（ビルドなし・フレームワークなし）。`file://` でも動くよう ES Modules は使わず `<script>` を順に読む
- デザイン：Figma `SXUNVNetW0Xc5U9a25mZtU`
  - 一覧（PC_トップページ）node `63:4133`
  - 検索メニューを開いた状態（PC_search open）node `65:4485`

## ファイル構成

| パス | 役割 |
|---|---|
| `index.html` | ヘッダー（右上 search アイコン）／一覧グリッド／検索パネル（右からスライド）／詳細モーダル `<dialog>` |
| `css/style.css` | 全スタイル |
| `js/master.js` | マスターデータ：`COUNTRIES`（key・日本語名・flagcdn コード）、`COLORS`（hex とカラーゲージ上の位置 `pos`）、`SHAPES`（24×24 シルエット `icon`）、`DIVISIONS`（Div. 1〜3）、`LEAGUES`（国→[1部名, 2部名, 3部名…]）、`lookup()` `shapeIcon()` |
| `js/data/clubs.js` | `window.CLUBS` 配列。国・部ごとに `/* ---------- イングランド 1部 ---------- */` の見出しで区切る |
| `js/emblem.js` | `renderEmblem(club)`。画像が読めない／`emblem: null` のときは色と形からダミー SVG を生成。429 対策で1回だけ再読込 |
| `js/app.js` | 一覧描画・絞り込み・カラーゲージ並び替え・検索パネル開閉・詳細モーダル・ハッシュルーティング |
| `tools/` | クラブ追加用スクリプト（下記）。中間ファイルは `tools/_work/`（git 対象外） |
| `images/ui/` | Figma から書き出した UI アイコン（search / close / plus / shape-circle） |

## クラブデータの形（`js/data/clubs.js`）

```js
{
  id: "arsenal", name: "アーセナル", country: "england", division: 1,
  city: "ロンドン", founded: 1886, nickname: "ガナーズ",
  stadium: "エミレーツ・スタジアム", capacity: 60704,
  colors: ["red", "white", "yellow"], shapes: ["shield"], motif: "大砲",
  emblem: "https://upload.wikimedia.org/...",   // Wikipedia/Commons の画像URL（直リンク）。無ければ null
  titles: [{ name: "リーグ", count: 13 }, ...],  // 無ければ []
}
```

- **表示名はすべて日本語**（クラブ名・都市・スタジアム・愛称・リーグ名）。英字のまま入れない
- `country` `colors` `shapes` はキーで指定し、表示名は `master.js` 側で管理
- 所属リーグ名はデータに書かず、`LEAGUES[country][division-1]` から自動で決まる（昇格・降格は `division` を変えるだけ）
- `shapes` は複数可。形キー：`circle` 円形 / `shield` 盾型 / `tall` 縦長 / `wide` 横長 / `animal` 動物・人物モチーフ / `letter` 文字・イニシャル中心 / `other` その他
- `colors` キー：`red` `orange` `yellow` `white` `green` `blue` `purple` `black` `other`（多い順、最大4つ）
- `id` は詳細URL `#/club/<id>` に使うので、一度決めたら変えない。重複禁止
- `titles` と `motif` が入っているのは最初の15クラブ（アーセナル、リヴァプール、マンU、チェルシー、サウサンプトン、バルセロナ、レアル、ユヴェントス、サンプドリア、バイエルン、シャルケ、PSG、アヤックス、ベンフィカ、セルティック）のみ。残りは空

## UI 仕様（Figma 反映後）

- 一覧：白カードのグリッド（背景 `#2c3437`）。カードは エンブレム／国旗＋`Div. 1`／クラブ名
- カードクリック → 詳細モーダル（内容は以前のまま。カテゴリー表記は `Div. 1` / `Div. 2`）
- 右上の search アイコン → 右からパネルが開く
  - Club Name：名前・都市・愛称の部分一致（ひらがな⇔カタカナ・全角半角・中黒を無視）
  - Country：`COUNTRIES` から自動生成した国旗付きピル（複数選択＝OR）
  - Color：グラデーションのゲージ。動かすと、つまみ位置に近い色を持つクラブ順に**並び替え**（絞り込みではない）。色の位置は `COLORS[].pos`。「なんとなく合っていればOK」とユーザー指示あり
  - Shape：形のシルエットアイコン（文字ではなくアイコンで、というユーザー指示）
  - League：ALL / Div. 1 / Div. 2 / Div. 3（`DIVISIONS` から自動生成。3部はイングランドのみ）
  - すべてクリア
- 項目どうしは AND、同じ項目内は OR

## 収録状況（2026-10-04 時点：27か国・842クラブ）

イングランド・スペイン・イタリア・ドイツ・フランス・オランダ・ポルトガル・ベルギー・トルコ・オーストリア・スコットランド・チェコ・ノルウェー・ポーランド・ギリシャ・ウクライナ・デンマーク・スイス・クロアチア・スウェーデン・スロバキア・セルビア・フィンランド・ブルガリア・キプロス・ボスニア・ヘルツェゴビナ（1部のみ、2部は不要とユーザー指示）・ルーマニア。いずれも1部・2部。**イングランドのみ3部（EFLリーグ1・24クラブ）まで**収録（ユーザー指示）。

- シーズンは 2026–27（ノルウェー・スウェーデン・フィンランドは2026年シーズン）
- **リザーブチームは除外**（B / II / Jong / U23 / Futures / NXT / -2 など。トップと同じエンブレムのため）
- 推定・要注意：
  - オーストリア2部：今季記事が無く、2025–26 の顔ぶれから昇降格を反映して推定
  - キプロス2部：Wikipedia に今季記事が無く、Flashscore の 2026/2027 順位表で所属確認
  - セルビア1部：今季14クラブ（FotMob でも確認済み）
- エンブレム画像が無く仮の図案のクラブ：バトマン・ペトロルスポル、マルディン1969、ムーラスポル（トルコ2部）、オパヴァ（チェコ2部）、ビトチャ（スロバキア2部）、ヘバル・パザルジク（ブルガリア2部）、ポレミディオン（キプロス2部・Wikipedia記事なし）

## クラブ・国を追加する手順

所属確認の参考サイト（ユーザー指定）：FotMob https://www.fotmob.com/ja ／ Flashscore https://www.flashscore.co.jp/

1. **国の追加**：`js/master.js` の `COUNTRIES`（key・日本語名・flagcdn の国コード）と `LEAGUES` に追記。`index.html` の meta description の「◯か国」も更新
2. **所属クラブ**：`tools/fetch_clubs.py` の `LEAGUES` に `(country, div, "英語版シーズン記事名")` を書き `python3 fetch_clubs.py teams`。`_work/teams_raw.json` の候補（"Stadiums and locations" / "Teams" / "League table" 節）からスタジアム名・地域名・代表チーム・リザーブを除き、`_work/teams.json` を作る。記事が無い・人数が合わないリーグは FotMob / Flashscore の順位表で照合
3. `python3 fetch_clubs.py fetch` → `python3 fetch_clubs.py analyze`（数分。Wikipedia API は 1秒間隔＋429時リトライ）
4. **日本語表記**：`_work/parsed.json` を見て `_work/ja.txt` を書く（`idx|クラブ名|都市|スタジアム|愛称`）。日本語版記事があればその表記、無ければカタカナで補う。愛称は代表的なもの1つ（意味があれば「カナ（意味）」）
5. **形の分類**：エンブレムを一覧表示する確認ページで目視し `_work/shapes.txt` を書く（自動判定は精度が低いので使わない）
6. `python3 append_clubs.py` で `clubs.js` 末尾に追記（国の途中の部を足したときは、ブロックを同じ国の直後へ移す） → `node` で件数・id重複・未登録の国が無いか確認 → ブラウザで表示確認

## 作業メモ

- Wikipedia の画像は `upload.wikimedia.org` / `thumb.wikimedia.org` に直リンク（ダウンロードはしていない）。thumb の幅は標準サイズ（120 / 250 / 330 / 500 など）しか使えない
- プレビューは Desktop 配下を直接配信できない（権限エラー）ため、スクラッチパッドにコピーして `python3 -m http.server` で配信していた（設定は `キャラクター図鑑_20260811/.claude/launch.json` の `emblem` / `emblem-work`）
- 色の自動推定は HSV で分類。金・銀は `orange` / `other` になりがち
