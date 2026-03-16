import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { moodScore, note } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            variety: { 
              type: SchemaType.STRING, 
              enum: ["sun", "moon", "midnight", "forest", "rare"],
              format: "string", // ★ これを追加！
            },
            message: { 
              type: SchemaType.STRING,
              format: "string", // ★ 念のためここにも追加しておくと安心です
            },
          },
          required: ["variety", "message"],
        }as any,
      },
    });

    const prompt = `
      あなたは旅のガイドです。ユーザーの今の状態から、育つリンゴの品種を決めてください。
      
      【入力】
      気分スコア: ${moodScore ?? "未指定"}
      メモ: ${note ?? "未入力"}

      【判定基準】
      - ポジティブ、活動的なら "sun"
      - 穏やか、リラックスなら "moon"
      - 悩み、疲れ、内省的なら "midnight"
      - 日常、フラットなら "forest"
      - 非常に強い感情や珍しい体験なら "rare"
      
      同じ気分スコアが続いていても、メモの微妙なニュアンスから品種を変えても構いません。
    `;

    const result = await model.generateContent(prompt);
    return Response.json(JSON.parse(result.response.text()));
  } catch (error) {
    console.error(error);
    return Response.json({ variety: "forest", message: "一歩ずつ進みましょう。" });
  }
}