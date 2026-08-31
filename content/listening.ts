/**
 * 長文リスニング（TOEIC Part 3 / Part 4 形式）の問題バンク。ビルド時専用の原本。
 *
 * このファイルはアプリのコードから import してはならない。
 * 設問文と選択肢は公開データへ、台本・正解・解説は暗号化して書き出す。
 *
 * 【Part 3 / 4 の実仕様（設計の根拠）】
 *   Part 3 会話  = 13本 × 3問（2〜3人の話者）
 *   Part 4 説明文 = 10本 × 3問（1人の話者）
 *   設問と選択肢は印刷されており、音声を聞きながら読める
 * 本アプリでは繰り返し再生を許す。本番は一度きりだが、練習では聞き直しが要るため。
 */

export type ListeningVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse";

export type ListeningLine = {
  /** 話者の表示名。台本を出すときに使う */
  speaker: string;
  voice: ListeningVoice;
  text: string;
  /** 台本の日本語訳。採点後にのみ表示する */
  ja: string;
};

export type ListeningQuestion = {
  stem: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  type: "場面" | "詳細" | "推測" | "意図" | "次の行動";
  /** 台本中の根拠 */
  evidence: string;
  why: string;
  choiceNotes: [string, string, string, string];
};

export type ListeningSet = {
  id: number;
  chapter: number;
  /** 3 = 会話、4 = 説明文 */
  part: 3 | 4;
  /** 場面。一覧では出さず、採点画面の見出しに使う */
  scene: string;
  title: string;
  lines: ListeningLine[];
  questions: ListeningQuestion[];
  /** 話す速さ。1.0 が標準 */
  speed: number;
};

export type ListeningChapter = { id: number; title: string };

export const LISTENING_CHAPTERS: ListeningChapter[] = [{ id: 1, title: "第1章" }];

export const LISTENING_SETS: ListeningSet[] = [
  {
    id: 1,
    chapter: 1,
    part: 3,
    scene: "オフィス（予定の変更）",
    title: "会話・予定の変更",
    speed: 1.0,
    lines: [
      {
        speaker: "W",
        voice: "coral",
        text: "Marcus, did you see the message from Delaney Foods? They want to move Thursday's site visit.",
        ja: "マーカス、デラニー・フーズからの連絡見た？　木曜の現地訪問を動かしたいって。",
      },
      {
        speaker: "M",
        voice: "ash",
        text: "I saw it come in but I haven't opened it yet. Did they say why?",
        ja: "届いたのは見たけど、まだ開いてない。理由は言ってた？",
      },
      {
        speaker: "W",
        voice: "coral",
        text: "Their plant manager is out sick, and he's the one who was going to walk us through the line. They suggested the following Tuesday.",
        ja: "工場長が病欠で、その人がラインを案内してくれる予定だったの。翌週の火曜を提案してきてる。",
      },
      {
        speaker: "M",
        voice: "ash",
        text: "Tuesday's tight. I'm presenting the quarterly numbers that morning. Could we do the afternoon?",
        ja: "火曜はきついな。その日の午前は四半期の数字を発表するんだ。午後にできないかな。",
      },
      {
        speaker: "W",
        voice: "coral",
        text: "I'll ask. Actually, let me call rather than email — they've been slow to reply this week.",
        ja: "聞いてみる。というか、メールじゃなくて電話するね。今週は返事が遅いから。",
      },
    ],
    questions: [
      {
        stem: "Why does the woman contact the man?",
        choices: [
          "To report a problem with a shipment",
          "To discuss a change to a scheduled visit",
          "To ask him to prepare a presentation",
          "To introduce a new plant manager",
        ],
        answer: 1,
        type: "場面",
        evidence: "They want to move Thursday's site visit.",
        why:
          "会話の目的は最初の1〜2発言で示されます。Part 3 の第1問は「なぜ電話／会話をしているのか」を問うことが多く、冒頭に集中して聞くのが定石です。",
        choiceNotes: [
          "配送の問題は出てきません。話題は訪問日程です。",
          "正解。move a visit で「訪問を別の日に動かす」。",
          "四半期の発表は男性の既存の予定として出てくるだけで、女性が依頼したのではありません。会話の一部を目的と取り違えさせる誤答です。",
          "工場長は病欠として言及されるだけで、新任ではありません。",
        ],
      },
      {
        stem: "What problem does the man mention?",
        choices: [
          "He will be away on Tuesday.",
          "He has a conflict on Tuesday morning.",
          "He has not received the message.",
          "He is unfamiliar with the production line.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "Tuesday's tight. I'm presenting the quarterly numbers that morning.",
        why:
          "問題点は but / actually / tight のような語の後ろに来ます。tight は「予定が詰まっている」で、Part 3 で頻出の口語表現です。",
        choiceNotes: [
          "不在ではなく、午前に別の予定があるだけです。午後は空いています。",
          "正解。",
          "I saw it come in と述べており、届いていることは認識しています。「まだ開いていない」だけで、受け取っていないのとは違います。",
          "ラインの案内は工場長の役割で、男性の知識不足は話題になっていません。",
        ],
      },
      {
        stem: "What will the woman most likely do next?",
        choices: [
          "Send an e-mail to the client",
          "Telephone the client",
          "Reschedule the man's presentation",
          "Visit the plant herself",
        ],
        answer: 1,
        type: "次の行動",
        evidence:
          "let me call rather than email — they've been slow to reply this week",
        why:
          "「次に何をするか」は最後の発言で決まります。ここでは rather than が決め手で、選ばれたのは call のほうです。A rather than B は「B ではなく A」で、後ろにあるほうが否定される点に注意。",
        choiceNotes: [
          "rather than email と、明確に否定された選択肢です。聞こえた語をそのまま選ばせる典型的な誤答です。",
          "正解。",
          "発表の日程変更は話に出ていません。",
          "訪問は日程調整中で、単独訪問の話はありません。",
        ],
      },
    ],
  },

  {
    id: 2,
    chapter: 1,
    part: 3,
    scene: "店舗（注文の不備）",
    title: "会話・注文の不備",
    speed: 1.0,
    lines: [
      {
        speaker: "M",
        voice: "echo",
        text: "Hi, I ordered a set of shelving units for pickup, but the confirmation says only two of the four are ready.",
        ja: "すみません、棚のセットを店頭受け取りで注文したんですが、確認メールだと4つのうち2つしか用意できてないようで。",
      },
      {
        speaker: "W",
        voice: "shimmer",
        text: "Let me look that up. Can I have the order number?",
        ja: "お調べします。注文番号をいただけますか。",
      },
      {
        speaker: "M",
        voice: "echo",
        text: "It's 5-1-4-0-8. I'm supposed to install these on Saturday, so splitting the pickup doesn't really work for me.",
        ja: "51408 です。土曜に取り付ける予定なので、受け取りが分かれると困るんです。",
      },
      {
        speaker: "W",
        voice: "shimmer",
        text: "I see the issue. The other two are at our Riverside branch. I can have them transferred here by Friday morning, or you could pick those up directly today.",
        ja: "分かりました。残り2つはリバーサイド店にあります。金曜の朝までにこちらへ取り寄せるか、今日そちらで直接お受け取りいただけます。",
      },
      {
        speaker: "M",
        voice: "echo",
        text: "Friday works. I'd rather not make two trips.",
        ja: "金曜で大丈夫です。二度も足を運びたくないので。",
      },
    ],
    questions: [
      {
        stem: "What is the man's problem?",
        choices: [
          "He was charged the wrong amount.",
          "Part of his order is not available.",
          "He cannot locate his order number.",
          "A delivery arrived damaged.",
        ],
        answer: 1,
        type: "場面",
        evidence: "the confirmation says only two of the four are ready",
        why:
          "問題は冒頭の but の後ろにあります。only two of the four のように数量で示される形は Part 3 で頻出です。",
        choiceNotes: [
          "金額の話は出てきません。",
          "正解。",
          "注文番号はすぐに答えています（51408）。",
          "破損ではなく、そもそも一部が用意できていません。",
        ],
      },
      {
        stem: "What does the woman offer to do?",
        choices: [
          "Refund part of the purchase",
          "Deliver the items to the man's home",
          "Move the remaining items to her store",
          "Cancel the order at no charge",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "I can have them transferred here by Friday morning, or you could pick those up directly today.",
        why:
          "or で2つの案が示される形は Part 3 の定番です。両方を聞き取り、最後にどちらが選ばれるかまで追うこと。transfer が選択肢では move に言い換えられています。",
        choiceNotes: [
          "返金の申し出はありません。",
          "配送ではなく店頭受け取りの話です。pick up が繰り返されています。",
          "正解。",
          "取り消しの話はありません。",
        ],
      },
      {
        stem: "Why does the man say, \"I'd rather not make two trips\"?",
        choices: [
          "To explain why he chose the later option",
          "To complain about the store's location",
          "To ask for a delivery service",
          "To request a discount for the inconvenience",
        ],
        answer: 0,
        type: "意図",
        evidence: "Friday works. I'd rather not make two trips.",
        why:
          "意図問題は引用文の**直前**を見ます。Friday works で選択を述べ、その理由として二度手間を避けたいと言っています。引用文だけを見ても答えは出ません。",
        choiceNotes: [
          "正解。",
          "店の場所への不満ではありません。移動回数の話です。",
          "配送を求めてはいません。金曜の店頭受け取りを選んでいます。",
          "割引は求めていません。",
        ],
      },
    ],
  },

  {
    id: 3,
    chapter: 1,
    part: 3,
    scene: "社内（3人での打ち合わせ）",
    title: "会話・3人の打ち合わせ",
    speed: 1.05,
    lines: [
      {
        speaker: "W",
        voice: "sage",
        text: "So we've got twenty-two people signed up for the software training. That's more than the room holds.",
        ja: "ソフトウェア研修に22人が申し込んだの。あの部屋の定員を超えてる。",
      },
      {
        speaker: "M1",
        voice: "verse",
        text: "The training room seats sixteen. We could run it twice, but that's two afternoons out of my week.",
        ja: "研修室は16人だ。2回に分けてもいいけど、それだと午後が2回つぶれる。",
      },
      {
        speaker: "M2",
        voice: "ballad",
        text: "What about the conference room on five? It holds thirty, and it's free most of next week.",
        ja: "5階の会議室はどう？　30人入るし、来週はほとんど空いてる。",
      },
      {
        speaker: "W",
        voice: "sage",
        text: "That's a thought. Does it have the projector setup we need?",
        ja: "それはいいわね。必要なプロジェクターの設備はある？",
      },
      {
        speaker: "M2",
        voice: "ballad",
        text: "It does, but the sound system is unreliable. If you're playing video, I'd bring a portable speaker.",
        ja: "あるよ。ただ音響が不安定でね。動画を流すなら、持ち運びのスピーカーを用意したほうがいい。",
      },
      {
        speaker: "M1",
        voice: "verse",
        text: "There's video in the second half. I'll grab one from the supply closet.",
        ja: "後半に動画がある。備品室から持ってくるよ。",
      },
    ],
    questions: [
      {
        stem: "What are the speakers mainly discussing?",
        choices: [
          "Where to hold a training session",
          "Which software to purchase",
          "How to reduce the number of attendees",
          "When to schedule a video recording",
        ],
        answer: 0,
        type: "場面",
        evidence:
          "That's more than the room holds. / What about the conference room on five?",
        why:
          "3人の会話では、話題が最初の2発言で定まり、その後は解決策の検討に移ります。全員の発言が同じ問題（場所）に向いていることを掴めば決まります。",
        choiceNotes: [
          "正解。",
          "ソフトウェアは研修の題材で、購入の話ではありません。",
          "参加者を減らす案は出ていません。より広い部屋を探しています。",
          "動画は研修中に流すもので、撮影の話ではありません。",
        ],
      },
      {
        stem: "What problem does one of the men mention about the conference room?",
        choices: [
          "It is too small for the group.",
          "It is booked for most of next week.",
          "Its sound system does not work reliably.",
          "It lacks a projector.",
        ],
        answer: 2,
        type: "詳細",
        evidence: "It does, but the sound system is unreliable.",
        why:
          "肯定してから but で欠点を出す形は頻出です。It does（プロジェクターはある）に安心して but の後ろを聞き逃さないこと。",
        choiceNotes: [
          "30人収容で、22人には十分です。16人なのは研修室のほうです。数字の入れ替えを狙った誤答です。",
          "it's free most of next week と、むしろ空いています。",
          "正解。",
          "It does がプロジェクターの有無への肯定です。",
        ],
      },
      {
        stem: "What will one of the men do?",
        choices: [
          "Reserve the training room for two afternoons",
          "Bring a speaker from storage",
          "Cancel the video portion of the session",
          "Ask attendees to sign up again",
        ],
        answer: 1,
        type: "次の行動",
        evidence: "I'll grab one from the supply closet.",
        why:
          "I'll ~ は「これからやること」の合図です。最後の発言に置かれることが多く、第3問の根拠になります。one が何を指すかは直前の a portable speaker です。",
        choiceNotes: [
          "2回開催は検討されましたが、会議室を使う案に移りました。",
          "正解。",
          "動画は後半に流すと述べられており、中止ではありません。",
          "申し込みのやり直しは出てきません。",
        ],
      },
    ],
  },

  {
    id: 4,
    chapter: 1,
    part: 4,
    scene: "館内放送（工事の案内）",
    title: "説明文・館内放送",
    speed: 1.0,
    lines: [
      {
        speaker: "Announcer",
        voice: "alloy",
        text: "Attention, shoppers. Beginning next Monday, the north entrance will be closed while we replace the automatic doors. The work is scheduled to last about ten days. During that time, please use the south or garage-level entrances. Customers with accessibility needs should note that the garage entrance has the only ramp, and our staff at the service counter can arrange assistance if you call ahead. We expect some noise between nine and eleven each morning, and we apologize for the disruption. The north entrance will reopen with an expanded seating area just inside. Thank you for shopping with us.",
        ja: "お客様にご案内いたします。来週月曜より、自動ドアの交換工事のため北口を閉鎖いたします。工事期間は約10日間の予定です。その間は南口または駐車場階の入口をご利用ください。お体の不自由なお客様にお知らせです。スロープがあるのは駐車場階の入口のみで、事前にお電話いただければサービスカウンターの係員が介助の手配をいたします。毎朝9時から11時ごろまで工事音が出る見込みです。ご不便をおかけし申し訳ございません。北口は、すぐ内側に休憩スペースを拡張したうえで再開いたします。ご利用ありがとうございます。",
      },
    ],
    questions: [
      {
        stem: "Where most likely is the announcement being made?",
        choices: [
          "At an airport",
          "At a retail store",
          "At a hotel",
          "At a train station",
        ],
        answer: 1,
        type: "場面",
        evidence: "Attention, shoppers. / Thank you for shopping with us.",
        why:
          "場所を問う設問は、冒頭の呼びかけと末尾の締めで決まります。shoppers という一語で確定します。Part 4 の第1問はこの型が非常に多いです。",
        choiceNotes: [
          "空港を示す語はありません。",
          "正解。",
          "ホテルを示す語はありません。",
          "駅を示す語はありません。garage-level は駐車場で、プラットホームではありません。",
        ],
      },
      {
        stem: "What are listeners asked to do if they need assistance?",
        choices: [
          "Use the north entrance",
          "Visit the service counter on arrival",
          "Telephone in advance",
          "Wait near the ramp",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "our staff at the service counter can arrange assistance if you call ahead",
        why:
          "条件を示す if 節が答えの位置です。call ahead（事前に電話する）が選択肢では telephone in advance に言い換えられています。",
        choiceNotes: [
          "北口は閉鎖されます。",
          "サービスカウンターの係員が手配しますが、求められているのは事前の電話です。聞こえた語をそのまま選ばせる誤答です。",
          "正解。",
          "スロープは場所の説明で、指示ではありません。",
        ],
      },
      {
        stem: "What does the speaker say will change after the work is finished?",
        choices: [
          "The store will open earlier.",
          "A seating area will be larger.",
          "The garage will have more spaces.",
          "A new service counter will open.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "The north entrance will reopen with an expanded seating area just inside.",
        why:
          "Part 4 の第3問は末尾に根拠があることが多いです。「工事後」を問われたら、未来形の文（will reopen）を探すこと。",
        choiceNotes: [
          "営業時間の変更には触れていません。9時から11時は工事音の時間帯です。",
          "正解。expanded が larger に言い換えられています。",
          "駐車場は入口として言及されるだけです。",
          "サービスカウンターは既存で、新設ではありません。",
        ],
      },
    ],
  },

  {
    id: 5,
    chapter: 1,
    part: 4,
    scene: "留守番電話（予約の確認）",
    title: "説明文・留守番電話",
    speed: 1.05,
    lines: [
      {
        speaker: "Caller",
        voice: "sage",
        text: "Hi, this is Robin calling from Castleton Dental for Mr. Ferreira. I'm calling about your cleaning appointment on Wednesday the ninth at two fifteen. Our hygienist had a scheduling conflict come up, so we need to move you either thirty minutes earlier, at one forty-five, or to Thursday at the same time. Either one is fine on our end. If neither works, we can look at the following week, though our afternoons fill up quickly. Please call the office back at 555-0198 and ask for me directly. One more thing: your insurance information on file expires at the end of this month, so if you could bring an updated card to your visit, that would save us some time. Thank you.",
        ja: "もしもし、キャッスルトン歯科のロビンです。フェレイラ様にご連絡です。9日水曜、2時15分のクリーニングのご予約についてです。衛生士の予定が重なってしまいまして、30分早い1時45分か、木曜の同じ時間へ変更をお願いしたく存じます。どちらでも当院は問題ありません。どちらも難しければ翌週も検討できますが、午後はすぐ埋まってしまいます。555-0198 までお電話いただき、私を指名してください。それともう一点、登録されている保険情報が今月末で期限切れになります。ご来院の際に更新済みのカードをお持ちいただけると、手続きが早く済みます。よろしくお願いいたします。",
      },
    ],
    questions: [
      {
        stem: "What is the purpose of the message?",
        choices: [
          "To confirm a payment",
          "To reschedule an appointment",
          "To remind the listener of a bill",
          "To announce a new office location",
        ],
        answer: 1,
        type: "場面",
        evidence:
          "we need to move you either thirty minutes earlier ... or to Thursday at the same time",
        why:
          "留守番電話は、名乗り → 用件の順で必ず進みます。用件は2文目前後にあり、そこを聞き取れば第1問は決まります。",
        choiceNotes: [
          "支払いの確認ではありません。",
          "正解。",
          "請求の話はありません。保険は情報の更新依頼です。",
          "移転の話はありません。",
        ],
      },
      {
        stem: "What time was the original appointment?",
        choices: ["1:45", "2:15", "2:45", "Thursday at 1:45"],
        answer: 1,
        type: "詳細",
        evidence:
          "your cleaning appointment on Wednesday the ninth at two fifteen",
        why:
          "時刻が複数出てくる音声では、それぞれが「元の予定」「変更案」のどちらかを聞き分けます。ここは your appointment に続く時刻が元の予定です。数字だけを拾うと必ず取り違えます。",
        choiceNotes: [
          "1時45分は変更案の一つ（30分早める案）です。",
          "正解。",
          "音声に出てこない時刻です。",
          "木曜は変更案で、時刻も同じ2時15分です。",
        ],
      },
      {
        stem: "What is the listener asked to bring?",
        choices: [
          "A form of payment",
          "An updated insurance card",
          "A copy of the appointment reminder",
          "A referral from another clinic",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "if you could bring an updated card to your visit, that would save us some time",
        why:
          "One more thing / Also / By the way の後ろには、用件とは別の依頼が来ます。ここが第3問になることが非常に多いので、最後まで気を抜かないこと。",
        choiceNotes: [
          "支払い方法の指定はありません。",
          "正解。",
          "予約確認書の持参は求められていません。",
          "紹介状の話はありません。",
        ],
      },
    ],
  },

  {
    id: 6,
    chapter: 1,
    part: 4,
    scene: "社内説明（新しい手順）",
    title: "説明文・新しい手順",
    speed: 1.08,
    lines: [
      {
        speaker: "Speaker",
        voice: "verse",
        text: "Before we break, I want to walk through the new expense process. Starting the first of next month, receipts go into the mobile app instead of the paper envelopes. Take a photo, tag the project code, and submit — that's it. The finance team will no longer accept envelopes after the fifteenth, so please clear out anything you've been holding onto. Two things people get wrong. First, the project code is not the client name; it's the five-digit number on your assignment sheet. Second, anything over four hundred dollars still needs a manager's signature, and the app will hold it until that comes through. If you submit a large expense on a Friday and your manager is out, it won't process until they're back. Plan accordingly.",
        ja: "休憩の前に、新しい経費精算の手順を説明します。来月1日から、領収書は紙の封筒ではなくモバイルアプリに入れてください。写真を撮り、プロジェクトコードを付けて送信、それだけです。経理は15日以降、封筒を受け付けません。手元に溜めているものがあれば片付けてください。よく間違われる点が2つあります。1つ目、プロジェクトコードは顧客名ではありません。担当表に載っている5桁の数字です。2つ目、400ドルを超えるものは今も上長の署名が必要で、それが下りるまでアプリが保留します。金曜に高額の経費を出して上長が不在だと、戻るまで処理されません。そのつもりで進めてください。",
      },
    ],
    questions: [
      {
        stem: "What is the speaker mainly explaining?",
        choices: [
          "A change to a reporting procedure",
          "A new mobile phone policy",
          "A reduction in the expense budget",
          "A change in management structure",
        ],
        answer: 0,
        type: "場面",
        evidence: "I want to walk through the new expense process.",
        why:
          "walk through は「順を追って説明する」。冒頭の I want to ~ / Today I'll ~ が主題を宣言する定型です。Part 4 の第1問はここで決まります。",
        choiceNotes: [
          "正解。",
          "アプリは手段として出てくるだけで、携帯電話の規則ではありません。",
          "予算の削減には触れていません。400ドルは署名が必要になる基準額です。",
          "組織変更ではありません。上長の署名は既存の手続きです。",
        ],
      },
      {
        stem: "What does the speaker say about the project code?",
        choices: [
          "It is assigned by the finance team.",
          "It is the name of the client.",
          "It is a five-digit number.",
          "It changes at the start of each month.",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "the project code is not the client name; it's the five-digit number on your assignment sheet",
        why:
          "not A; it's B の形は「否定してから訂正する」構造で、後ろが正解です。First / Second と番号を振って列挙する箇所は、そのまま設問になります。",
        choiceNotes: [
          "経理が割り当てるとは述べられていません。",
          "not the client name と明確に否定されています。聞こえた語をそのまま選ばせる誤答です。",
          "正解。",
          "月初に変わるのは手順の開始時期で、コードではありません。",
        ],
      },
      {
        stem: "Why does the speaker mention Friday?",
        choices: [
          "To give the deadline for paper envelopes",
          "To explain when the app will be updated",
          "To warn about a possible delay in approval",
          "To announce a change in office hours",
        ],
        answer: 2,
        type: "意図",
        evidence:
          "If you submit a large expense on a Friday and your manager is out, it won't process until they're back.",
        why:
          "「なぜそれに触れたのか」を問う設問は、その語を含む一文全体を根拠にします。ここは条件文で、金曜そのものではなく「承認が遅れうる例」として挙げられています。単語だけを追うと答えられません。",
        choiceNotes: [
          "封筒の締切は15日です。別の日付を持ってくる誤答です。",
          "アプリの更新時期には触れていません。",
          "正解。",
          "勤務時間の変更ではありません。",
        ],
      },
    ],
  },
];

export function listeningSetsInChapter(chapterId: number): ListeningSet[] {
  return LISTENING_SETS.filter((s) => s.chapter === chapterId);
}
