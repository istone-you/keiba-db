# UMA ATLAS — 競走馬図鑑（Astro SSG）

公式公開URL（GitHub Pages）：https://istone-you.github.io/keiba-db/

日本競馬の歴代名馬と2023年以降の活躍馬をまとめた **静的サイト** です。AstroでHTMLをビルド時に生成します。表示内容は2026年11月8日時点の整理情報です。

## サイト構成

- データは **microCMS（サービス `keiba-db`）** で管理し、ビルド時に取得します。API は `horses`（競走馬）・`races`（G1レース）・`sire-rankings`（リーディングサイアー）の3つです。290頭・G1レース74競走を収録（2026年11月時点）。
- `src/lib/microcms.js` — microCMSからの全件取得（100件ずつページング）
- `src/lib/horses.js` — データ整形、産駒・関連馬の解決、URL生成
- `src/lib/photos.js` — Wikipediaの写真と記事タイトルをビルド時に取得（「○○ (競走馬)」の記事を優先）
- `src/lib/sires.js` — 未収録の種牡馬の父をビルド時にWikipediaから取得（父系の樹形図用）
- `src/pages/index.astro` — 一覧・検索・並べ替え（条件はURLに保持）
- `src/pages/horse/[id].astro` — 各馬の詳細（血統・収録産駒・ライバル・兄弟）。URLは microCMS のコンテンツID（`/horse/001/` など）
- `src/pages/races/` — G1レース一覧と、レースごとの収録勝ち馬（`/races/arima-kinen/` など）
- `src/pages/triple-crown/` — 三冠馬・牝馬三冠馬（勝ち鞍から自動判定）
- `src/pages/horse-of-the-year/` — 年度代表馬（プロフィールの「年度代表馬（受賞年）」から）
- `src/pages/sire-lines/` — 血統・父系の樹形図（血統欄の「父」から）
- `src/pages/leading-sires/` — リーディングサイアー（年ごとの上位10頭。`sire-rankings` API）
- `src/pages/overseas/` — 海外G1勝利（「海外」区分のG1レースへの勝ち鞍から）
- `src/components/` — カード・写真フレーム

### microCMS の入力ルール

- **コンテンツID** は `001` 形式の3桁連番で付けてください（URLになります）。
- **表示順（sortOrder）** は一覧の「年代順」の並びです。間に入れる場合は既存値の間の数値を使います（10刻みで登録済み）。
- **血統 › 父 / 母** に収録馬と同じ馬名を入れると、親の詳細ページに「収録産駒」として自動表示されます。
- **ライバル** は1組につきどちらか一方の馬に登録すれば、両方のページに表示されます。兄弟（母が同じ馬）は血統から自動で表示されます。
- **主な勝ち鞍 › G1レース（参照）** を選ぶと、そのレースのページに勝ち馬として載ります。レース名は当時の名称のまま入力して構いません。
- **G1レース** のコンテンツIDはURLになります（例：`arima-kinen`）。
- **画像** を設定するとWikipediaの写真より優先されます。
- **主な勝ち鞍 › netkeiba レースID** はnetkeibaのレースページのURL（`db.netkeiba.com/race/<レースID>/`）の値です。「映像あり（netkeiba）」をオンにすると、勝ち鞍の横に「▶ 映像」リンク（netkeibaの映像ページ）が表示されます。
- **プロフィール › 年度代表馬（受賞年）** は `1984,1985` のようにカンマ区切りで入力します。
- **プロフィール › 引退年** が空欄の馬は「現役」と表示されます。

### 定期的に更新が必要なデータ

microCMSで更新したら、GitHubの `Actions → Publish Astro site → Run workflow` を実行するとサイトに反映されます。

| いつ | 何を | 項目 |
|---|---|---|
| 現役馬が引退したとき | 引退年を入力（最後に出走した年） | プロフィール › 引退年 |
| 引退後の進路が決まったとき | 種牡馬・繁殖牝馬など | プロフィール › 引退後 |
| 収録馬が亡くなったとき | 没年 | プロフィール › 没年 |
| 現役馬がレースに出たとき | 獲得賞金・通算成績。まとめて更新したら `src/lib/horses.js` の `dataAsOf`（現役馬の賞金に「○年○月時点」と表示）も変更する | プロフィール › 獲得賞金 / 通算成績 |
| 現役馬がG1を勝ったとき | 勝ち鞍を追加し、G1レース（参照）・netkeiba レースID・映像ありを入力 | 主な勝ち鞍 |
| 毎年1月（JRA賞の発表後） | 年度代表馬の受賞年を追加。未収録なら馬ごと追加する | プロフィール › 年度代表馬（受賞年） |
| 毎年1月（前年の成績確定後） | 前年のリーディングサイアー上位10頭を1件追加（JBISサーチ「年度別サイアー」・区分「中央」）。収録馬は「収録馬」に参照を入れる | リーディングサイアー API |
| 新しいG1が創設・改称されたとき | G1レースを追加・説明を修正 | G1レース API |

※ 獲得賞金・馬主・生産牧場・没年は、2026年11月時点のWikipedia／netkeibaの情報で一括入力したものです。

## ローカル開発

Node.js 24以降を使用してください。

```bash
cp .env.example .env   # MICROCMS_API_KEY（GET権限）を設定
npm install
npm run dev
npm run build
```

ローカル開発の入口は `http://localhost:4321/keiba-db/` です。

## GitHub Pagesへのデプロイ

**初回のみ必須：GitHubの `Settings → Pages → Build and deployment → Source` を `GitHub Actions` に変更してください。**

従来の `Deploy from a branch` から切り替えないと、Astroの生成サイトは公開されません。次に `Actions → Publish Astro site → Run workflow` で再実行するか、`main` にコミットを追加するとビルド・公開されます。

以降は `main` ブランチへのプッシュで自動再生成されます。

**microCMS連携の初回設定**

1. GitHubの `Settings → Secrets and variables → Actions` に `MICROCMS_API_KEY`（GET権限のAPIキー）を登録
2. microCMSで内容を更新したら、`Actions → Publish Astro site → Run workflow` を手動実行してサイトに反映

## 資料確認

個々の記録は以下の情報も参照して再確認してください。

- [JBISサーチ](https://www.jbis.or.jp/) — 血統と全競走成績
- [JRA](https://www.jra.go.jp/) — 国内の競走結果
- [Wikipedia](https://ja.wikipedia.org/) — 補助的な経歴情報と写真

主要レースは全成績ではなく抜粋です。最新の成績が自動更新される仕組みではありません。
