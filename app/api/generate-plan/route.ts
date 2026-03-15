import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { goal, durationDays, message } = await req.json();

    if (!goal || !durationDays) {
      return Response.json(
        { error: "goal と durationDays は必須です" },
        { status: 400 }
      );
    }

    const prompt = `
あなたは学習・目標達成を支援するプランナーです。
以下の情報をもとに、現実的で短い達成プランを作ってください。

目標: ${goal}
期間(日): ${durationDays}
メッセージ: ${message ?? ""}

条件:
- steps は 3〜7 個
- 各 step は短く具体的に
- scheduledDay は 1 以上 ${durationDays} 以下
- 日本語で出力
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goal: {
              type: Type.STRING,
            },
            summary: {
              type: Type.STRING,
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  scheduledDay: { type: Type.INTEGER },
                },
                required: ["title", "description", "scheduledDay"],
              },
            },
          },
          required: ["goal", "summary", "steps"],
        },
      },
    });

    const text = response.text;
    const plan = JSON.parse(text);

    return Response.json(plan);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "プラン生成に失敗しました" },
      { status: 500 }
    );
  }
}