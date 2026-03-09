# EDHREC Japanese Card Images

[EDHREC](https://edhrec.com) のカード画像を日本語版に自動差し替えする Tampermonkey / Greasemonkey ユーザースクリプトです。
最近マジックザギャザリングを遊び始め、日本のファンサイトの乏しさからedhrecを使い始め、時々日本語のカード言語の壁に

カード情報の取得には [Scryfall API](https://scryfall.com/docs/api) を使用しています。

---

## 機能

- EDHREC を閲覧しながらカード画像を自動的に日本語版へ差し替え
- 遅延読み込み・無限スクロールで追加されたカードにも対応
- 日本語版が存在しない場合は英語版画像にフォールバック
- 取得結果を 7 日間キャッシュし、不要な API リクエストを抑制
- Scryfall API のレート制限（50〜100ms 間隔）を遵守

---

## インストール

1. ブラウザに [Tampermonkey](https://www.tampermonkey.net/) 拡張機能をインストール
   （Chrome / Firefox / Edge / Safari に対応）
2. このリポジトリの [edhrec-ja-images.user.js](edhrec-ja-images.user.js) を開き、**Raw** ボタンをクリック
3. Tampermonkey のインストール確認画面が表示されたら **インストール** をクリック
4. [edhrec.com](https://edhrec.com) にアクセスするとカード画像が自動で日本語版に切り替わります

---

## 動作の仕組み

ページ上のカード画像を検出するたびに、以下の手順で日本語版画像を取得します。

1. `alt` 属性などからカード名を取得
2. Scryfall Named API でカード情報を検索
3. 以下の優先順位で日本語版を探索：
   - 同セットの日本語版
   - `lang:ja` による全刷録検索
   - 最新刷録から順に日本語版を探索
4. 日本語版が見つからない場合は英語版画像を表示
5. 取得結果を `sessionStorage` にキャッシュして次回以降の読み込みを高速化

---

## 免責事項

- Magic: The Gathering のカード画像は **Wizards of the Coast LLC** の財産です。
  本スクリプトは非公式のファンツールであり、Wizards of the Coast とは一切関係なく、同社による公認・推薦を受けていません。
  利用にあたっては [WotC ファンコンテントポリシー](https://company.wizards.com/en/legal/fancontentpolicy) に従ってください。

- カードデータおよび画像は **[Scryfall](https://scryfall.com)** より提供されます。
  本スクリプトは非商用目的に限り Scryfall API を使用しています。
  [Scryfall API 利用規約](https://scryfall.com/docs/api) を遵守してください。
  Scryfall は Wizards of the Coast とは独立した組織です。

- 本スクリプトは **[EDHREC](https://edhrec.com)** とは関係ありません。

---

## ライセンス

[MIT License](LICENSE) — Copyright (c) 2026 hawmec
