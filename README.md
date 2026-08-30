# English Listening Trainer

ネイティブに近い自然な英語を聞き、聞き取ったとおりに書き取って採点するリスニング練習アプリ。

## 最重要ルール — Answer Leakage Prevention

音声再生からユーザーが回答を送信するまで、正解英文・日本語訳・正解に関するヒントを一切
画面に出さない。

- 正解データ（`transcript` / `translation` / `hints`）の原本は `content/questions.ts` にあり、
  アプリのコードからは import しない。`scripts/build-content.mjs` だけが読む。
- 配信されるのは、公開メタデータ `public/data/index.json`（id・章・レベル・難易度・音声の有無だけ）と、
  暗号化した正解 `public/data/enc/{id}.json` の2つ。
- 暗号化された正解を**取得するのは採点ボタンを押した瞬間だけ**。聞いている間、正解は
  ブラウザのメモリにもネットワークにも存在しない。
- 「もう一回」は同じ `<audio>` を再生し直すだけで、通信すら発生しない。

### この方式が守れる範囲

静的サイトには採点を行うサーバーが無いため、採点はブラウザで行う。つまり正解は最終的に
端末へ届く。これは原理的に避けられない。暗号化が防ぐのはここまで:

- DevTools の Network タブや `view-source` で正解が**うっかり目に入る**こと
- `public/data/enc/*.json` を直接開いて読まれること

逆に、コンソールから復号関数を呼べば取り出せる。**意図的に覗く人は止められない。**
本アプリは利用者本人だけが使う前提のため、この水準を許容している。
サーバーを置いて採点を server 側で行えば「原理的に不可能」にできる（Vercel など）。

検証（ビルド成果物の全ファイルを走査する）:

```bash
npm run build
grep -rl "supposed to meet up" out/   # 何も出ないこと
```

`npm run content:build` も、書き出した `index.json` に正解が混ざっていないか毎回検査し、
混ざっていればビルドを失敗させる。

## セットアップ

```bash
npm install
cp .env.example .env      # 音声を作るときだけ必要（ELEVENLABS_API_KEY）
npm run content:build     # public/data/ を書き出す
npm run dev
```

## デプロイ

`main` に push すると GitHub Actions が採点エンジンのテスト → コンテンツ生成 → 静的ビルド →
GitHub Pages への公開まで行う（`.github/workflows/deploy.yml`）。テストが落ちたらデプロイしない。

リポジトリの Settings → Pages で **Source を「GitHub Actions」** に設定しておくこと。

プロジェクトページは `https://<user>.github.io/<repo>/` に置かれるため `basePath` が要る。
ワークフローが `NEXT_PUBLIC_BASE_PATH=/<repo名>` を自動で渡すので、手で設定する必要はない。
独自ドメインやユーザーページで配信する場合は空のままでよい。

ローカルで本番相当を確認する:

```bash
npm run build && npx serve out
```

## 音声

音声は `public/audio/{id}.mp3` に**事前生成してコミットしてある**。静的サイトには実行時の
合成が存在しないため、これは必須。

```bash
npm run audio:generate            # 未生成のものだけ作る
npm run audio:generate -- --force # すべて作り直す
npm run check:tts                 # 疎通と残枠の確認
```

| プロバイダ | 無料枠 | 品質 |
| --- | --- | --- |
| ElevenLabs (`eleven_multilingual_v2`) | 月 10,000 文字 | 最良。1章12問で約 1,000 文字 |
| OpenAI (`gpt-4o-mini-tts`) | **無し**（前払いクレジット制） | 良好 |

ElevenLabs のキーは https://elevenlabs.io のアカウントメニュー → API Keys から発行する
（無料プランはクレジットカード不要）。無料プランでハマりやすい点が2つある。

- **library voice を API から使えない**（402 `paid_plan_required`）。`scripts/tts.mjs` の
  `VOICES` は premade ボイスだけで構成してある。
  一覧: `curl -s "https://api.elevenlabs.io/v2/voices?page_size=100" -H "xi-api-key: $KEY"`
- キーに **IP 許可リスト**が設定されていると、回線が変わった時点で 403 `ip_not_allowed` に
  なる。制限を外すか、現在の公開 IP（`curl https://api.ipify.org`）を許可リストへ追加する。

## 章を追加する

1ヶ月あたり12問を1章として追加する。

1. `content/questions.ts` の `CHAPTERS` に章を、`QUESTIONS` に12問を追記する
2. `npm run audio:generate` で音声を作る（`public/audio/` にコミットする）
3. `npm run grade:test` で採点エンジンを通す。**解説の穴が報告されたら埋める**
4. `npm run content:build`
5. push すると自動でデプロイされる

音声が揃っていない章は `ready: false` となり、画面上では「準備中」として選べない。

## アクセス解析

Cloudflare Web Analytics を使う。Cookie も localStorage も使わず個人データを保存しないため、
同意バナーは不要。トークンが未設定なら計測スクリプトを一切読み込まない。

**生の IP アドレスは記録されない。** 静的サイトにはサーバーが無く、アプリ自身が訪問者の IP を
見ることはできない。Cloudflare 側も IP をそのまま保存せず、同一訪問者かどうかの判定に使うだけ。
「IP 別の閲覧数」として実際に得られるのは、重複を除いたユニーク訪問者数になる。

設定手順:

1. Cloudflare ダッシュボード → Analytics & Logs → Web Analytics → **Add a site**
   （DNS を Cloudflare に移す必要はない。JS ビーコン方式で使える）
2. ホスト名に `<user>.github.io` を入れ、発行されたサイトトークンを控える
3. リポジトリの Settings → Secrets and variables → Actions → **Variables** タブで
   `CF_BEACON_TOKEN` にトークンを設定する
4. 次のデプロイから計測が始まる

```bash
# コマンドで設定する場合
gh variable set CF_BEACON_TOKEN --body "<トークン>"
```

ホスト名は `<user>.github.io` 単位になるため、同じアカウントで他の GitHub Pages サイトを
公開していると合算される。ダッシュボードのパス絞り込みで `/EnglishLearning/` だけを見る。

ローカルで試す場合は `.env` に `NEXT_PUBLIC_CF_BEACON_TOKEN` を入れる。

## 長文読解（TOEIC Part 7 形式）

速読の訓練。本文を読み、4択に答え、かかった時間からランクを出す。**制限時間は設けない。**

### 設計の根拠

TOEIC Part 7 の実仕様に合わせてある。

```
Part 7 = 54問 / 54分  →  1問あたり60秒が基準ペース
単一文書10セット（各2〜4問）／二重2セット・三重3セット（各5問）
単一文書は約3分で解き切るのが目安
文書種別: メール・告知・広告・チャット・記事・スケジュール
```

### 速読ランク

実測の「1問あたり秒数」で判定する（`lib/reading.ts` の `rankFor`）。

| ランク | 1問あたり | 意味 |
| --- | --- | --- |
| S | 〜45秒 | 本番で見直しの時間まで残せる速さ |
| A | 〜60秒 | Part 7 を time up せずに解き切れる速さ |
| B | 〜75秒 | 終盤で数問を落とす。あと一歩 |
| C | 〜95秒 | Part 7 を解き切れない。読み返しが多い |
| D | 96秒〜 | 大幅に時間が足りない。一文ずつ訳している状態 |

セットごとに文書量と設問数から目標秒数を決めてあり、結果画面では目標との差も出す。

### 解説

設問ごとに次を持つ（`content/reading.ts`）。

- **設問タイプ** — 主旨 / 詳細 / 推測 / 語彙 / NOT / 意図
- **本文の根拠** — 答えの出どころとなる原文
- **解き方** — その設問タイプをどう処理するか（例: 意図問題は引用文の直前の so / because を見る）
- **選択肢ごとの解説** — 4つすべてに、なぜ違うのかを書く。正解の選択肢にも補足を書く

誤答の解説は「本文にない」で済ませず、**なぜその誤答が作られたのか**（上位プランの特典を全プランと取り違えさせる、east と west を入れ替える、二人のどちらの発言かをずらす等）まで書く。

### 正解の秘匿

本文・設問文・選択肢は読むために必要なので公開する。隠すのは**どれが正解か**と解説だけで、
`public/data/reading-enc/{id}.json` に暗号化して置き、採点ボタンを押した瞬間にだけ取得する。
`npm run content:build` は、公開側の `reading.json` に解説が混ざっていないかを毎回検査する
（本文の英語引用で誤検知しないよう、解説の日本語部分だけを照合する）。

### セットを追加する

`content/reading.ts` の `READING_SETS` に追記して `npm run content:build`。

## 進捗と再開

章カードに12問の升目を置き、**どの問題からでも入れる**。升目には直近の点数が出て、
点数で色分けされる（未解答は地の色のまま）。主ボタンは未解答の最初の問題を指し、
「第5問から続ける」のようにどこへ入るのかを表示する。

進捗は `localStorage`（`dictation-progress-v1`）に置く（`lib/progress.ts`）。端末ごとの
控えであって同期はしない。プライベートウィンドウなどでアクセス自体が例外を投げることが
あるため、読み書きは必ず try/catch で包んである。保存できなくても学習は続けられる。

章の終わりの「記録を消してもう一度始める」で、その章の記録だけを消せる。

## オフラインと解説のダウンロード

章の一覧に2つのボタンがある。

- **音声をダウンロードする** — その章の音声と問題データを端末のキャッシュへ入れる。
  サービスワーカー（`public/sw.js`）がアプリ本体も控えるため、電波が無くても練習できる。
  サービスワーカーは HTTPS か localhost でしか動かないので、LAN の IP に HTTP で
  繋いだ場合は保存が使えない（練習自体はできる）。
- **解説をダウンロードする** — その章の正解英文・日本語訳・全解説を1枚の HTML にまとめて
  書き出す。ブラウザで開けて印刷もできる。**正解を含むため、出題画面には置いていない。**

## 構成

```
content/questions.ts        ディクテーションの原本。アプリからは import しない
content/reading.ts          長文読解の原本。同上
lib/
  grade.ts                  ディクテーションの採点エンジン
  progress.ts               進捗の保存（localStorage）
  reading.ts                長文読解の採点と速読ランク判定
  crypto.ts                 正解データの難読化
scripts/
  build-content.mjs         public/data/ の生成と漏洩検査
  generate-audio.mjs        音声の事前生成
  tts.mjs                   ElevenLabs / OpenAI 呼び出し（ビルド時専用）
  grade-test.mjs            採点エンジンの総当たりテスト
public/
  audio/{id}.mp3            事前生成した問題音声（コミット対象）
  data/                     生成物。コミットしない
  sw.js                     オフライン配信
app/
  page.tsx                  モード切替・章選択・出題・結果
  Reading.tsx               長文読解の画面
test/grading-report.md      採点テストの結果（自動生成）
DESIGN.md                   デザイントークンと UI 方針
```

## 採点エンジン

完全一致ではなく、単語アライメントで採点する（`lib/server/grade.ts`）。

1. **短縮形の展開** — `gonna` → `going to`、`could've` → `could have`、`couldnt` → `could not`。
   アポストロフィの有無や崩れた綴りで減点しない。
2. **Needleman-Wunsch アライメント** — 正解語列とユーザー語列を対応付ける。
   脱落・挿入・置換を区別できる。
3. **音の近さ** — 綴りの編集距離と、簡易音素キー（母音を潰し `ph`→`f` などを正規化）の
   編集距離の大きい方を採用する。これにより `pulled` と `polled`、`meet` と `meat` を
   「惜しい（△）」として拾う。
4. **重み付きスコア** — 内容語を 1.8、機能語を 1.0 で重み付け。✓ は満点、△ は半分。

判定結果は次の形で返る。

| 判定 | 意味 |
| --- | --- |
| ✓ ok | 聞き取れている |
| △ near | 似た音として聞き取った／余分な語を挟んだ |
| ✗ miss | 聞き取れていない（脱落）または全く別の語 |

余分に書かれた語は隣接する正解語に反映される。`after work` を `after the work` と書いた場合、
`work` が △ になる。

### テスト

```bash
npm run grade:test          # 結果を test/grading-report.md に保存する
npm run grade:test -- --quiet
```

全問題について、同義とみなすべき入力（小文字化・句読点なし・アポストロフィ抜き・短縮形の
展開・フィラー混入）、**全語の1語脱落**、音の似た語への誤認識、余分な冠詞の挿入、無関係な文、
空入力を機械生成して検査する。検査項目は次の3つ。

1. 同義入力が満点になるか
2. 落とした語を検出できるか
3. **間違えたときに必ず解説が出るか**

3 は解説の穴を洗い出すためのもので、内容語を落としたのに専用の解説が無い場合に報告される。
章を追加したらこれを実行し、報告された語の解説を `content/questions.ts` に書き足す。

`I'd` が *I would* とも *I had* とも取れる、といった曖昧さは短縮形の展開に「どちらでも正解」
として持たせてある（`"i'd": ["i", "would|had"]`）。

実例:

```
入力: I was supposed to meet up my friends after the work, but my train got delayed...
=> 83/100
   I was supposed to meet up ✓
   with ✗（脱落） / a ✗（my と誤認識） / friend △（friends）/ work △（the が余分）
   聞き取りのポイント: "meet up with a", "after work"
```

## 再生速度

再生ボタンの下で ×0.75 / ×0.9 / 等速 を切り替えられる。`HTMLMediaElement.playbackRate` を
使うので音の高さは変わらない（`preservesPitch` の既定が `true`）。

速度を落としても連結や弱形は消えないので、遅くして音の輪郭を掴み、等速で確認する、という
往復に使う。選択は問題をまたいで保持される。

再生回数に上限は無い。納得するまで聞き込めることを優先しており、画面の「再生回数」は
何回聴いたかの記録として表示しているだけで、残量ではない。

## 難易度

Lv1（ゆっくり・短い）〜 Lv5（ネイティブ同士の会話に近い速さ）。難易度は問題ごとの属性で、
章の中に Lv2 から Lv5 までが混ざっている。章を進めるほど後半が難しくなる並びにしてある。

## 未実装（仕様書 13. の将来機能）

苦手な音の分析、間違えた問題だけの復習、米英切り替え、複数話者、
シャドーイング、発音判定。長文読解の進捗保存。いずれも現在はスコープ外。


