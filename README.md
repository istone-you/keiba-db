# UMA ATLAS — 競走馬図鑑

名馬92頭（書籍の公開目次に記載された競走馬）と、2023年以降の活躍馬65頭をまとめた、**全157頭の学習用Web図鑑**です。

- 検索、年代・収録区分による絞り込み
- お気に入り、暗記済みチェック、名前当て4択クイズ、自由メモ
- スマホ／PC対応。サーバーやログインは不要です。
- 学習状況は使用中のブラウザのローカルストレージに保存します（端末間の同期なし）。
- 画像は表示可能なものだけ外部のWikipedia/Wikimediaから読み込みます。写真がない馬もあります。

## 起動する

[公開サイト（GitHub Pagesを有効にした後）](https://istone-you.github.io/keiba-db/) または、`index.html` をブラウザで開いてください。

## GitHub Pagesで公開する

このリポジトリの **Settings → Pages → Build and deployment → Source: Deploy from a branch** を選び、**Branch: main / (root)** にして **Save** してください。数分後に `https://istone-you.github.io/keiba-db/` からアクセスできるようになります。公開されるまでリンクは404になる場合があります。

## データの編集

- `index.html` 内の `const HORSES =` がサイトで使われるデータです。
- `data.json` は収録データを編集・検証しやすくするための参考エクスポートです。`data.json` の変更は自動ではサイトへ反映されません。
- データ基準日：2026年11月8日。レース結果などは自動更新されません。

## 参照資料・権利について

- [出版社：血統と戦績で読む 伝説の名馬図鑑](https://www.eastpress.co.jp/goods/detail/9784781621654)
- [JRA：G1レースの結果](https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html)

競走馬の紹介文は学習目的で新たに作成したもので、書籍本文・紙面・写真を転載していません。外部写真の著作権・ライセンス・帰属情報については、各Wikipedia/Wikimedia Commonsのページを確認してください。
