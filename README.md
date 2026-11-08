# UMA ATLAS — 競走馬図鑑（Astro SSG）

公式公開URL（GitHub Pages）：https://istone-you.github.io/keiba-db/

日本競馬の歴代名馬と2023年以降の活躍馬をまとめた **静的サイト** です。AstroでHTMLをビルド時に生成します。表示内容は2026年11月8日時点の整理情報です。

## サイト構成

- 馬のデータは **microCMS（サービス `keiba-db`、API `horses`）** で管理し、ビルド時に取得します。
- `src/lib/microcms.js` — microCMSからの全件取得（100件ずつページング）
- `src/lib/horses.js` — データ整形、産駒・関連馬の解決、URL生成
- `src/lib/photos.js` — Wikipediaの写真をビルド時に取得（画像未登録の馬のみ）
- `src/pages/index.astro` — 一覧・検索・並べ替え（条件はURLに保持）
- `src/pages/horse/[id].astro` — 各馬の詳細（血統・収録産駒・関連馬）。URLは microCMS のコンテンツID（`/horse/001/` など）
- `src/components/` — カード・写真フレーム

### microCMS の入力ルール

- **コンテンツID** は `001` 形式の3桁連番で付けてください（URLになります）。
- **表示順（sortOrder）** は一覧の「年代順」の並びです。間に入れる場合は既存値の間の数値を使います（10刻みで登録済み）。
- **血統 › 父 / 母** に収録馬と同じ馬名を入れると、親の詳細ページに「収録産駒」として自動表示されます。
- **関連馬** はライバル・兄弟など。親子関係は血統欄で表現してください。
- **画像** を設定するとWikipediaの写真より優先されます。

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
2. microCMSの `API設定 → Webhook` で「GitHub Actions」を追加し、トリガーイベント名を `microcms-update` に設定（公開時に自動ビルド）

## 資料確認

個々の記録は以下の情報も参照して再確認してください。

- [JBISサーチ](https://www.jbis.or.jp/) — 血統と全競走成績
- [JRA](https://www.jra.go.jp/) — 国内の競走結果
- [Wikipedia](https://ja.wikipedia.org/) — 補助的な経歴情報と写真

主要レースは全成績ではなく抜粋です。最新の成績が自動更新される仕組みではありません。
