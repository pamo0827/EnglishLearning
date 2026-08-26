---
colors:
  primary: "#2f5fe0"
  on-primary: "#ffffff"
  secondary: "#eaeef7"
  on-secondary: "#2c3444"
  tertiary: "#0d7a5c"
  on-tertiary: "#ffffff"
  surface: "#ffffff"
  surface-raised: "#ffffff"
  surface-sunken: "#f4f6fa"
  on-surface: "#14171f"
  on-surface-muted: "#5b6474"
  outline: "#e0e5ef"
  success: "#0d7a5c"
  on-success: "#ffffff"
  warning: "#8a5600"
  on-warning: "#ffffff"
  danger: "#c02a26"
  on-danger: "#ffffff"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif"
    fontSize: "32px"
    fontWeight: 650
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.7"
    letterSpacing: "0"
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "0.08em"
  transcript:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "21px"
    fontWeight: 450
    lineHeight: "1.9"
    letterSpacing: "-0.005em"
  score:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: "1"
    letterSpacing: "-0.03em"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  full: "999px"
components:
  card:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.outline}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
    typography: "{typography.body}"
  play-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  answer-input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.outline}"
    rounded: "{rounded.md}"
    typography: "{typography.transcript}"
  speed-control:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.on-surface-muted}"
    borderColor: "{colors.outline}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  speed-control-active:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
  word-ok:
    textColor: "{colors.success}"
  word-near:
    textColor: "{colors.warning}"
  word-miss:
    textColor: "{colors.danger}"
---

# English Listening Trainer — DESIGN.md

## Overview

リスニング採点アプリのデザイン仕様。UI の役割はただひとつ、**答えを漏らさずに、耳へ集中させること**。
出題画面は情報を極端に削り、採点画面ではじめて情報量を解放する。この非対称性がこのプロダクトの
デザイン上の核であり、装飾はすべてそれに従属する。

白を基調にする。ライトのみで、ダークテーマは持たない。単一の見え方に決め切ることで、
2つのパレットを整合させる手間を省き、コントラストの検証を一度で終わらせている。

白地では地とカードが同じ色になるため、階層は境界線だけで表す。影は使わない。

## Colors

`surface` と `surface-raised` は同じ白で、両者は `outline` の境界線で区別する。
`surface-sunken` だけをわずかに灰へ落とし、入力欄に使う。入力欄が沈んで見えることで、
「ここに書き込む」というアフォーダンスが文字なしで伝わる。

**採点結果の3色は白地で読めることが絶対条件になる。** 暗い面で使っていた明るい緑・黄・赤は
白地ではコントラストが足りず、そのまま持ち越せない。`success` `warning` `danger` はいずれも
白地で 4.5:1 以上（実測 5.31 / 6.16 / 5.83）を満たす暗い値に置いてある。色を変えるときは
必ず測り直すこと。

`primary` は再生と採点、つまりフローを前に進める操作にのみ使う。同一画面に primary の
ボタンを2つ置かない。

採点結果の3値（`success` / `warning` / `danger`）は、聞き取れた・惜しい・聞き取れなかった、に
対応する。色だけに意味を載せず、必ず記号（✓ / △ / ✗）と併記する。

## Typography

`transcript` は、ユーザーの入力欄と採点結果の英文の両方に使う共通のスタイル。同じ文字サイズ・
同じ行間で並べることで、自分が書いた文と正解文を目で重ね合わせられる。ここを揃えないと
差分の把握コストが跳ね上がる。

`label` は大文字＋トラッキング広め。「第3問」「再生回数」などのメタ情報専用で、本文と混ざらない。

## Layout

単一カラム、最大幅 720px、中央寄せ。リスニング中に視線が横方向へ動く理由がないため。
垂直リズムは `spacing` スケールのみを使い、セクション間は `xl`、要素間は `md`。

## Elevation & Depth

影は使わず、`outline` の 1px ボーダーだけで階層を表す。白地に影を足すと、要素が浮いて
視線を奪い、聞き取りへの集中を削ぐ。

## Shapes

ボタンは `rounded.full`、カードと入力欄は `rounded.lg` / `rounded.md`。押せるものだけが
完全な丸を持つ、という一貫した規則にする。

## Components

再生ボタンは画面内で最大の**要素**にする。出題画面で最初に触るものが迷いなく分かることが最優先。

`button-primary` は全幅にしない。内容に合わせた幅に留め、`min-height` でタップ領域だけ
確保する。全幅の帯は、画面に1つしかなくても「ここが主役だ」と主張しすぎて、再生ボタンと
主導権を奪い合う。

**ボタンの文言は動詞で終える。** 「オフライン用に保存」「次の問題へ」のような名詞止め・
助詞止めと、「始める」のような動詞を混ぜない。並べたときに形が揃わず、押した結果が
何なのかも読み取りにくくなる。

目的語は文脈で自明なら省く。章カードの中のボタンは、カード自体がどの章かを示しているので
「この章を始める」ではなく「始める」でよい。対になる操作は語を対称にする
（「音声をダウンロードする」と「音声を削除する」）。

**似た操作が並ぶときは、動詞を揃えて目的語で区別する。** 章カードには端末へ保存する操作が
2つ並ぶ。「オフラインに保存する」と「解説をダウンロードする」のように動詞が違うと、
別種の操作に見えて何が違うのか読み取れない。「音声をダウンロードする」「解説を
ダウンロードする」と揃え、違いを目的語だけに担わせる。

似た操作はセクションにまとめる。章カードでは「始める」を単独で置き、端末へ保存する
2つは「オフラインでダウンロード」の見出しの下へ別行で分ける。主操作と副操作が
一列に並ぶと、どれを押せばいいのか一拍迷う。

主操作にはアイコンを添えてよい。「始める」の再生アイコンは、そのボタンが音声の練習へ
入ることを文字を読む前に伝える。副操作にはアイコンを付けない。付けると主副の差が消える。

**2種類のボタンは寸法を完全に共有する。** 文字サイズ・高さ・左右の余白・角の丸みを揃え、
違いは背景色と文字の太さだけにする。幅が内容依存になる以上、高さや文字サイズまで違うと
並べたときの不揃いが目に付く。ボタンを2つ以上置くときは必ず1つの行にまとめ、左端を
揃える。縦に積んで別々の幅で並べると、端がぎざぎざになる。

再生速度（×0.75 / ×0.9 / 等速）は再生ボタンの下に置く。速度は「どう聴くか」の設定であって
問題の内容に関する情報ではないため、出題画面に置いても答えの手がかりにはならない。ただし
視覚的重みは再生ボタンより明確に下げる（`surface-sunken` の地に `label` サイズの文字）。
最初に触るものが再生ボタンであることを、速度の選択肢が邪魔してはならない。

速度を落としても連結や弱形そのものは消えない。遅くして輪郭を掴み、等速で確認する、という
往復のための道具であり、等速を既定に置くのはそのため。

採点結果の英文は語単位で色分けする。`word-ok` / `word-near` / `word-miss` の3種のみで、
中間色を増やさない。増やすと読解が採点結果の解析作業になってしまう。

## Components（章）

章の一覧が入口になる。カードには題名・年月・問題数・説明と、開始ボタン、そして
オフライン保存と解説ダウンロードを置く。開始ボタンだけを `button-primary` にし、
残りは `button-secondary` に落とす。ここで最も起きてほしいのは「始める」ことだから。

音声が揃っていない章は選べない。中途半端に始められるより、準備中と分かるほうがよい。

## Components（見出しと章）

画面上部に出すのは「ディクテーション」の一語だけにする。ここは `typography.display` を使い、
画面で最も大きい文字にする。表示するものが一語しかないので、小さく置くと画面の上端が
中途半端に空いて見える。アプリ名・説明文・章の副題・年月は
いずれも練習の役に立たず、毎回同じものが目に入るだけの視覚ノイズになる。章は「第1章」の
ように番号だけで呼ぶ。

## Do's and Don'ts

- **Do** 出題画面の表示要素を、問題番号・再生ボタン・再生回数・再生速度・入力欄・採点ボタンの
  6つに限定する。ここに要素を足すときは「答えの手がかりにならないか」と「再生ボタンより
  目立たないか」の両方を満たすこと。
- **Do** 解説のダウンロードは章の一覧にだけ置く。中身は正解そのものなので、練習の動線上に
  現れてはならない。ボタンの近くに何が含まれるかを明記する。
- **Do** 採点後の情報開示は、スコア → 正解文 → 日本語訳 → 解説の順に上から並べる。
- **Don't** 出題画面に正解に関する視覚的手がかりを置かない。入力欄のプレースホルダに例文を
  書く、語数分の下線を引く、といったものも手がかりに含まれる。
- **Don't** 再生回数に上限を設けたり、回数が増えたことを警告する色（`danger`）で表示しない。
  回数は聞き込んだ量の記録であって、消費した資源ではない。
- **Don't** 遅い速度を「初心者向け」などと価値付けしない。ラベルは倍率の事実だけを示す。
- **Don't** 色だけで正誤を表現しない。
- **Don't** 画面に説明文を常設しない。一度読めば分かることを毎回表示しない。
- **Don't** ボタンを縦に積んで別々の幅で並べない。横一列にまとめるか、狭い画面では
  幅を揃えて積む。
- **Don't** ボタンの文言に名詞止めと動詞を混ぜない。すべて動詞で終える。
- **Do** 並ぶボタンが似た操作なら、動詞を揃えて目的語だけで区別する。
- **Do** 主操作と副操作は行を分ける。副操作が複数あるときは見出しを付けてまとめる。
