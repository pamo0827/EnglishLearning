/**
 * 長文読解（TOEIC Part 7 形式）の問題バンク。ビルド時専用の原本。
 *
 * このファイルはアプリのコードから import してはならない。
 * scripts/build-content.mjs だけが読み、本文と選択肢は公開データへ、
 * 正解と解説は暗号化して public/data/ へ書き出す。
 *
 * 【Part 7 の実仕様（設計の根拠）】
 *   54問を54分 → 1問あたり60秒が基準ペース
 *   単一文書10セット（各2〜4問）／二重2セット・三重3セット（各5問）
 *   単一文書は約3分で解き切るのが目安
 * 目標時間は文書量と設問数から算出し、本番より少し速い設定にしてある。
 */

export type ReadingQuestionType =
  | "主旨"
  | "詳細"
  | "推測"
  | "語彙"
  | "NOT"
  | "意図";

export type ReadingQuestion = {
  stem: string;
  choices: [string, string, string, string];
  /** 正解の添字（0〜3） */
  answer: 0 | 1 | 2 | 3;
  type: ReadingQuestionType;
  /** 本文中の根拠となる箇所 */
  evidence: string;
  /** なぜその選択肢が正解なのか */
  why: string;
  /** 選択肢ごとの解説。正解の分には補足を書く */
  choiceNotes: [string, string, string, string];
};

export type ReadingSet = {
  id: number;
  chapter: number;
  /** 単一文書 / 二重文書 / 三重文書 */
  format: "single" | "double" | "triple";
  /** 文書の種類。TOEIC で頻出のものに揃えてある */
  docType: string;
  /** 一覧に出す見出し。本文の内容は明かさない範囲に留める */
  title: string;
  passages: { label: string; body: string }[];
  questions: ReadingQuestion[];
  /** このセットの1問あたり目標秒数 */
  targetSecPerQuestion: number;
};

export type ReadingChapter = {
  id: number;
  title: string;
};

export const READING_CHAPTERS: ReadingChapter[] = [
  { id: 1, title: "第1章" },
  { id: 2, title: "第2章" },
];

/**
 * 速読ランク。実測の「1問あたり秒数」で判定する。
 * 基準は Part 7 の 54問／54分 = 60秒。
 */
export const SPEED_RANKS = [
  { rank: "S", maxSec: 45, label: "本番で見直しの時間まで残せる速さ" },
  { rank: "A", maxSec: 60, label: "Part 7 を time up せずに解き切れる速さ" },
  { rank: "B", maxSec: 75, label: "終盤で数問を落とす。あと一歩" },
  { rank: "C", maxSec: 95, label: "Part 7 を解き切れない。読み返しが多い" },
  { rank: "D", maxSec: Infinity, label: "大幅に時間が足りない。一文ずつ訳している状態" },
] as const;

export const READING_SETS: ReadingSet[] = [
  {
    id: 1,
    chapter: 1,
    format: "single",
    docType: "メール",
    title: "社内メール（施設の一時閉鎖）",
    targetSecPerQuestion: 55,
    passages: [
      {
        label: "Email",
        body: `From: Daniel Okafor <d.okafor@brightline-logistics.com>
To: All Warehouse Staff
Date: March 4
Subject: Temporary Change to Loading Dock Access

Beginning Monday, March 9, the east loading dock will be closed for resurfacing. The work is expected to take approximately two weeks, though the contractor has indicated it may finish several days early if weather permits.

During this period, all incoming and outgoing shipments must be routed through the west dock. Because the west dock has only three bays, we anticipate longer wait times, particularly between 7:00 A.M. and 10:00 A.M. Supervisors should stagger crew start times accordingly.

Drivers arriving from Route 12 will need to use the service road behind Building C rather than the main entrance. Updated maps have been posted in the break room and sent to all carrier partners.

If a delivery cannot be rescheduled and the wait exceeds one hour, contact dispatch at extension 4412. Do not direct drivers to the east dock under any circumstances; the surface will not be safe for vehicle traffic.

Thank you for your patience.

Daniel Okafor
Operations Manager`,
      },
    ],
    questions: [
      {
        stem: "What is the purpose of the e-mail?",
        choices: [
          "To announce a change in delivery schedules",
          "To inform staff about a temporary facility closure",
          "To introduce a new operations manager",
          "To request feedback on a construction project",
        ],
        answer: 1,
        type: "主旨",
        evidence:
          "Subject: Temporary Change to Loading Dock Access / Beginning Monday, March 9, the east loading dock will be closed for resurfacing.",
        why: "件名と第1文が主旨を直接示しています。目的を問う設問は、件名と第1段落の1〜2文で決まることがほとんどです。本文を最後まで読む必要はありません。",
        choiceNotes: [
          "配送スケジュールの変更ではなく、閉鎖されるのは「施設（東側の搬入口）」です。待ち時間が延びるとは書かれていますが、スケジュール自体の変更は述べていません。本文の一部（配送への影響）だけを拾うと選んでしまう典型的な誤答です。",
          "正解。件名の Temporary Change と本文の will be closed が一致します。",
          "Daniel Okafor は署名にある差出人で、新任だとは書かれていません。人名や役職が本文にあるだけで「紹介」と結び付けないこと。",
          "工事について意見を求める記述はありません。最後は Thank you for your patience（協力への感謝）で終わっています。",
        ],
      },
      {
        stem: "What are supervisors asked to do?",
        choices: [
          "Stagger the start times of their crews",
          "Post updated maps in the break room",
          "Contact carrier partners directly",
          "Inspect the surface of the east dock",
        ],
        answer: 0,
        type: "詳細",
        evidence: "Supervisors should stagger crew start times accordingly.",
        why:
          "設問の supervisors がそのまま本文に出てくるので、その語を目印に探せば1文で決まります。固有の役職名・部署名は本文検索の目印として最も使いやすい手がかりです。",
        choiceNotes: [
          "正解。stagger（時間をずらす）は Part 7 頻出の動詞です。",
          "地図は have been posted と受動態・完了形で書かれており、すでに掲示済みです。これから supervisors がやることではありません。",
          "carrier partners には地図が送られたと書かれているだけで、supervisors が連絡するとは述べていません。",
          "東側の搬入口には近づかせるなという指示（Do not direct drivers to the east dock）があり、点検を求める記述はありません。",
        ],
      },
      {
        stem: "What is indicated about the resurfacing work?",
        choices: [
          "It will be completed on March 9.",
          "It has already been delayed once.",
          "It could be finished ahead of schedule.",
          "It requires the west dock to close.",
        ],
        answer: 2,
        type: "推測",
        evidence:
          "The work is expected to take approximately two weeks, though the contractor has indicated it may finish several days early if weather permits.",
        why:
          "may finish several days early（数日早く終わる可能性がある）を ahead of schedule（予定より早く）と言い換えています。though で始まる譲歩節は「本筋とは別の可能性」を述べる場所で、推測問題の根拠になりやすい箇所です。",
        choiceNotes: [
          "March 9 は工事の開始日です。日付が出てきたら、それが開始なのか終了なのかを必ず確認すること。",
          "遅延の記述はありません。two weeks はあくまで見込み期間です。",
          "正解。",
          "閉鎖されるのは east dock で、west dock はむしろ代わりに使う側です。east と west を取り違えさせる誤答で、方角・番号の入れ替えは頻出の仕掛けです。",
        ],
      },
    ],
  },

  {
    id: 2,
    chapter: 1,
    format: "single",
    docType: "告知",
    title: "館内掲示（設備の点検）",
    targetSecPerQuestion: 50,
    passages: [
      {
        label: "Notice",
        body: `MERIDIAN TOWER — RESIDENT NOTICE
Elevator Maintenance

Elevator B will be out of service from Tuesday, June 2 through Thursday, June 4 for its annual safety inspection. Elevator A will operate normally throughout this period.

Residents on floors 15 and above may experience longer wait times during peak hours (7:30–9:00 A.M. and 5:30–7:00 P.M.). We recommend allowing an extra ten minutes during these periods.

Large deliveries and moving services must be scheduled with the building office at least 48 hours in advance. No moving will be permitted on June 3.

The freight elevator remains available to residents who present a valid access card at the loading area on the ground floor.

Questions may be directed to the building office at 555-0177.`,
      },
    ],
    questions: [
      {
        stem: "On what date will moving be prohibited?",
        choices: ["June 2", "June 3", "June 4", "June 15"],
        answer: 1,
        type: "詳細",
        evidence: "No moving will be permitted on June 3.",
        why:
          "日付が複数出てくる文書では、それぞれが何の日付なのかを結び付けながら読むこと。ここでは June 2〜4 が点検期間、June 3 だけが引っ越し禁止日です。",
        choiceNotes: [
          "点検の開始日です。引っ越しが禁止されるのは期間中の1日だけで、全期間ではありません。",
          "正解。",
          "点検の終了日です。",
          "15 は floors 15 and above（15階以上）の階数であって日付ではありません。数字が出てきたら単位を確認すること。",
        ],
      },
      {
        stem: "What must residents do to use the freight elevator?",
        choices: [
          "Reserve it 48 hours in advance",
          "Contact the building office by telephone",
          "Show a valid access card",
          "Use it only outside of peak hours",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "The freight elevator remains available to residents who present a valid access card at the loading area on the ground floor.",
        why:
          "present（提示する）が選択肢では show に言い換えられています。設問の to use the freight elevator を目印に、その語を含む段落だけを読めば決まります。",
        choiceNotes: [
          "48時間前の予約が必要なのは large deliveries and moving services であって、貨物用エレベーターの利用一般ではありません。同じ文書内の別の条件を持ってくる誤答です。",
          "電話番号は問い合わせ先として最後に書かれているだけです。",
          "正解。",
          "ピーク時間帯は待ち時間の注意として書かれているだけで、利用条件ではありません。",
        ],
      },
    ],
  },

  {
    id: 3,
    chapter: 1,
    format: "single",
    docType: "広告",
    title: "サービスの広告",
    targetSecPerQuestion: 55,
    passages: [
      {
        label: "Advertisement",
        body: `NORTHFIELD COWORKING
Now Open on Harrow Street

Northfield offers flexible workspace for freelancers, small teams, and remote employees. Our newly renovated third-floor location includes 40 open desks, six private offices, and three bookable meeting rooms.

MEMBERSHIP OPTIONS
Day Pass — $22
Access to open desks, 9 A.M. to 6 P.M.

Flex Monthly — $180
Ten days of access per month, used on any days you choose.

Resident Monthly — $340
Unlimited access, including evenings and weekends, plus a locked storage cabinet.

All memberships include high-speed internet, unlimited coffee, and use of the printing station. Meeting rooms are billed separately at $15 per hour, though Resident members receive four complimentary hours each month.

Sign up before October 31 and your first month is half price. This offer applies to monthly memberships only and cannot be combined with other promotions.

Tours are available weekdays at 11 A.M. No appointment necessary.`,
      },
    ],
    questions: [
      {
        stem: "What is included with every membership?",
        choices: [
          "A locked storage cabinet",
          "Four hours of meeting room use",
          "Access on weekends",
          "Use of the printing station",
        ],
        answer: 3,
        type: "詳細",
        evidence:
          "All memberships include high-speed internet, unlimited coffee, and use of the printing station.",
        why:
          "All memberships include という語が、そのまま設問の every membership に対応します。料金表が並ぶ文書では、表の下にある「全プラン共通」の一文が設問になりやすい箇所です。",
        choiceNotes: [
          "Resident Monthly だけの特典です（plus a locked storage cabinet）。上位プランの特典を全プランの特典と取り違えさせる誤答です。",
          "これも Resident members のみ（four complimentary hours）。しかも会議室は原則 billed separately です。",
          "evenings and weekends も Resident Monthly の説明にある内容です。Day Pass は 9 A.M. to 6 P.M. に限られます。",
          "正解。",
        ],
      },
      {
        stem: "What is suggested about the discount offer?",
        choices: [
          "It is not available to Day Pass users.",
          "It requires a full year of membership.",
          "It ends when all desks are reserved.",
          "It can be used with other promotions.",
        ],
        answer: 0,
        type: "推測",
        evidence:
          "This offer applies to monthly memberships only and cannot be combined with other promotions.",
        why:
          "monthly memberships only（月額会員のみ）から、月額ではない Day Pass は対象外だと導けます。only や except を含む一文は、そのまま推測問題の根拠になります。",
        choiceNotes: [
          "正解。",
          "1年の契約を求める記述はありません。half price になるのは first month だけです。",
          "締切は October 31 という日付で示されており、席の埋まり具合とは無関係です。",
          "cannot be combined with other promotions と正反対です。本文に否定語がある選択肢は、否定を外して読ませる誤答が必ず用意されます。",
        ],
      },
      {
        stem: "What is indicated about tours of the facility?",
        choices: [
          "They must be reserved in advance.",
          "They are offered on weekdays only.",
          "They are limited to monthly members.",
          "They cost $22 per person.",
        ],
        answer: 1,
        type: "詳細",
        evidence: "Tours are available weekdays at 11 A.M. No appointment necessary.",
        why:
          "文書の最後の1〜2文は、設問1つ分の情報を持っていることが多い箇所です。読み飛ばさないこと。",
        choiceNotes: [
          "No appointment necessary（予約不要）と正反対です。",
          "正解。weekdays at 11 A.M. とあり、平日限定です。",
          "見学に会員資格の条件は書かれていません。",
          "$22 は Day Pass の料金です。文書内の別の数字を持ってくる誤答です。",
        ],
      },
    ],
  },

  {
    id: 4,
    chapter: 1,
    format: "single",
    docType: "チャット",
    title: "同僚間のメッセージ",
    targetSecPerQuestion: 50,
    passages: [
      {
        label: "Text Message Chain",
        body: `Priya Raman (9:12 A.M.)
Morning. Did the samples from Kestrel arrive yesterday?

Tomas Lind (9:14 A.M.)
They did, but only two of the three boxes. The third is showing as still in transit.

Priya Raman (9:15 A.M.)
That's the fabric swatches, isn't it?

Tomas Lind (9:16 A.M.)
Right. Which is the one the client actually wants to see on Thursday.

Priya Raman (9:18 A.M.)
Can we push the meeting to Friday afternoon?

Tomas Lind (9:21 A.M.)
I asked. They're flying out Thursday evening, so Friday won't work.

Priya Raman (9:22 A.M.)
Then let's present the two we have and send the swatches by courier once they land.

Tomas Lind (9:24 A.M.)
I'll let the client know. Should I mention the delay, or wait until we're in the room?

Priya Raman (9:25 A.M.)
Tell them now. They'll be less annoyed hearing it today than on Thursday.`,
      },
    ],
    questions: [
      {
        stem: "What problem do the writers discuss?",
        choices: [
          "A client has canceled a meeting.",
          "Part of a shipment has not arrived.",
          "A courier company raised its prices.",
          "A colleague is unavailable on Thursday.",
        ],
        answer: 1,
        type: "主旨",
        evidence:
          "They did, but only two of the three boxes. The third is showing as still in transit.",
        why:
          "チャット形式では、問題は最初の2〜3往復で提示されます。but の後ろに問題の核が来るのが定型です。",
        choiceNotes: [
          "会議は木曜のまま行われます。金曜への変更を検討しましたが、断念しただけです。",
          "正解。3箱のうち1箱が未着です。",
          "宅配便は解決策として出てくるだけで、価格の話はありません。",
          "木曜に都合が悪いのは client（flying out Thursday evening）であって同僚ではありません。",
        ],
      },
      {
        stem: "At 9:21 A.M., what does Mr. Lind most likely mean when he writes, \"Friday won't work\"?",
        choices: [
          "He will be out of the office on Friday.",
          "The samples cannot be delivered by Friday.",
          "The client will have already left by Friday.",
          "The meeting room is booked on Friday.",
        ],
        answer: 2,
        type: "意図",
        evidence: "They're flying out Thursday evening, so Friday won't work.",
        why:
          "意図問題は、引用された文の直前にある so / because / but を見ること。ここは so の前（They're flying out Thursday evening）が理由そのものです。引用文だけを見て考えても答えは出ません。",
        choiceNotes: [
          "Lind 自身の予定は話題になっていません。主語を取り違えさせる誤答です。",
          "サンプルの到着時期には触れていません。金曜が駄目な理由は客側の事情です。",
            "正解。木曜の夜に発つので、金曜にはもういません。",
          "会議室の空きは話に出てきません。",
        ],
      },
      {
        stem: "What does Ms. Raman advise Mr. Lind to do?",
        choices: [
          "Inform the client of the delay immediately",
          "Cancel the courier shipment",
          "Wait until Thursday to raise the issue",
          "Contact Kestrel about the missing box",
        ],
        answer: 0,
        type: "詳細",
        evidence:
          "Tell them now. They'll be less annoyed hearing it today than on Thursday.",
        why:
          "会話文では最後のやり取りが結論になります。Tell them now という命令形が、そのまま設問の advise に対応します。",
        choiceNotes: [
          "正解。",
          "宅配便は中止ではなく、これから使う手段です（send the swatches by courier）。",
          "Lind がその案（wait until we're in the room）を出し、Raman が否定した側です。二人のどちらの発言かを取り違えさせる誤答です。",
          "Kestrel への連絡は話に出ていません。",
        ],
      },
    ],
  },

  {
    id: 5,
    chapter: 1,
    format: "single",
    docType: "記事",
    title: "地域の記事",
    targetSecPerQuestion: 60,
    passages: [
      {
        label: "Article",
        body: `Riverside Market Moves Indoors After Fifteen Years

BELLINGHAM (April 2) — The Riverside Farmers Market, a fixture of the city's waterfront since 2011, will relocate to the former Hartley Textile Building this autumn.

The decision follows three consecutive seasons of declining attendance, which market director Ana Petrova attributes largely to weather. "We lost eleven Saturdays to rain last year," she said. "Vendors can absorb one or two. Eleven is a different problem."

The Hartley building, vacant since 2019, offers 18,000 square feet of covered space and parking for roughly 200 vehicles — a significant increase over the waterfront lot, which holds fewer than 60. Renovations funded by a city grant are scheduled to be completed by September.

Not all vendors welcome the change. Several who sell prepared food argue that the waterfront's foot traffic, drawn by the adjacent park, cannot be replicated indoors. "People wander in because they see us," said baker Ito Nakamura, who has held a stall since the market's first season. "Nobody wanders into a warehouse."

Petrova acknowledged the concern but noted that the new site sits two blocks from the transit center. The market will continue to operate on Saturdays, with an expanded winter schedule beginning in December.`,
      },
    ],
    questions: [
      {
        stem: "What is the article mainly about?",
        choices: [
          "The closing of a long-running market",
          "A dispute over a city grant",
          "The relocation of a market to a new site",
          "A renovation of the city's waterfront",
        ],
        answer: 2,
        type: "主旨",
        evidence:
          "Riverside Market Moves Indoors After Fifteen Years / will relocate to the former Hartley Textile Building this autumn",
        why:
          "記事は見出しと第1段落で主旨が決まります。見出しの Moves Indoors と本文の relocate が同じことを言っています。",
        choiceNotes: [
          "閉鎖ではなく移転です。Moves という語を見落とすと選んでしまいます。",
          "助成金は改装の財源として一言触れられているだけで、争点ではありません。",
          "正解。",
          "改装されるのは移転先の建物であって、ウォーターフロントではありません。",
        ],
      },
      {
        stem: "According to Ms. Petrova, what caused attendance to decline?",
        choices: [
          "Insufficient parking",
          "Poor weather",
          "Competition from other markets",
          "A reduction in the number of vendors",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "declining attendance, which market director Ana Petrova attributes largely to weather",
        why:
          "attribute A to B は「A の原因を B とみなす」。原因を問う設問はこの動詞が目印になります。cause / lead to / due to なども同様です。",
        choiceNotes: [
          "駐車場は移転先の利点として挙げられているだけで、来場者減の原因としては述べられていません。",
          "正解。",
          "他の市場の話は出てきません。",
          "出店者数の減少には触れていません。反対意見を持つ出店者がいるだけです。",
        ],
      },
      {
        stem: "What is NOT mentioned as a feature of the Hartley building?",
        choices: [
          "Covered space",
          "Parking for about 200 vehicles",
          "Proximity to a transit center",
          "An adjacent public park",
        ],
        answer: 3,
        type: "NOT",
        evidence:
          "18,000 square feet of covered space and parking for roughly 200 vehicles / the new site sits two blocks from the transit center",
        why:
          "NOT 問題は、選択肢を1つずつ本文で確認する以外に解き方がありません。3つ潰せば残りが答えです。時間がかかるので、他の設問を先に済ませてから戻るのが定石です。",
        choiceNotes: [
          "covered space と本文にあります。",
          "parking for roughly 200 vehicles と一致します。",
          "two blocks from the transit center と一致します。",
          "正解（本文にない）。adjacent park は移転前のウォーターフロント側の説明です。移転先の特徴として書かれてはいません。場所の取り違えを狙った選択肢です。",
        ],
      },
      {
        stem: "Why does Mr. Nakamura oppose the move?",
        choices: [
          "He believes the new location will attract fewer passersby.",
          "He objects to the increase in stall fees.",
          "He prefers the market's current schedule.",
          "He has been a vendor for only one season.",
        ],
        answer: 0,
        type: "推測",
        evidence:
          "\"People wander in because they see us,\" said baker Ito Nakamura. \"Nobody wanders into a warehouse.\"",
        why:
          "発言の引用は、その人の立場を示すために置かれています。wander in（ふらりと立ち寄る）が選択肢では passersby（通りすがりの人）に言い換えられています。",
        choiceNotes: [
          "正解。",
          "出店料の話は本文に一切ありません。",
          "土曜開催は継続で、冬の日程はむしろ拡大されます。",
          "since the market's first season（第1シーズンから）なので、15年近く出店しています。one season と読み違えさせる誤答です。",
        ],
      },
    ],
  },

  {
    id: 6,
    chapter: 1,
    format: "double",
    docType: "メール＋日程表",
    title: "二重文書（メールと日程表）",
    targetSecPerQuestion: 65,
    passages: [
      {
        label: "E-mail",
        body: `From: Lena Vasquez <l.vasquez@cadenceanalytics.com>
To: Rafael Ortiz <r.ortiz@cadenceanalytics.com>
Date: August 12
Subject: Vendor Summit — your sessions

Rafael,

Thanks for agreeing to cover two sessions at next month's Vendor Summit. I've attached the draft schedule.

You're down for the data governance talk in the morning and the integration workshop after lunch. The workshop room only seats 30, so we're asking attendees to register in advance for that one.

One change since we last spoke: the opening remarks were moved up by thirty minutes to accommodate the keynote speaker's flight. Everything after that shifted accordingly, so please check the attached times rather than the ones I gave you on the phone.

If the afternoon slot is too tight after your morning session, I can swap you with Hana, who is covering the compliance panel. Let me know by Friday.

Lena`,
      },
      {
        label: "Schedule",
        body: `CADENCE ANALYTICS — VENDOR SUMMIT
September 9 | Fairmount Conference Center

8:30 A.M. — Opening Remarks (Auditorium)
9:00 A.M. — Keynote: The Next Five Years (Auditorium)
10:00 A.M. — Data Governance in Practice (Room 2B)
11:15 A.M. — Compliance Panel (Room 2B)
12:15 P.M. — Lunch (Atrium)
1:30 P.M. — Integration Workshop (Room 4A, registration required)
3:00 P.M. — Vendor Showcase (Atrium)
4:30 P.M. — Closing Reception (Atrium)`,
      },
    ],
    questions: [
      {
        stem: "What is the purpose of the e-mail?",
        choices: [
          "To invite Mr. Ortiz to attend a summit",
          "To confirm Mr. Ortiz's speaking assignments",
          "To announce a new keynote speaker",
          "To request registration for a workshop",
        ],
        answer: 1,
        type: "主旨",
        evidence:
          "Thanks for agreeing to cover two sessions at next month's Vendor Summit. / You're down for the data governance talk in the morning and the integration workshop after lunch.",
        why:
          "二重文書でも、目的を問う設問は片方の文書だけで解けます。まず1つ目の文書の冒頭を読むこと。",
        choiceNotes: [
          "すでに登壇を承諾済み（Thanks for agreeing）です。招待の段階は過ぎています。",
          "正解。担当する2つのセッションを確認する内容です。",
          "基調講演者は言及されるだけで、新任だとは書かれていません。",
          "事前登録が必要なのは参加者側であって、Ortiz に求めているわけではありません。",
        ],
      },
      {
        stem: "At what time will Mr. Ortiz's first session begin?",
        choices: ["8:30 A.M.", "9:00 A.M.", "10:00 A.M.", "1:30 P.M."],
        answer: 2,
        type: "詳細",
        evidence:
          "メール: the data governance talk in the morning ／ 日程表: 10:00 A.M. — Data Governance in Practice",
        why:
          "二重文書の典型的な設問です。片方の文書だけでは答えが出ません。メールで「何を担当するか」を掴み、日程表で「その時刻」を引く、という2段階を踏みます。この形式を見たら、まず2つの文書をつなぐ共通の語（ここでは Data Governance）を探すこと。",
        choiceNotes: [
          "Opening Remarks の時刻です。",
          "Keynote の時刻です。",
          "正解。",
          "Ortiz の2つ目のセッション（Integration Workshop）の時刻です。first と聞かれている点に注意。",
        ],
      },
      {
        stem: "What is suggested about the Integration Workshop?",
        choices: [
          "It will be held in the Auditorium.",
          "It has limited seating.",
          "It was moved to the morning.",
          "It will be led by Hana.",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "メール: The workshop room only seats 30 ／ 日程表: Room 4A, registration required",
        why:
          "2つの文書が同じことを別の言い方で述べています。only seats 30 と registration required の両方が limited seating を裏づけます。両文書で同じ話題に触れている箇所は、設問になる可能性が高い場所です。",
        choiceNotes: [
          "Room 4A です。Auditorium は Opening Remarks と Keynote の会場です。",
          "正解。",
          "午後（1:30 P.M.）のままです。時間が繰り上がったのは開会の挨拶とそれ以降の全体です。",
          "Hana が担当するのは Compliance Panel です。入れ替えは提案されただけで、決定していません。",
        ],
      },
      {
        stem: "Why does Ms. Vasquez ask Mr. Ortiz to check the attached schedule?",
        choices: [
          "The venue has changed.",
          "Some session times were adjusted.",
          "A session was canceled.",
          "The registration deadline has passed.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "the opening remarks were moved up by thirty minutes ... Everything after that shifted accordingly, so please check the attached times rather than the ones I gave you on the phone.",
        why:
          "so の後ろが「だから確認して」という依頼、前が理由です。理由を問う設問は so / because / since の前後を見ること。move up は「（時間を）繰り上げる」で、繰り下げではありません。",
        choiceNotes: [
          "会場は Fairmount Conference Center のままです。",
          "正解。",
          "中止されたセッションはありません。",
          "登録の締切には触れていません。Friday の期限は Ortiz が返事をする期限です。",
        ],
      },
      {
        stem: "What will Mr. Ortiz most likely do by Friday?",
        choices: [
          "Register for the Integration Workshop",
          "Reply about a possible schedule change",
          "Submit slides for the keynote",
          "Reserve Room 4A",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "If the afternoon slot is too tight ... I can swap you with Hana, who is covering the compliance panel. Let me know by Friday.",
        why:
          "Let me know by Friday が、直前に述べた「入れ替えるかどうか」への返事を指します。代名詞や省略された目的語が何を指すかは、直前の文に戻って確認すること。",
        choiceNotes: [
          "登録が必要なのは参加者であり、登壇者の Ortiz ではありません。",
          "正解。",
          "基調講演は Ortiz の担当ではありません。",
          "会場の手配をするとは書かれていません。",
        ],
      },
    ],
  },
  /* ---------------- 第2章 ---------------- */

  {
    id: 7,
    chapter: 2,
    format: "single",
    docType: "請求書",
    title: "請求書",
    targetSecPerQuestion: 50,
    passages: [
      {
        label: "Invoice",
        body: `WESTBROOK SUPPLY CO.
Invoice #48812

Bill To: Harlow Design Studio, 14 Pinehurst Avenue, Suite 300
Order Date: July 8    Ship Date: July 11    Terms: Net 30

Item                              Qty    Unit Price    Total
Drafting paper, A1 (100 sheets)    12       $18.00     $216.00
Fine-liner pen set                  8       $24.50     $196.00
Cutting mat, large                  3       $41.00     $123.00
Storage tube                        6        $9.75      $58.50

                                        Subtotal      $593.50
                                        Shipping         $0.00
                                        Tax (6%)        $35.61
                                        Total Due      $629.11

Shipping is waived on orders over $500.

Payment is due by August 10. A 2% discount applies to payments received within ten days of the order date. Returns are accepted within 30 days provided items are unopened; custom-cut materials are non-returnable.

Questions about this invoice may be directed to accounts@westbrooksupply.com.`,
      },
    ],
    questions: [
      {
        stem: "Why was no shipping charge applied to the order?",
        choices: [
          "The customer picked up the items directly.",
          "The order total exceeded a certain amount.",
          "The items were shipped in a single tube.",
          "The customer has an ongoing service contract.",
        ],
        answer: 1,
        type: "詳細",
        evidence: "Shipping is waived on orders over $500. / Subtotal $593.50",
        why:
          "請求書では、金額の欄と条件を書いた一文を突き合わせます。$593.50 が $500 を超えているので免除条件を満たします。数字が2か所に分かれている形は請求書の設問で頻出です。",
        choiceNotes: [
          "受け取り方法の記述はありません。Ship Date があるので発送されています。",
          "正解。waive は「（料金などを）免除する」で、Part 7 の請求書・広告でよく出ます。",
          "Storage tube は商品の1つで、発送方法とは関係ありません。表の中の語をそのまま使った誤答です。",
          "契約についての記述はありません。Terms: Net 30 は支払期限の条件です。",
        ],
      },
      {
        stem: "What must a customer do to receive a discount?",
        choices: [
          "Order more than $500 worth of goods",
          "Pay within ten days of the order date",
          "Return unopened items within 30 days",
          "Contact the accounts department in advance",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "A 2% discount applies to payments received within ten days of the order date.",
        why:
          "discount という語を目印に1文を探せば決まります。ただし起算日に注意。ここは order date（7月8日）であって、支払期限の August 10 でも Ship Date でもありません。",
        choiceNotes: [
          "$500 超は送料免除の条件です。同じ文書内の別の条件を持ってくる典型的な誤答です。",
          "正解。",
          "30日以内は返品の条件です。",
          "問い合わせ先は最後に書かれているだけで、割引の条件ではありません。",
        ],
      },
      {
        stem: "What is stated about returns?",
        choices: [
          "They require approval from the accounts department.",
          "They are accepted only within ten days.",
          "Custom-cut materials cannot be returned.",
          "Shipping costs are not refunded.",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "Returns are accepted within 30 days provided items are unopened; custom-cut materials are non-returnable.",
        why:
          "セミコロンの後ろは例外や補足を置く場所です。条件を問う設問では、but / however / provided / except とセミコロンの後ろを必ず読むこと。",
        choiceNotes: [
          "承認の記述はありません。",
          "10日は割引の条件です。返品は30日以内です。数字の入れ替えを狙った誤答です。",
          "正解。non-returnable は「返品不可」。",
          "送料の返金には触れていません。そもそも送料は免除されています。",
        ],
      },
    ],
  },

  {
    id: 8,
    chapter: 2,
    format: "single",
    docType: "求人",
    title: "求人広告",
    targetSecPerQuestion: 55,
    passages: [
      {
        label: "Job Posting",
        body: `LEDGERWOOD COMMUNITY LIBRARY
Position: Programs Coordinator (Part-Time)

Ledgerwood Community Library seeks a Programs Coordinator to plan and run public events, including author talks, children's reading hours, and seasonal workshops. This is a 25-hour-per-week position with occasional evening and weekend commitments.

RESPONSIBILITIES
- Develop a quarterly calendar of public programs
- Coordinate with visiting presenters on scheduling and equipment
- Track attendance and prepare quarterly reports for the board
- Manage the programs budget of approximately $40,000 annually

REQUIREMENTS
- Two years of experience organizing public events
- Strong written communication skills
- Familiarity with basic budgeting

A degree in library science is preferred but not required. Candidates with backgrounds in education, museums, or community organizing are encouraged to apply.

Submit a resume and a one-page description of a program you would propose for our community to hiring@ledgerwoodlibrary.org by May 20. Interviews will be held during the first week of June.`,
      },
    ],
    questions: [
      {
        stem: "What is a stated requirement for the position?",
        choices: [
          "A degree in library science",
          "Experience organizing public events",
          "A background in museum work",
          "Availability on weekday mornings",
        ],
        answer: 1,
        type: "詳細",
        evidence: "REQUIREMENTS — Two years of experience organizing public events",
        why:
          "求人では REQUIREMENTS（必須）と preferred（歓迎）を必ず区別すること。この2つの取り違えを狙う設問は Part 7 で頻出です。",
        choiceNotes: [
          "preferred but not required と明記されています。歓迎条件であって必須ではありません。",
          "正解。",
          "encouraged to apply（応募を歓迎）であって条件ではありません。",
          "勤務は occasional evening and weekend commitments とあり、平日午前の指定はありません。",
        ],
      },
      {
        stem: "What are applicants asked to submit in addition to a resume?",
        choices: [
          "Two professional references",
          "A quarterly budget proposal",
          "A description of a proposed program",
          "A copy of an academic transcript",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "Submit a resume and a one-page description of a program you would propose for our community",
        why:
          "応募書類は最終段落に書かれます。in addition to（〜に加えて）と問われたら、and で並べられたもう一方を探すこと。",
        choiceNotes: [
          "推薦者の記述はありません。求人広告でよくある要素ですが、この文書にはありません。",
          "予算管理は職務内容の1つで、応募時の提出物ではありません。",
          "正解。",
          "成績証明書の記述はありません。学位すら必須ではありません。",
        ],
      },
      {
        stem: "What is indicated about the hiring process?",
        choices: [
          "Applications will be accepted until the end of June.",
          "Interviews will take place after the application deadline.",
          "Candidates will be asked to run a sample program.",
          "The position will begin immediately after the interviews.",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "Submit ... by May 20. Interviews will be held during the first week of June.",
        why:
          "日付が2つ出てきたら前後関係を確認します。5月20日が締切、6月第1週が面接なので、面接は締切より後です。日付の順序を問う設問は複数文書でも頻出です。",
        choiceNotes: [
          "6月末は面接ではなく、締切は5月20日です。",
          "正解。",
          "模擬プログラムの実施は求められていません。求められるのは1ページの説明文です。",
          "着任時期には触れていません。",
        ],
      },
    ],
  },

  {
    id: 9,
    chapter: 2,
    format: "single",
    docType: "記事",
    title: "業界の記事",
    targetSecPerQuestion: 60,
    passages: [
      {
        label: "Article",
        body: `Small Bakeries Turn to Shared Kitchens

PORTLAND (May 14) — When Delia Marchetti outgrew her apartment oven three years ago, she faced the same choice that stops many food entrepreneurs: sign a lease she could not afford, or stop growing.

She chose a third option. Marchetti now bakes at Grainhouse, one of a growing number of commercial kitchens that rent certified space by the hour. Members book slots online, store ingredients in shared cold rooms, and share the cost of equipment that would be impossible to buy alone.

The model is not new — shared kitchens have operated in major cities since the 1990s — but demand has risen sharply. Grainhouse reported a 40 percent increase in membership last year, and two similar facilities opened in the region during the same period.

The arrangement has limits. Members cannot leave equipment set up between sessions, which makes multi-day processes difficult. Scheduling can also be tight; Marchetti books her slots six weeks ahead and says the most desirable early-morning hours fill within hours of being released.

Still, she is not looking to leave. "A lease would have doubled my costs before I had the customers to cover it," she said. "Here I pay for the hours I actually use."`,
      },
    ],
    questions: [
      {
        stem: "What is the purpose of the article?",
        choices: [
          "To review a new bakery in Portland",
          "To describe a way small food businesses find kitchen space",
          "To announce the opening of a commercial facility",
          "To compare the costs of leasing and buying equipment",
        ],
        answer: 1,
        type: "主旨",
        evidence:
          "Small Bakeries Turn to Shared Kitchens / commercial kitchens that rent certified space by the hour",
        why:
          "記事の主旨は見出しと第2段落までで決まります。個人の話（Marchetti）は具体例として置かれているだけで、主題は shared kitchens という仕組みそのものです。",
        choiceNotes: [
          "特定の店の批評ではありません。Marchetti は例として登場します。",
          "正解。",
          "2施設の開業に触れていますが、それは需要の伸びを示す根拠であって主題ではありません。本文の一部を主旨と取り違えさせる誤答です。",
          "賃借と設備購入の費用比較はしていません。",
        ],
      },
      {
        stem: "What is suggested about shared kitchens?",
        choices: [
          "They were first introduced in Portland.",
          "They have existed for several decades.",
          "They are less expensive than home kitchens.",
          "They are limited to baking businesses.",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "The model is not new — shared kitchens have operated in major cities since the 1990s",
        why:
          "since the 1990s から several decades（数十年）を導きます。年代が出てきたら、選択肢の「何年前か」という言い換えに注意すること。",
        choiceNotes: [
          "Portland が発祥だとは書かれていません。記事の舞台がそこであるだけです。地名を発祥と結び付けないこと。",
          "正解。",
          "自宅の台所との比較はありません。比較されているのは賃借（a lease）です。",
          "food entrepreneurs と広く書かれており、パン屋に限る記述はありません。",
        ],
      },
      {
        stem: "According to the article, what is a drawback of the arrangement?",
        choices: [
          "Members must purchase their own equipment.",
          "Cold storage is not available.",
          "Equipment cannot be left in place between sessions.",
          "Membership fees increased by 40 percent.",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "Members cannot leave equipment set up between sessions, which makes multi-day processes difficult.",
        why:
          "欠点を問う設問は The arrangement has limits. のような転換の一文を探すこと。その直後に列挙されます。",
        choiceNotes: [
          "share the cost of equipment とあり、むしろ共同で費用を分担しています。",
          "store ingredients in shared cold rooms とあり、冷蔵庫はあります。",
          "正解。",
          "40 percent は会員数の増加率であって会費ではありません。数字の対象をすり替えた誤答です。",
        ],
      },
      {
        stem: "What does Ms. Marchetti indicate about her costs?",
        choices: [
          "She pays only for the time she uses.",
          "She spends more than she did at home.",
          "She shares her fees with another member.",
          "She expects them to double next year.",
        ],
        answer: 0,
        type: "詳細",
        evidence: "\"Here I pay for the hours I actually use.\"",
        why:
          "記事の締めに置かれた発言は、その人の結論です。設問1つ分の情報を持っていることが多いので必ず読むこと。",
        choiceNotes: [
          "正解。",
          "自宅との比較はしていません。比較対象は借りた場合の費用です。",
          "費用の分担相手についての記述はありません。",
          "doubled は「賃借していたら倍になっていた」という仮定の話で、これからの予測ではありません。仮定法を事実として読ませる誤答です。",
        ],
      },
    ],
  },

  {
    id: 10,
    chapter: 2,
    format: "double",
    docType: "広告＋メール",
    title: "二重文書（広告と問い合わせ）",
    targetSecPerQuestion: 65,
    passages: [
      {
        label: "Advertisement",
        body: `HOLLAND & REEVE TRANSLATION
Professional Language Services Since 2004

Document Translation — from $0.14 per word
Certified Translation (legal, medical, academic) — from $0.22 per word
Website Localization — quoted per project
Same-Day Rush Service — add 50% to base rate

All translations are reviewed by a second linguist before delivery. Standard turnaround is three business days for documents under 5,000 words.

Volume discount: 10% off orders over 20,000 words.

Request a free quote at holland-reeve.com or call 555-0142.
Offices in Chicago and Toronto.`,
      },
      {
        label: "E-mail",
        body: `To: quotes@holland-reeve.com
From: n.abara@fenwickmedical.com
Date: February 3
Subject: Quote request — clinical documents

Hello,

We need three clinical trial summaries translated from English into Spanish. Together they come to roughly 8,400 words. Because these will be submitted to a regulatory body, they must be certified.

We would need them by February 10. I understand this may fall outside your standard turnaround, so please let me know if a rush fee would apply.

One more question: your website mentions a discount for large orders. Would three separate documents submitted together count as a single order for that purpose?

Thank you,
Nadia Abara
Fenwick Medical`,
      },
    ],
    questions: [
      {
        stem: "What is the purpose of the e-mail?",
        choices: [
          "To complain about a delayed translation",
          "To request pricing information for a project",
          "To apply for a position as a translator",
          "To confirm the delivery of completed documents",
        ],
        answer: 1,
        type: "主旨",
        evidence: "Subject: Quote request — clinical documents",
        why:
          "件名が目的をそのまま示しています。二重文書でも、目的を問う設問は片方の冒頭だけで解けます。",
        choiceNotes: [
          "苦情ではありません。まだ発注していません。",
          "正解。quote は「見積もり」。",
          "求人への応募ではありません。",
          "納品の確認ではありません。これから依頼する段階です。",
        ],
      },
      {
        stem: "At what rate will Ms. Abara's documents most likely be charged?",
        choices: [
          "$0.14 per word",
          "$0.22 per word",
          "A per-project quote",
          "10% off the base rate",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "広告: Certified Translation (legal, medical, academic) — from $0.22 per word ／ メール: they must be certified",
        why:
          "二重文書の典型です。メールで条件（certified・medical）を掴み、広告の料金表で該当する行を引きます。2つの文書をつなぐ語（ここでは certified）を探すのが解き方です。",
        choiceNotes: [
          "$0.14 は通常の文書翻訳です。認証翻訳ではありません。",
          "正解。",
          "per project は Website Localization の料金体系です。",
          "10% 引きは 20,000語超の条件で、8,400語では届きません。",
        ],
      },
      {
        stem: "What is suggested about Ms. Abara's deadline?",
        choices: [
          "It falls within the standard turnaround.",
          "It will likely require an additional fee.",
          "It cannot be met by the company.",
          "It was extended at her request.",
        ],
        answer: 1,
        type: "推測",
        evidence:
          "メール: Date: February 3 / We would need them by February 10 ／ 広告: Standard turnaround is three business days for documents under 5,000 words. / Same-Day Rush Service — add 50%",
        why:
          "8,400語は standard turnaround の条件（5,000語未満）を外れます。本人も this may fall outside your standard turnaround と述べており、追加料金の可能性が高いと導けます。**条件から外れる**ことに気づけるかを問う設問です。",
        choiceNotes: [
          "標準の納期条件は5,000語未満で、8,400語は対象外です。",
          "正解。",
          "対応不可とは書かれていません。追加料金の有無を尋ねている段階です。断定しすぎる選択肢に注意。",
          "期限が延長された事実はありません。",
        ],
      },
      {
        stem: "Why is Ms. Abara unlikely to receive the volume discount?",
        choices: [
          "Her order is below the required word count.",
          "The discount applies only to certified translation.",
          "She is submitting documents separately.",
          "The discount expired before February.",
        ],
        answer: 0,
        type: "推測",
        evidence:
          "広告: Volume discount: 10% off orders over 20,000 words ／ メール: roughly 8,400 words",
        why:
          "数量条件は必ず数字を突き合わせること。8,400 < 20,000 なので条件を満たしません。メール側で本人が質問している内容が、そのまま設問になる形は頻出です。",
        choiceNotes: [
          "正解。",
          "割引の対象を認証翻訳に限る記述はありません。",
          "まとめて提出するかどうかを彼女は質問していますが、そもそも語数が足りません。彼女の質問文につられて選ばせる誤答です。",
          "期限の記述はありません。",
        ],
      },
      {
        stem: "What is indicated about all translations by the company?",
        choices: [
          "They are completed within one business day.",
          "They are checked by a second linguist.",
          "They are available in Spanish only.",
          "They must be requested by telephone.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "All translations are reviewed by a second linguist before delivery.",
        why:
          "All ... で始まる一文は「全体に共通すること」を述べる場所で、設問になりやすい箇所です。料金表の下の説明文は読み飛ばさないこと。",
        choiceNotes: [
          "1営業日は Same-Day Rush Service の話で、標準は3営業日です。",
          "正解。",
          "スペイン語は依頼者側の希望言語です。会社が対応する言語の限定は書かれていません。",
          "ウェブサイトか電話のどちらでもよいと書かれています。",
        ],
      },
    ],
  },

  {
    id: 11,
    chapter: 2,
    format: "double",
    docType: "メール往復",
    title: "二重文書（問い合わせと返信）",
    targetSecPerQuestion: 65,
    passages: [
      {
        label: "E-mail 1",
        body: `To: service@northgate-appliance.com
From: t.okonkwo@mailbridge.net
Date: October 6
Subject: Order 77-2291 — wrong model delivered

Hello,

I received my order this morning, but the unit delivered is the NG-400 rather than the NG-450 I ordered. The invoice in the box lists the NG-450, so I assume the wrong item was pulled from the warehouse.

I need a working unit by October 14 for a rental property changeover. If a replacement cannot arrive by then, I would rather cancel and order elsewhere.

The box is unopened apart from the outer seal. Please advise on how to return it.

Tunde Okonkwo`,
      },
      {
        label: "E-mail 2",
        body: `To: t.okonkwo@mailbridge.net
From: service@northgate-appliance.com
Date: October 6
Subject: RE: Order 77-2291 — wrong model delivered

Dear Mr. Okonkwo,

I apologize for the error. Our warehouse confirms that two model numbers were shelved in the wrong bay last week, and yours was affected.

An NG-450 is in stock at our Fairview depot and can reach you by October 9. We will dispatch it as soon as you confirm, and a carrier will collect the NG-400 at the same visit, so you will not need to arrange a return separately.

Because the error was ours, I have applied a $60 credit to your account. It will appear within two business days and can be used on any future order.

Please reply to confirm the replacement.

Marisol Vance
Customer Service`,
      },
    ],
    questions: [
      {
        stem: "What problem does Mr. Okonkwo report?",
        choices: [
          "An item arrived damaged.",
          "An order was delivered late.",
          "The wrong model was sent.",
          "An invoice contained an error.",
        ],
        answer: 2,
        type: "主旨",
        evidence:
          "the unit delivered is the NG-400 rather than the NG-450 I ordered",
        why:
          "件名と第1文で問題が示されます。rather than は「〜ではなく」で、取り違えを述べる語です。",
        choiceNotes: [
          "破損の記述はありません。箱は未開封です。",
          "配達は当日朝に届いており、遅延ではありません。",
          "正解。",
          "請求書には正しく NG-450 と書かれています。誤りは倉庫の出荷側です。文書内の要素をずらした誤答です。",
        ],
      },
      {
        stem: "What is indicated about the cause of the problem?",
        choices: [
          "A customer entered the wrong model number.",
          "Items were stored in an incorrect location.",
          "A carrier delivered to the wrong address.",
          "The NG-450 was out of stock.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "two model numbers were shelved in the wrong bay last week, and yours was affected",
        why:
          "原因は返信側の文書にあります。二重文書では、問題の提示と原因の説明が別の文書に分かれるのが定石です。",
        choiceNotes: [
          "注文自体は正しく、請求書も NG-450 です。",
          "正解。shelve は「棚に置く」、bay は「区画」。",
          "住所の誤りではありません。届いたのは本人です。",
          "An NG-450 is in stock とあり、在庫はあります。",
        ],
      },
      {
        stem: "Will the replacement arrive in time for Mr. Okonkwo's deadline?",
        choices: [
          "Yes, five days before it",
          "Yes, on the day of the deadline",
          "No, it will arrive one day late",
          "No, the item must be ordered elsewhere",
        ],
        answer: 0,
        type: "推測",
        evidence:
          "メール1: I need a working unit by October 14 ／ メール2: can reach you by October 9",
        why:
          "2つの文書にまたがる日付の比較です。10月9日は10月14日の5日前なので間に合います。日付が別々の文書に置かれている形は、二重文書で最も出やすい設問です。",
        choiceNotes: [
          "正解。",
          "当日ではなく5日前です。",
          "遅れません。",
          "他社での購入は、間に合わない場合の代替案として本人が挙げただけです。仮定の話を事実として読ませる誤答です。",
        ],
      },
      {
        stem: "What does Ms. Vance say about returning the NG-400?",
        choices: [
          "It should be shipped back at the customer's expense.",
          "It will be collected when the replacement is delivered.",
          "It may be kept at no charge.",
          "It must be returned within two business days.",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "a carrier will collect the NG-400 at the same visit, so you will not need to arrange a return separately",
        why:
          "設問の returning を目印に探します。collect（引き取る）が選択肢では be collected に言い換えられています。",
        choiceNotes: [
          "so you will not need to arrange a return separately とあり、手配は不要です。",
          "正解。",
          "無償で保持できるとは書かれていません。引き取られます。",
          "two business days は $60 のクレジットが反映されるまでの期間です。数字の対象をすり替えた誤答です。",
        ],
      },
      {
        stem: "What is suggested about the $60 credit?",
        choices: [
          "It must be used within two business days.",
          "It was requested by Mr. Okonkwo.",
          "It can be applied to a later purchase.",
          "It replaces the cost of the NG-450.",
        ],
        answer: 2,
        type: "推測",
        evidence:
          "It will appear within two business days and can be used on any future order.",
        why:
          "and で結ばれた2つの情報を切り分けること。「2営業日」は反映までの期間、「将来の注文に使える」は用途です。ここを混ぜると誤答を選びます。",
        choiceNotes: [
          "2営業日は反映までの期間で、使用期限ではありません。",
          "本人は要求していません。Because the error was ours と、会社側の判断です。",
          "正解。",
          "商品代金の肩代わりではありません。NG-450 は別途発送されます。",
        ],
      },
    ],
  },

  {
    id: 12,
    chapter: 2,
    format: "triple",
    docType: "メール＋日程＋社内連絡",
    title: "三重文書（研修の調整）",
    targetSecPerQuestion: 70,
    passages: [
      {
        label: "E-mail",
        body: `To: All Regional Staff
From: Priya Sandhu, Training Lead
Date: November 3
Subject: December safety refresher — sign-up

Everyone,

Our annual safety refresher takes place the week of December 8. Three sessions are offered so that shift coverage is not affected. Each session covers the same material; attend whichever fits your schedule.

Sign up through the staff portal by November 21. If none of the three works for you, reply to me directly and I will arrange a make-up session in January.

Note that the Thursday session is held at the Eastside facility, not at headquarters.

Priya`,
      },
      {
        label: "Schedule",
        body: `SAFETY REFRESHER — DECEMBER SESSIONS

Monday, December 8, 9:00–11:30 A.M. — Headquarters, Room 110
Wednesday, December 10, 1:00–3:30 P.M. — Headquarters, Room 110
Thursday, December 11, 8:00–10:30 A.M. — Eastside Facility, Training Bay

All sessions include a written assessment in the final thirty minutes.
Bring your employee badge; it is required for entry at both locations.`,
      },
      {
        label: "Memo",
        body: `MEMO
To: Warehouse Team B
From: Ken Adeyemi, Shift Supervisor
Date: November 5

Team B covers the morning shift on December 8 and December 11. Those of you on those shifts should choose the Wednesday session so that we are not short-handed.

If you have already signed up for another session, let me know by Friday and I will look at swapping coverage.

Also, the Eastside location has no visitor parking. Anyone attending there should plan to use the transit line or arrange a ride.

Ken`,
      },
    ],
    questions: [
      {
        stem: "What is the purpose of Ms. Sandhu's e-mail?",
        choices: [
          "To announce a change in safety procedures",
          "To ask staff to register for a training session",
          "To report the results of an assessment",
          "To introduce a new training facility",
        ],
        answer: 1,
        type: "主旨",
        evidence: "Subject: December safety refresher — sign-up / Sign up through the staff portal by November 21.",
        why:
          "三重文書でも、目的を問う設問は1つ目の文書の件名と冒頭で決まります。3つ全部を読んでから解き始めないこと。",
        choiceNotes: [
          "手順の変更ではなく、既存の内容の再確認研修です。",
          "正解。",
          "評価は研修中に行われるもので、結果の報告ではありません。",
          "Eastside は会場の1つとして触れられているだけで、新設の紹介ではありません。",
        ],
      },
      {
        stem: "Which session should members of Team B attend?",
        choices: [
          "Monday, December 8",
          "Wednesday, December 10",
          "Thursday, December 11",
          "A make-up session in January",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "メモ: Those of you on those shifts should choose the Wednesday session ／ 日程: Wednesday, December 10",
        why:
          "指示はメモにあり、曜日から日付を引くのが日程表です。三重文書では「誰が言っているか」を必ず確認すること。ここは Sandhu ではなく上司の Adeyemi の指示です。",
        choiceNotes: [
          "12月8日は Team B が朝勤に入る日です。",
          "正解。",
          "12月11日も Team B が朝勤に入る日で、しかも Eastside 開催です。",
          "1月の補講は3つとも都合が合わない人向けです。",
        ],
      },
      {
        stem: "What is required for entry to the sessions?",
        choices: [
          "A completed sign-up form",
          "An employee badge",
          "A parking permit",
          "Approval from a shift supervisor",
        ],
        answer: 1,
        type: "詳細",
        evidence:
          "Bring your employee badge; it is required for entry at both locations.",
        why:
          "持ち物や入場条件は日程表の欄外に書かれます。3文書のうちどこに書かれているかを探す設問で、required という語が目印になります。",
        choiceNotes: [
          "登録はポータルで行うもので、当日持参する書類ではありません。",
          "正解。",
          "Eastside には来客用駐車場がないという記述はありますが、許可証の話はありません。",
          "上司の承認は入場条件ではありません。",
        ],
      },
      {
        stem: "What problem does Mr. Adeyemi mention about the Eastside facility?",
        choices: [
          "It is farther from the transit line.",
          "It does not have visitor parking.",
          "Its training room is smaller.",
          "It opens later than headquarters.",
        ],
        answer: 1,
        type: "詳細",
        evidence: "the Eastside location has no visitor parking",
        why:
          "Eastside は3つの文書すべてに登場します。設問が「誰が述べたか」を指定しているときは、その人の文書だけを見ること。",
        choiceNotes: [
          "むしろ transit line の利用を勧めており、遠いとは書かれていません。反対の内容にした誤答です。",
          "正解。",
          "部屋の広さには触れていません。",
          "木曜の Eastside は 8:00 開始で、他の2つより早い時間です。",
        ],
      },
      {
        stem: "What should an employee do if none of the three sessions is possible?",
        choices: [
          "Contact Mr. Adeyemi by Friday",
          "Sign up through the staff portal anyway",
          "Reply directly to Ms. Sandhu",
          "Attend the written assessment only",
        ],
        answer: 2,
        type: "詳細",
        evidence:
          "If none of the three works for you, reply to me directly and I will arrange a make-up session in January.",
        why:
          "条件文（If ...）は、そのまま設問の条件になります。誰に連絡するのかを取り違えないよう、その文書の書き手を確認すること。ここは Sandhu のメールです。",
        choiceNotes: [
          "Adeyemi への金曜連絡は「すでに別のセッションに登録済みの人」向けです。別の条件と混ぜた誤答です。",
          "3つとも無理な場合の話なので、登録はできません。",
          "正解。",
          "筆記評価だけの受講は認められていません。",
        ],
      },
    ],
  },
];

export function readingSetsInChapter(chapterId: number): ReadingSet[] {
  return READING_SETS.filter((s) => s.chapter === chapterId);
}
