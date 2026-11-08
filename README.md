# UMA ATLAS — 競走馬図鑑（Astro SSG）

公式公開URL（GitHub Pages）：https://istone-you.github.io/keiba-db/

日本競馬の歴代名馬と2023年以降の活躍馬をまとめた **全157頭の静的サイト** です。AstroでHTMLをビルド時に生成します。表示内容は2026年11月8日時点の整理情報です。

## サイト構成

- `src/pages/index.astro` — 全馬一覧、馬名・勝ち鞍・血統・特徴の検索、並べ替え
- `src/pages/horse/[id].astro` — 各馬の個別静的HTML（`/horse/001/` ～ `/horse/157/`）
- `src/lib/horses.js` — `data.json` の読み込みとURL生成
- `src/layouts/BaseLayout.astro` — 共通ヘッダー・フッター
- `src/styles/global.css` — スタイル
- `data.json` — 全157頭の解説・代表レース・血統などのデータ
- `.github/workflows/deploy.yml` — GitHub Actionsによるビルド・公開
- `index.html` — 旧版の予備ファイル。**Astroのビルド成果物には使いません。** Pagesの切り替え前でも旧サイトを維持するために残しています。

独立した個別ページはビルド時に生成され、JavaScriptがなくても文章を読めます。検索と並べ替え、Wikipediaの写真取得のみクライアントで行います。写真は一部の馬で表示できない場合があります。

※馬の識別番号は `data.json` の配列順です。既存の馬を並べ替えると個別URLが変化します。追加する場合は原則として末尾に追加してください。

## ローカル開発

Node.js 24以降を使用してください。

```bash
npm install
npm run dev
npm run build
npm run preview
```

ローカル開発の入口は `http://localhost:4321/keiba-db/` です。ビルド成果物は `dist/` に生成されます。

## GitHub Pagesへのデプロイ

**初回のみ必須：GitHubの `Settings → Pages → Build and deployment → Source` を `GitHub Actions` に変更してください。**

従来の `Deploy from a branch` から切り替えないと、Astroの生成サイトは公開されません。次に `Actions → Publish Astro site → Run workflow` で再実行するか、`main` にコミットを追加するとビルド・公開されます。

以降は `main` ブランチへのプッシュで、157頭のHTMLが自動再生成されます。

## 資料確認

個々の記録は以下の情報も参照して再確認してください。

- [JBISサーチ](https://www.jbis.or.jp/) — 血統と全競走成績
- [JRA](https://www.jra.go.jp/) — 国内の競走結果
- [Wikipedia](https://ja.wikipedia.org/) — 補助的な経歴情報と写真

主要レースは全成績ではなく抜粋です。最新の成績が自動更新される仕組みではありません。
