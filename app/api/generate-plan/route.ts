import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: "us-central1",
});

// ... stepSchema, planSchema は既存のまま ...

export async function POST(req: Request) {
  try {
    const { goal, durationDays, message } = await req.json();

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
        contents: `以下の目標を達成するための、現在（2025年）最も効果的・最新の学習方法、ツール、リソースをGoogle検索で調べてください。
        
目標: ${goal}

以下の観点で調べてください：
- 最新バージョンや最新トレンド
- 現在最も推奨されているツールやサービス
- 効率的な学習順序や方法論
- 初心者〜中級者向けの具体的なリソース

検索結果をもとに、重要な情報を200文字以内で日本語でまとめてください。`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      searchContext = searchResponse.text ?? "";
    } catch (e) {
      // 検索失敗してもプラン生成は続行
      console.warn("Search grounding failed, continuing without it:", e);
    }

    // ── Step2: 検索情報を注入してプラン生成 ──
    const prompt = `
あなたは目標達成を支援するプランナーです。
以下の目標に対して、哲学が全く異なる3つのプランを作成してください。

目標: ${goal}
ユーザー希望期間(日): ${durationDays}
メッセージ: ${message ?? "なし"}

${searchContext ? `【Google検索で得た最新情報】
${searchContext}
上記の最新情報を必ずプランのステップに反映させてください。特にFlow Stateプランでは具体的なツール名を含めること。
` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━
【プラン1】style: "full_throttle"
styleLabel: "Full Throttle"
styleEmoji: "⚡"
philosophy: 速度と密度で圧倒する。今すぐ結果を出す。
tagline: 最速で、限界の向こう側へ。

期間ルール:
- ユーザー希望期間を「上限」として扱う
- 最短は希望期間の3分の1まで許容
- intensityLevel: 5
- 禁止ワード：「無理せず」「少しずつ」「ゆっくり」

━━━━━━━━━━━━━━━━━━━━━━━━━
【プラン2】style: "wayfinder"
styleLabel: "Wayfinder"
styleEmoji: "🧭"
philosophy: 納得と理解を積み重ねる。自分の地図を自分で描く。
tagline: 正解より納得を。本物の力をつける旅。

期間ルール:
- ユーザー希望期間（${durationDays}日）をそのまま recommendedDays に設定
- intensityLevel: 3
- 禁止ワード：「効率」「最短」「ショートカット」

━━━━━━━━━━━━━━━━━━━━━━━━━
【プラン3】style: "flow_state"
styleLabel: "Flow State"
styleEmoji: "🌊"
philosophy: 毎日15分でも続く習慣に変換する。AIと道具を賢く使い、消耗しない。
tagline: 頑張らずに、仕組みで進む。

期間ルール:
- ユーザー希望期間より長くして良い（最大1.5倍まで）
- 必ず具体的なツール・アプリ名を1ステップ以上に含めること
- intensityLevel: 2
- 禁止ワード：「集中して」「まとめて」「一気に」

━━━━━━━━━━━━━━━━━━━━━━━━━
出力ルール:
- 3つのプランは明確に性格が違うこと
- 日本語で出力
- JSONのみを出力し、解説などは含めないこと
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: { type: Type.ARRAY, items: planSchema },
          },
          required: ["plans"],
        },
      },
    });

    const text = response.text;
    const data = JSON.parse(text);
    return Response.json(data);

  } catch (error) {
    console.error(error);
    return Response.json({ error: "プラン生成に失敗しました" }, { status: 500 });
  }
}