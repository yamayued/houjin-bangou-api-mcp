# 国税庁の法人番号 API を MCP にしたら、LLM からかなり使いやすくなった

2026年3月12日時点で、国税庁の法人番号公表サイト Web-API には公式の API があります。  
ただ、LLM や MCP クライアントからそのまま気持ちよく使うには、あと一歩だけ薄い橋渡しが必要でした。

そこで作ったのが [houjin-bangou-api-mcp](https://github.com/yamayued/houjin-bangou-api-mcp) です。

この記事では、単に「MCP を作りました」という話ではなく、

- なぜ法人番号 API を MCP にしたかったのか
- どこを工夫すると “使える OSS” になるのか
- public repository として何を気をつけたか

を中心に書きます。

## 先に結論

作ってみて一番大きかったのは、API ラッパーを作ること自体ではなく、

- 初見で成功しやすい導線を作ること
- upstream の癖を吸収しつつ、公式仕様から離れすぎないこと
- 配布後に壊れにくい検証と packaging を揃えること

でした。

MCP は「動く」だけでは足りません。  
ローカルで試した人が、最初の 5 分で成功体験を持てるかどうかで印象がかなり変わります。

## なぜ法人番号 API を MCP にしたのか

法人番号 API は、一次情報としてかなり強いデータソースです。

- 法人番号で正確に引ける
- 名称検索ができる
- 更新差分が取れる
- 履歴も追える

一方で、LLM から使うには少しだけ素の API が近すぎます。

- XML / CSV の扱いが必要
- 絞り込み条件を毎回覚えるのが大変
- 入力制約を間違えると upstream でエラーになる
- Shift-JIS を含むレスポンス形式差分がある

つまり、公式 API は強いけれど、そのままだと AI ツールからは少し扱いづらい。  
そこで MCP にして、LLM から「法人名で探す」「法人番号で取る」「最近の更新を見る」が自然にできる形にしました。

## 設計で意識したこと

### 1. 公式 API に近いまま、MCP として使いやすくする

この手のラッパーは、便利にしようとして独自抽象化を入れすぎると、逆に何のデータか分からなくなります。

なので今回は、

- フィールド名はできるだけ公式 API に寄せる
- ただし `responseType: "12"` の XML は構造化レスポンスにする
- `01` と `02` の CSV は raw text として返す

という方針にしました。

このバランスが大事で、

- 公式仕様を知っている人には違和感が少ない
- LLM 側は `metadata` と `corporations[]` をそのまま読める
- CSV が欲しい用途では source payload を失わない

という形に落ち着きました。

### 2. 入力エラーは upstream に投げる前に止める

MCP として使うと、ユーザーは API の細かい制約を知らないまま叩くことが多いです。

たとえば今回の API には、こうした制約があります。

- 法人番号は 13 桁
- `corporateNumber` と `corporateNumbers` は排他
- 住所コードは 2 桁都道府県コードか 5 桁市区町村コード
- 名称検索の指定年月日は `2015-10-05` 以降
- 差分取得は `2015-12-01` 以降
- 差分取得の期間は 50 日以内

これを upstream にそのまま流すと、MCP クライアント側では「なんか失敗した」になりがちです。

そこでサーバー側で validation を入れて、

- 形式が間違っている
- 範囲制約に違反している
- 存在しない日付を入れている

といったケースは、できるだけ早く、分かりやすいメッセージで返すようにしました。

## 実装でハマったところ

### 1. Shift-JIS の CSV

これは日本の公的 API らしい難しさでした。

レスポンス形式としては、

- `12`: XML
- `02`: Unicode CSV
- `01`: Shift-JIS CSV

があり、最初は `01` の live レスポンスが文字化けしました。

ここは `content-type` の charset を見つつ、`responseType` も見て decoder を切り替えるようにしています。  
結果として、`01` でも日本語 CSV を readable な形で扱えるようになりました。

### 2. public repo での秘密情報管理

今回のリポジトリは public なので、ここはかなり厳しめにしました。

- Application ID は環境変数のみ
- `.env.example` は置くが、実値は絶対に入れない
- README、テスト、ログ、issue コメントにも本物を出さない
- エラーや検証系スクリプトでも公開前提の扱いをする

特に実 API を使う verification を作ると、うっかりログや fixture に本物の情報を残しやすいので、最初から「全部 public に見られる前提」で組んだのは良かったと思っています。

### 3. Windows と non-ASCII path

これは地味ですが、かなり重要でした。

MCP をデスクトップ用途で使う人は Windows も多いです。  
しかも実際の作業パスには `デスクトップ` のような非 ASCII 文字が普通に入ります。

そこで package smoke を作るときに、

- tarball install
- installed bin 起動
- direct entrypoint 起動
- env なし failure path

までを見るようにしたうえで、Windows の non-ASCII path でも落ちないように調整しました。

さらに GitHub Actions 側でも、Windows runner 上で非 ASCII パスに repo をコピーして smoke するようにしています。  
このあたりは、実際に使ってもらう OSS としてかなり効く部分でした。

## 「動く」だけでなく「配布できる」状態にした工夫

### 1. 検証コマンドを用途ごとに分けた

ローカル確認用に、用途別のスクリプトを揃えました。

- `npm run smoke:mcp`
  MCP として起動し、ツール一覧や基本的な接続を確認
- `npm run check:companies`
  実在企業を使った live 確認
- `npm run check:advanced-filters`
  複数法人番号や絞り込み条件の確認
- `npm run check:response-types`
  XML / UTF-8 CSV / Shift-JIS CSV の確認
- `npm run smoke:package`
  packaged install と import / bin / failure path の確認
- `npm run verify:live`
  初見ユーザー向けの一括 live verification

検証を 1 本にまとめすぎず、でも初見向けには `verify:live` を置く、という二層構造にしたのが効きました。

### 2. package import と CLI entrypoint を分離した

途中で見つかった問題として、package root を import するとサーバーが起動してしまう、というものがありました。

これは public package としては避けたいので、

- CLI は `dist/server.js`
- root import は side-effect free な `dist/index.js`
- `./nta-api`, `./xml`, `./types` の subpath export も用意

という形に整理しました。

これで、

- MCP サーバーとして使う人
- 一部の parser や client を programmatic に使いたい人

の両方にとって安全な package になりました。

## ドキュメントで意識したこと

実装が良くても README が遠いと使われません。

なので README では、なるべく「最短成功ルート」が見えるようにしました。

- `npm install`
- 環境変数設定
- `npm run build`
- MCP host の設定
- 最初のツール呼び出し
- `npm run verify:live`

までを一本で追えるようにしています。

さらに、

- Windows / PowerShell
- Application ID の取り方
- responseType ごとの違い
- 入力ルールと API 制約
- ページネーション
- よくある失敗例

も README に寄せました。

これは実装以上に「使ってもらえる OSS」に効く部分でした。

## 今の状態

現時点では、

- テスト
- build
- package smoke
- Windows CI
- non-ASCII path 対応
- side-effect free package import
- 初見導線

まで含めて、公開 OSS としてかなり実用的なところまで来ています。

もちろん「完璧」ではありません。  
公的 API を扱う以上、upstream の仕様変更や想定外レスポンスはこれからもありえます。

ただ、少なくとも

- 公開して人に試してもらう
- フィードバックを受ける
- npm 公開や 1.0 に進む

という次の段階に進める土台はできたと感じています。

## 今後やりたいこと

- npm 公開
- 実ユーザーからのフィードバック収集
- 自動ページネーションのような convenience 機能の検討
- 隣接する日本の企業データソースとの連携

ただし、ここでも気をつけたいのは「便利機能を足しすぎて opaque にしないこと」です。  
このリポジトリは、あくまで小さく、監査しやすく、公式 API に近いことを強みにしたいと思っています。

## おわりに

今回作ってみて、MCP の面白さは単なる API ラッパーではなく、

- LLM から使いやすい形にする
- 初見でつまずきにくくする
- 配布後に壊れにくい状態まで含めて設計する

ところにあると改めて感じました。

もし日本の公的データや企業データを LLM から扱いたい人がいれば、ぜひ触ってみてください。

- GitHub: [yamayued/houjin-bangou-api-mcp](https://github.com/yamayued/houjin-bangou-api-mcp)

必要であれば次に、

- Zenn 向け frontmatter 付き版
- note 向けのやや読み物寄り版
- X 向けの告知文

までまとめて作れます。
