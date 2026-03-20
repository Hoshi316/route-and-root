import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: "us-central1",
});

const stepSchema = {
  type: Type.OBJECT,
  properties: {
    title:        { type: Type.STRING, description: "15文字以内" },
    description:  { type: Type.STRING, description: "40文字以内" },
    scheduledDay: { type: Type.INTEGER },
  },
  required: ["title", "description", "scheduledDay"],
};

const phaseSchema = {
  type: Type.OBJECT,
  properties: {
    title:          { type: Type.STRING, description: "フェーズ名（例：基礎固め）" },
    startDay:       { type: Type.INTEGER },
    endDay:         { type: Type.INTEGER },
    description:    { type: Type.STRING, description: "このフェーズの目標を1文で" },
  },
  required: ["title", "startDay", "endDay", "description"],
};

const planSchema = {
  type: Type.OBJECT,
  properties: {
    style:           { type: Type.STRING },
    styleLabel:      { type: Type.STRING },
    styleEmoji:      { type: Type.STRING },
    philosophy:      { type: Type.STRING },
    tagline:         { type: Type.STRING },
    suitableFor:     { type: Type.STRING },
    tradeoff:        { type: Type.STRING },
    intensityLevel:  { type: Type.INTEGER },
    recommendedDays: { type: Type.INTEGER },
    daysComment:     { type: Type.STRING },
    goal:            { type: Type.STRING },
    summary:         { type: Type.STRING },
    steps:           { type: Type.ARRAY, items: stepSchema },
  },
  required: [
    "style", "styleLabel", "styleEmoji",
    "philosophy", "tagline", "suitableFor", "tradeoff",
    "intensityLevel", "recommendedDays", "daysComment",
    "goal", "summary", "steps",
  ],
};

export async function POST(req: Request) {
  try {
    const { goal, durationDays, message, userHistory } = await req.json();

    if (!goal || !durationDays) {
      return Response.json(
        { error: "goal と durationDays は必須です" },
        { status: 400 }
      );
    }

    // ── Step1: Google検索で最新情報を収集 ──
    let searchContext = "";
    try {
      const searchResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `以下の目標を達成するための、現在最も効果的・最新の学習方法、ツール、リソースをGoogle検索で調べてください。

目標: ${goal}

以下の観点で調べてください：
- 最新バージョンや最新トレンド（2024〜2025年）
- 現在最も推奨されているツールやサービス名（具体的に）
- 効率的な学習順序や方法論
- 初心者〜中級者向けの具体的なリソース名やサイト名

検索結果をもとに、重要な情報を箇条書きで300文字以内で日本語でまとめてください。`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      searchContext = searchResponse.text ?? "";
    } catch (e) {
      console.warn("Search grounding skipped:", e);
    }

    // ── Step2: 3プラン生成 + おすすめ選定 ──
    const prompt = `
あなたは目標達成を支援する、ユーザーの専任コーチです。
以下の情報をもとに、3つのプランを作成し、その中からユーザーに最適な1つを推薦してください。

目標: ${goal}
ユーザー希望期間(日): ${durationDays}
ユーザーのメッセージ: ${message || "なし"}

【ユーザーの過去の実績】
${userHistory || "過去の旅の記録なし（初回ユーザー）"}

${searchContext ? `【Google検索で得た最新情報 - ステップに反映すること】
${searchContext}
` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━
【プラン1】style: "full_throttle"
styleLabel: "Full Throttle" / styleEmoji: "⚡"
philosophy: 速度と密度で圧倒する。今すぐ結果を出す。
tagline: 最速で、限界の向こう側へ。
- 希望期間を上限として最短日数を設定（最短は3分の1まで）
- ステップ3〜4個・高密度
- intensityLevel: 5
- 禁止ワード：「無理せず」「少しずつ」「ゆっくり」

【プラン2】style: "wayfinder"
styleLabel: "Wayfinder" / styleEmoji: "🧭"
philosophy: 納得と理解を積み重ねる。自分の地図を自分で描く。
tagline: 正解より納得を。本物の力をつける旅。
- 希望期間（${durationDays}日）そのまま使用
- ステップ5〜7個・各ステップに理由を含める
- intensityLevel: 3
- 禁止ワード：「効率」「最短」「ショートカット」

【プラン3】style: "flow_state"
styleLabel: "Flow State" / styleEmoji: "🌊"
philosophy: 毎日15分でも続く習慣に変換する。AIと道具を賢く使い、消耗しない。
tagline: 頑張らずに、仕組みで進む。
- 希望期間の最大1.5倍まで延長可
- 1日15〜30分の最小単位に分解
- 具体的なツール名を2つ以上含める
- intensityLevel: 2
- 禁止ワード：「集中して」「まとめて」「一気に」

━━━━━━━━━━━━━━━━━━━━━━━━━
【おすすめの選定】
上記3つのプランを作成した後、以下の観点でユーザーに最適な1つを選んでください：

判断基準（優先度順）：
1. ユーザーの過去の完遂率（低ければ負荷の軽いプランを推薦）
2. ユーザーのメッセージのトーン（忙しそうならflow_state、やる気満々ならfull_throttle）
3. 目標の性質（知識習得ならwayfinder、スキル習得ならfull_throttle）
4. 初回ユーザーの場合はwayfinderを推薦

recommendedStyle: "full_throttle" / "wayfinder" / "flow_state" のいずれか
recommendationMessage: 推薦理由を「ユーザーの状況に寄り添った」温かい口調で2〜3文で。
  過去データがある場合は必ずそれに言及すること。
  例：「以前のFull Throttleでは3日目で失速されていましたね。今回はFlow Stateで
  毎日小さく積み上げる方が、きっと最後まで走り切れると思います。」

━━━━━━━━━━━━━━━━━━━━━━━━━
出力ルール（厳守）:
- 3つのプランは明確に性格が違うこと
- 日本語で出力
- JSONのみを出力すること

【文字数制限 - これを最優先で守ること】
- philosophy: 20文字以内
- tagline: 20文字以内
- suitableFor: 30文字以内
- tradeoff: 30文字以内
- daysComment: 25文字以内
- summary: 40文字以内
- recommendationMessage: 60文字以内
- steps.title: 15文字以内
- steps.description: 40文字以内

長い文章は必ず削れ。無駄な情報を削ぎ落とすことがこのプランナーの美学である。
【フェーズ分割ルール】
- 期間が14日以下：phases は1つ（全体を1フェーズ）
- 期間が15〜60日：phases は2〜3つ
- 期間が61日以上：phases は3〜5つ
- 各フェーズにタイトルをつけること（例：「第1章：基礎固め」「第2章：実践編」）
- フェーズのstartDayとendDayはstepsのscheduledDayと整合させること
`
;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: { type: Type.ARRAY, items: planSchema },
            recommendedStyle: { type: Type.STRING },
            recommendationMessage: { type: Type.STRING },
          },
          required: ["plans", "recommendedStyle", "recommendationMessage"],
        },
      },
    });

    const text = response.text;
    const data = JSON.parse(text);
    return Response.json(data);

  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "プラン生成に失敗しました" },
      { status: 500 }
    );
  }
}