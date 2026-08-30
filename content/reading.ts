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
];

export function readingSetsInChapter(chapterId: number): ReadingSet[] {
  return READING_SETS.filter((s) => s.chapter === chapterId);
}
