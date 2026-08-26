/**
 * 問題バンク（ビルド時専用の原本）。
 *
 * このファイルはアプリのコードから import してはならない。
 * scripts/build-content.mjs だけが読み、正解部分は暗号化して public/data/ へ書き出す。
 * 章は1ヶ月あたり12問。新しい章を足すときは CHAPTERS と QUESTIONS の両方に追記する。
 */

export type Question = {
  id: number;
  /** 所属する章。CHAPTERS の id と対応する */
  chapter: number;
  /** CEFR 相当 */
  level: string;
  /** 1〜5。難易度 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  transcript: string;
  translation: string;
  tags: string[];
  /** 採点後にのみ表示する「聞き取りのポイント」 */
  hints: { phrase: string; note: string }[];
  /** TTS の話速。1.0 が標準 */
  speed: number;
  /** TTS ボイス */
  voice: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
};

export type Chapter = {
  id: number;
  title: string;
  /** その章を追加した年月（YYYY-MM） */
  month: string;
  description: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "第1章　日常の予定と言い訳",
    month: "2026-08",
    description:
      "約束、遅刻、断り。日常会話で最も頻度が高い場面を、連結と弱形を含む自然な速さで。",
  },
  {
    id: 2,
    title: "第2章　言いよどみと本音",
    month: "2026-09",
    description:
      "はっきり言い切らない会話。前置き、ぼかし、言い直しが多く、音の省略も強くなる。",
  },
];

export const QUESTIONS: Question[] = [
  {
    id: 1,
    chapter: 1,
    level: "B1",
    difficulty: 3,
    transcript:
      "I was supposed to meet up with a friend after work, but my train got delayed.",
    translation:
      "仕事の後に友達と会う予定だったんだけど、電車が遅れちゃった。",
    tags: ["connected_speech", "past_tense", "conversation"],
    speed: 1.0,
    voice: "ash",
    hints: [
      {
        phrase: "supposed to",
        note: "自然な会話では supposed to が「サポーストゥ」とつながり、d の音がほぼ消えます。to も弱形の /tə/ になります。",
      },
      {
        phrase: "meet up with a",
        note: "meet up with a が一続きに「ミーラップウィザ」のように聞こえます。t が有声化（フラップ化）し、with a は連結します。",
      },
      {
        phrase: "after work",
        note: "the が入らない点に注意。after work は無冠詞で「仕事の後」を表す決まった言い方です。",
      },
      {
        phrase: "got delayed",
        note: "got の t が次の d に飲み込まれ「ガッディレイド」のように聞こえます。",
      },
      {
        phrase: "a friend",
        note: "a friend と単数。a は非常に弱く、friend の d は次の after に飲まれてほとんど聞こえません。",
      },
      {
        phrase: "my train got delayed",
        note: "train の tr は「チュ」に近い音になり「チュレイン」のように聞こえます。",
      },
    ],
  },
  {
    id: 2,
    chapter: 1,
    level: "B1",
    difficulty: 3,
    transcript:
      "I'm gonna grab a coffee first, and then I'll head over to the office.",
    translation:
      "先にコーヒーを買ってから、オフィスに向かうつもり。",
    tags: ["reduction", "gonna", "future", "conversation"],
    speed: 1.0,
    voice: "coral",
    hints: [
      {
        phrase: "gonna",
        note: "going to の短縮。「ガナ」とほぼ一音節で発音されます。",
      },
      {
        phrase: "grab a",
        note: "grab a が連結して「グラバ」。冠詞 a は非常に弱く、聞こえないこともあります。",
      },
      {
        phrase: "head over to",
        note: "head over が「ヘドウヴァ」と連結し、to は弱形 /tə/ になります。",
      },
      {
        phrase: "I'm gonna",
        note: "I'm が「アム」程度に縮み、gonna と合わせて「アムガナ」の一塊になります。",
      },
      {
        phrase: "coffee first",
        note: "first の st が次の and に飲まれ「ファース」で終わったように聞こえます。",
      },
      {
        phrase: "I'll head over",
        note: "I'll は「アル」程度。I だけに聞こえることがあります。",
      },
      {
        phrase: "the office",
        note: "母音の前なので the が /ði/ になり、office と連結して「ディオフィス」になります。",
      },
    ],
  },
  {
    id: 3,
    chapter: 1,
    level: "B2",
    difficulty: 3,
    transcript:
      "He said he'd call me back, but I haven't heard from him at all.",
    translation:
      "折り返し電話するって言ってたのに、彼から全然連絡がない。",
    tags: ["contraction", "connected_speech", "reported_speech"],
    speed: 1.0,
    voice: "ash",
    hints: [
      {
        phrase: "he'd",
        note: "he would の短縮。「ヒド」と一瞬で終わるため he だけに聞こえがちです。",
      },
      {
        phrase: "call me back",
        note: "call me の l が飲み込まれ、back の k が弱く破裂します。",
      },
      {
        phrase: "haven't heard",
        note: "haven't の t が脱落し、heard の h と混ざって「ハヴンハード」のように聞こえます。",
      },
      {
        phrase: "at all",
        note: "at all は連結＋フラップ化で「アトール／アロール」のように聞こえます。",
      },
      {
        phrase: "he said he'd",
        note: "said he'd の h が脱落し「セディド」と一続きになります。",
      },
      {
        phrase: "heard from him",
        note: "from が弱形 /frəm/ に、him の h も脱落して「フロミム」のように潰れます。",
      },
    ],
  },
  {
    id: 4,
    chapter: 1,
    level: "B2",
    difficulty: 4,
    transcript:
      "I kinda wanted to stay home, but she'd already booked the tickets.",
    translation:
      "本当は家にいたかったんだけど、彼女がもうチケットを取っちゃってて。",
    tags: ["reduction", "kinda", "past_perfect", "connected_speech"],
    speed: 1.05,
    voice: "sage",
    hints: [
      {
        phrase: "kinda",
        note: "kind of の短縮。「カインダ」。d の音は非常に弱いです。",
      },
      {
        phrase: "wanted to",
        note: "wanted to が「ワニッドゥ」のように、n の後の t が脱落します。",
      },
      {
        phrase: "she'd already",
        note: "she had の短縮 + already の連結で「シダーレディ」。had は音として残りません。",
      },
      {
        phrase: "stay home",
        note: "home は副詞扱いで、at や the が付きません。stay at home より口語的です。",
      },
      {
        phrase: "booked the tickets",
        note: "booked の ed は /t/ と読み、the と連結して「ブックタ」になります。tickets の t はフラップ化します。",
      },
    ],
  },
  {
    id: 5,
    chapter: 1,
    level: "B2",
    difficulty: 4,
    transcript:
      "You could've told me earlier — I would've changed my plans.",
    translation:
      "もっと早く言ってくれればよかったのに。そしたら予定を変えたよ。",
    tags: ["could_have", "reduction", "counterfactual"],
    speed: 1.05,
    voice: "verse",
    hints: [
      {
        phrase: "could've",
        note: "could have の短縮。「クダヴ」または「クダ」。of と誤解されやすい代表例です。",
      },
      {
        phrase: "would've",
        note: "同様に would have が「ウダヴ」。have は決して強く発音されません。",
      },
      {
        phrase: "told me",
        note: "told me の d が m に同化して「トウルミー」に聞こえます。",
      },
      {
        phrase: "earlier",
        note: "earlier の l は舌先が付かない暗い l で、「アーリア」のように母音的に聞こえます。",
      },
      {
        phrase: "changed my plans",
        note: "changed の d が次の m に飲まれ「チェインジマイ」になります。",
      },
    ],
  },
  {
    id: 6,
    chapter: 1,
    level: "A2",
    difficulty: 2,
    transcript: "Sorry, I didn't catch that. Could you say it again?",
    translation: "ごめん、聞き取れなかった。もう一度言ってもらえる？",
    tags: ["conversation", "polite_request"],
    speed: 0.95,
    voice: "shimmer",
    hints: [
      {
        phrase: "didn't catch",
        note: "didn't の t が脱落し「ディドゥンキャッチ」のようになります。",
      },
      {
        phrase: "say it again",
        note: "say it again が連結して「セイイタゲン」のように聞こえます。",
      },
      {
        phrase: "Sorry",
        note: "米語の sorry は「サーリ」に近く、英語圏でも「ソーリー」とは聞こえません。",
      },
    ],
  },
  {
    id: 7,
    chapter: 1,
    level: "A2",
    difficulty: 1,
    transcript: "I'll be there in about ten minutes.",
    translation: "あと10分くらいで着くよ。",
    tags: ["contraction", "time"],
    speed: 0.9,
    voice: "shimmer",
    hints: [
      {
        phrase: "I'll",
        note: "I will の短縮。「アイル」と一瞬で終わるため I に聞こえることがあります。",
      },
      {
        phrase: "in about",
        note: "in about が連結して「イナバウト」になります。",
      },
      {
        phrase: "ten minutes",
        note: "ten の n が次の m に同化して「テミニッツ」のようになります。",
      },
    ],
  },
  {
    id: 8,
    chapter: 1,
    level: "B1",
    difficulty: 3,
    transcript:
      "It's not that I don't wanna go, it's just that I'm exhausted.",
    translation:
      "行きたくないってわけじゃなくて、ただものすごく疲れてるだけなんだ。",
    tags: ["wanna", "cleft", "conversation"],
    speed: 1.0,
    voice: "coral",
    hints: [
      {
        phrase: "it's not that",
        note: "It's not that ... it's just that ... は会話の定型。that は弱形で「ダッ」程度にしか聞こえません。",
      },
      {
        phrase: "wanna",
        note: "want to の短縮。「ワナ」。",
      },
      {
        phrase: "exhausted",
        note: "先頭の ex は /ɪɡz/ と濁ります。「イグゾースティド」。",
      },
      {
        phrase: "I don't wanna go",
        note: "don't の t が脱落し、I don't wanna が「アイドンワナ」と一息で流れます。",
      },
      {
        phrase: "I'm exhausted",
        note: "I'm が「アム」に縮み、exhausted と連結して一息で流れます。",
      },
    ],
  },
  {
    id: 9,
    chapter: 1,
    level: "C1",
    difficulty: 5,
    transcript:
      "I dunno, he kept going on about it, and I just sorta tuned him out after a while.",
    translation:
      "どうかな、彼がその話をずっと続けるもんだから、途中からなんとなく聞き流しちゃった。",
    tags: ["slang", "phrasal_verb", "reduction", "fast_speech"],
    speed: 1.12,
    voice: "verse",
    hints: [
      {
        phrase: "dunno",
        note: "I don't know の崩れた形。「ダノウ」。",
      },
      {
        phrase: "kept going on about it",
        note: "going on about it が全部つながり「ゴウィノナバウティッ」のように一塊に聞こえます。",
      },
      {
        phrase: "sorta",
        note: "sort of の短縮。「ソータ」。",
      },
      {
        phrase: "tuned him out",
        note: "him の h が脱落し tuned him が「テューンディム」に。tune out は「聞き流す」。",
      },
      {
        phrase: "after a while",
        note: "after a while が全部連結して「アフタラワイル」になります。「しばらくして」の意味です。",
      },
    ],
  },
  {
    id: 10,
    chapter: 1,
    level: "C1",
    difficulty: 5,
    transcript:
      "We were gonna split the bill, but he insisted on paying for the whole thing.",
    translation:
      "割り勘にするつもりだったんだけど、彼が全部払うって言い張ってさ。",
    tags: ["gonna", "connected_speech", "fast_speech", "conversation"],
    speed: 1.12,
    voice: "ash",
    hints: [
      {
        phrase: "we were gonna",
        note: "were が弱形 /wər/ になり、we were gonna が「ウィワガナ」と一息で流れます。",
      },
      {
        phrase: "insisted on",
        note: "insisted on が連結し、d がフラップ化して「インシスティドン」になります。",
      },
      {
        phrase: "the whole thing",
        note: "whole の h と thing の th が続き、口の中で音が潰れやすい箇所です。",
      },
      {
        phrase: "split the bill",
        note: "split the の t が th に飲まれます。split the bill で「割り勘にする」。",
      },
      {
        phrase: "paying for",
        note: "paying for が連結して「ペイインフォ」。for は弱形 /fər/ です。",
      },
    ],
  },
  {
    id: 11,
    chapter: 1,
    level: "B2",
    difficulty: 4,
    transcript:
      "I got pulled into a last-minute meeting, so I couldn't make it.",
    translation:
      "急な会議に引っ張り込まれちゃって、行けなかったんだ。",
    tags: ["connected_speech", "passive", "conversation"],
    speed: 1.05,
    voice: "sage",
    hints: [
      {
        phrase: "got pulled into",
        note: "got pulled into は単語同士が強く連結し「ガップルディントゥ」のように聞こえます。pulled が polled と誤認識されやすい箇所です。",
      },
      {
        phrase: "couldn't make it",
        note: "couldn't の t が脱落し、make it が連結して「クドゥンメイキッ」になります。",
      },
      {
        phrase: "a last-minute meeting",
        note: "last-minute の t が次の m に飲まれ「ラスミニッ」になります。「直前の」という意味の形容詞です。",
      },
    ],
  },
  {
    id: 12,
    chapter: 1,
    level: "B1",
    difficulty: 3,
    transcript:
      "Let me know if anything changes, and I'll figure something out.",
    translation:
      "何か変わったら教えて。こっちで何とかするから。",
    tags: ["connected_speech", "phrasal_verb", "conversation"],
    speed: 1.0,
    voice: "coral",
    hints: [
      {
        phrase: "let me know",
        note: "let の t が脱落し「レミノウ」になります。",
      },
      {
        phrase: "figure something out",
        note: "something out が連結して「サムシンナウト」。figure out の間に目的語が挟まる形です。",
      },
      {
        phrase: "if anything changes",
        note: "if anything が連結して「イファニシン」。changes の語尾 -es は /ɪz/ です。",
      },
      {
        phrase: "I'll figure",
        note: "I'll は「アル」程度にしか聞こえず、I と区別が付きにくい箇所です。",
      },
    ],
  },
  // ---------------- 第2章 ----------------
  {
    id: 13,
    chapter: 2,
    level: "A2",
    difficulty: 2,
    transcript: "Hang on, let me check my calendar real quick.",
    translation: "ちょっと待って、カレンダーだけ見てみる。",
    tags: ["conversation", "reduction", "phrasal_verb"],
    speed: 0.95,
    voice: "coral",
    hints: [
      {
        phrase: "hang on",
        note: "hang on が連結して「ハンゴン」。「電話を切らずに待つ」ではなく単に「ちょっと待って」の意味です。",
      },
      {
        phrase: "let me",
        note: "let の t が脱落して「レミ」になります。lemme と書かれることもあります。",
      },
      {
        phrase: "real quick",
        note: "really ではなく real。「ちょっとだけ」を表す会話専用の言い方で、文法的には崩れた形です。",
      },
      {
        phrase: "check my calendar",
        note: "check my の k が m に飲まれます。calendar は最初の音節を強く読みます。",
      },
    ],
  },
  {
    id: 14,
    chapter: 2,
    level: "B1",
    difficulty: 2,
    transcript: "I'm not really into horror movies, to be honest.",
    translation: "正直、ホラー映画はあんまり得意じゃないんだ。",
    tags: ["conversation", "preference", "hedging"],
    speed: 0.95,
    voice: "shimmer",
    hints: [
      {
        phrase: "not really into",
        note: "not really into で「あまり好きではない」。into の t がフラップ化し「ノッリァリイヌ」のように流れます。",
      },
      {
        phrase: "to be honest",
        note: "文末に付く定型句。速く弱く発音され「トゥビアネス」程度にしか聞こえません。",
      },
      {
        phrase: "horror movies",
        note: "horror の最初の r と2つ目の r が続くため「ハラー」と潰れ、movies と連結します。",
      },
      {
        phrase: "I'm not really",
        note: "I'm not が「アムナッ」と潰れ、really と続けて一息になります。",
      },
    ],
  },
  {
    id: 15,
    chapter: 2,
    level: "B1",
    difficulty: 3,
    transcript: "We ended up staying way longer than we planned.",
    translation: "結局、予定よりずっと長く居ることになっちゃった。",
    tags: ["phrasal_verb", "connected_speech", "past_tense"],
    speed: 1.0,
    voice: "ash",
    hints: [
      {
        phrase: "ended up",
        note: "ended up が連結し、d がフラップ化して「エンディダップ」になります。end up ~ing で「結局〜することになる」。",
      },
      {
        phrase: "way longer",
        note: "way は比較級を強める副詞で「ずっと」。very とは違い比較級にしか付きません。",
      },
      {
        phrase: "than we",
        note: "than が弱形 /ðən/ になり、than we が「ダヌィ」のように潰れます。",
      },
      {
        phrase: "staying way longer",
        note: "staying の g は鼻音だけで、way と連結して「ステイインウェイ」と流れます。",
      },
      {
        phrase: "planned",
        note: "planned の ed は /d/。語尾は次に何も続かないため、ほとんど破裂しません。",
      },
    ],
  },
  {
    id: 16,
    chapter: 2,
    level: "B1",
    difficulty: 3,
    transcript: "Do you wanna split it, or should I just get this one?",
    translation: "割り勘にする？　それとも今回は私が出そうか？",
    tags: ["wanna", "conversation", "question"],
    speed: 1.0,
    voice: "sage",
    hints: [
      {
        phrase: "do you wanna",
        note: "Do you が「ドゥユ」から「ヂュ」まで縮み、wanna と合わせて「ヂュワナ」の一塊になります。",
      },
      {
        phrase: "split it",
        note: "split it が連結し t がフラップ化して「スプリリッ」。split で「割り勘にする」。",
      },
      {
        phrase: "get this one",
        note: "get this の t が th に飲まれます。get で「（勘定を）持つ」という意味になります。",
      },
    ],
  },
  {
    id: 17,
    chapter: 2,
    level: "B2",
    difficulty: 3,
    transcript: "It's been ages since we last caught up.",
    translation: "最後に会って話してから、ずいぶん経つね。",
    tags: ["present_perfect", "phrasal_verb", "conversation"],
    speed: 1.0,
    voice: "coral",
    hints: [
      {
        phrase: "it's been ages",
        note: "been ages が連結して「ビネイジズ」。ages は「長い間」で、実際の年数とは関係ありません。",
      },
      {
        phrase: "since we last",
        note: "since we last が一息で流れ、last の t が次の c に飲まれます。",
      },
      {
        phrase: "caught up",
        note: "caught up が連結して「コーラップ」。catch up で「近況を話す」。",
      },
    ],
  },
  {
    id: 18,
    chapter: 2,
    level: "B2",
    difficulty: 3,
    transcript: "I'll text you the address once I figure out where it is.",
    translation: "場所が分かったら住所を送るね。",
    tags: ["contraction", "phrasal_verb", "conditional"],
    speed: 1.0,
    voice: "echo",
    hints: [
      {
        phrase: "I'll text you",
        note: "I'll が「アル」程度に縮み、text you が「テクスチュ」と同化します。",
      },
      {
        phrase: "once I",
        note: "once I が連結して「ワンサイ」。ここでの once は「〜したらすぐ」で when に近い意味です。",
      },
      {
        phrase: "figure out where it is",
        note: "where it is が連結して「ウェアリティズ」。間接疑問なので語順が is where にならない点に注意。",
      },
      {
        phrase: "the address",
        note: "米語では address の強勢が後ろに来ることが多く「アドレス」ではなく「アドゥレス」と聞こえます。",
      },
    ],
  },
  {
    id: 19,
    chapter: 2,
    level: "B2",
    difficulty: 4,
    transcript: "He's been kinda distant lately, but I don't wanna make a big deal out of it.",
    translation: "彼、最近ちょっとよそよそしいんだけど、大げさにはしたくないんだよね。",
    tags: ["kinda", "wanna", "idiom", "present_perfect"],
    speed: 1.05,
    voice: "verse",
    hints: [
      {
        phrase: "he's been kinda",
        note: "He's been が「ヒズビン」と潰れ、kinda と合わせて一息で流れます。",
      },
      {
        phrase: "don't wanna",
        note: "don't の t が脱落し、wanna と繋がって「ドンワナ」になります。",
      },
      {
        phrase: "make a big deal out of it",
        note: "out of it が全部連結して「アウロヴィッ」。make a big deal out of ~ で「〜を大ごとにする」。",
      },
      {
        phrase: "distant lately",
        note: "distant の t が脱落して「ディスン」になり、lately と続けて一息で流れます。",
      },
    ],
  },
  {
    id: 20,
    chapter: 2,
    level: "B2",
    difficulty: 4,
    transcript: "I would've come, but I had to cover someone's shift at the last minute.",
    translation: "行きたかったんだけど、直前に誰かのシフトに入らなきゃいけなくて。",
    tags: ["would_have", "reduction", "counterfactual"],
    speed: 1.05,
    voice: "ballad",
    hints: [
      {
        phrase: "would've",
        note: "would have の短縮で「ウダヴ」。of と聞き間違えやすい代表例です。",
      },
      {
        phrase: "had to",
        note: "had to の d が t に同化して「ハットゥ」になります。",
      },
      {
        phrase: "at the last minute",
        note: "at the が「アッダ」に潰れます。「直前になって」という決まった言い方です。",
      },
      {
        phrase: "cover someone's shift",
        note: "cover someone's が連結して「カヴァサムワンズ」。cover a shift で「シフトを代わりに入る」。",
      },
      {
        phrase: "I would've come",
        note: "come の語尾 m が次の but に繋がり、would've come が一塊に聞こえます。",
      },
    ],
  },
  {
    id: 21,
    chapter: 2,
    level: "C1",
    difficulty: 4,
    transcript: "Turns out I'd been looking at the wrong file the whole time.",
    translation: "結局、ずっと違うファイルを見てたってことが分かってさ。",
    tags: ["past_perfect", "connected_speech", "conversation"],
    speed: 1.08,
    voice: "ash",
    hints: [
      {
        phrase: "turns out",
        note: "文頭の It turns out that の It と that が丸ごと省略された形。「ターンザウト」と連結します。",
      },
      {
        phrase: "I'd been",
        note: "I had been の短縮。「アイドビン」と一瞬で終わり、had は音として残りません。",
      },
      {
        phrase: "looking at the",
        note: "looking at the が「ルッキンアッダ」と一続きになります。",
      },
      {
        phrase: "the wrong file",
        note: "wrong の w は発音しません。「ロング」であって「ウロング」ではありません。",
      },
      {
        phrase: "the whole time",
        note: "whole の h は発音され、the と合わせて「ダホウル」。the whole time で「その間ずっと」。",
      },
    ],
  },
  {
    id: 22,
    chapter: 2,
    level: "C1",
    difficulty: 5,
    transcript: "I mean, it's not like I haven't tried, y'know? It just never really clicked.",
    translation: "いや、やってみなかったわけじゃないんだよ。ただ、しっくりこなかっただけで。",
    tags: ["filler", "slang", "fast_speech", "hedging"],
    speed: 1.12,
    voice: "sage",
    hints: [
      {
        phrase: "I mean",
        note: "文頭の言い直しの合図。ほぼ「アミーン」の一塊で、意味は薄いです。",
      },
      {
        phrase: "it's not like",
        note: "It's not like ~ で「〜というわけじゃない」。like の後に節が続きます。",
      },
      {
        phrase: "y'know",
        note: "you know の崩れた形。「ヤノウ」と一瞬で終わり、同意を求める合図です。",
      },
      {
        phrase: "clicked",
        note: "click は「しっくりくる」「腑に落ちる」。物理的な音の意味ではありません。",
      },
      {
        phrase: "haven't tried",
        note: "haven't の t が脱落し、tried と続けて「ハヴントライド」と一息になります。",
      },
      {
        phrase: "never really",
        note: "never really の r が続き、「ネヴァリァリ」と潰れます。",
      },
    ],
  },
  {
    id: 23,
    chapter: 2,
    level: "C1",
    difficulty: 5,
    transcript: "She was gonna tell him, but then she figured it wasn't worth the hassle.",
    translation: "彼女は言うつもりだったんだけど、面倒に見合わないと思ったみたい。",
    tags: ["gonna", "reported_speech", "fast_speech"],
    speed: 1.12,
    voice: "shimmer",
    hints: [
      {
        phrase: "was gonna",
        note: "was が弱形になり was gonna が「ワズガナ」と一息で流れます。",
      },
      {
        phrase: "tell him",
        note: "him の h が脱落し、tell him が「テリム」になります。",
      },
      {
        phrase: "figured",
        note: "ここでの figure は「〜だと判断する」。thought に近い意味で会話で多用されます。",
      },
      {
        phrase: "worth the hassle",
        note: "worth the が「ワーザ」に潰れます。hassle は「面倒」。",
      },
      {
        phrase: "wasn't worth",
        note: "wasn't の t が次の w に飲まれ「ワズンワース」になります。",
      },
    ],
  },
  {
    id: 24,
    chapter: 2,
    level: "C1",
    difficulty: 5,
    transcript: "Honestly, I couldn't tell you off the top of my head — lemme look it up.",
    translation: "正直、パッとは答えられないな。ちょっと調べさせて。",
    tags: ["idiom", "lemme", "fast_speech", "phrasal_verb"],
    speed: 1.1,
    voice: "echo",
    hints: [
      {
        phrase: "couldn't tell you",
        note: "couldn't の t が脱落し、tell you が「テリュ」と同化します。ここでは「分からない」を丁寧に言う形です。",
      },
      {
        phrase: "off the top of my head",
        note: "全体が一塊で「オフダタッパマイヘッド」。「すぐには／うろ覚えで」という決まった言い方です。",
      },
      {
        phrase: "lemme",
        note: "let me の崩れた形。「レミ」。",
      },
      {
        phrase: "look it up",
        note: "look it up が連結して「ルッキラップ」。it が間に挟まる語順に注意。",
      },
      {
        phrase: "Honestly",
        note: "先頭の h は発音しません。「アネストリ」と聞こえます。",
      },
    ],
  },
];

export function getQuestion(id: number): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function questionsInChapter(chapterId: number): Question[] {
  return QUESTIONS.filter((q) => q.chapter === chapterId);
}
