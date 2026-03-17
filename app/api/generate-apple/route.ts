import { GoogleGenAI, Type } from "@google/genai";

// 他のAPI（generate-planなど）と同じ設定を使用
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: "us-central1",
});

export async function POST(req: Request) {
  try {
    const { moodScore, note, image } = await req.json();

    // 1. 品種をスコア(1-5)でガッチリ固定（データの整合性を守る）
    const varietyMap: Record<number, string> = {
      1: 'forest',   // 静かな森（低め）
      2: 'moon',     // 穏やかな月（少し低め）
      3: 'midnight', // 真夜中の集中（普通）
      4: 'sun',      // 太陽の情熱（高め）
      5: 'rare'      // 黄金の果実（最高！）
    };
    const fixedVariety = varietyMap[Number(moodScore)] || 'forest';

    // 2. AIへの入力パーツを組み立て
    const prompt = `あなたは不思議な農園の園主です。
ユーザーが「今日頑張ったこと」を報告してきました。

【入力情報】
- やる気Lv: ${moodScore}/5
- ユーザーのメモ: ${note || "（メモなし）"}

【あなたの仕事】
1. 画像が送られてきている場合、その内容（本、ノート、プログラム、計算、運動など）を具体的に読み取ってください。
2. ユーザーの努力を15文字以内で、温かく、かつ具体的に褒めてください。
例（画像に数式がある場合）：「難しい計算、頑張ったね！」
例（画像にコードがある場合）：「綺麗なコード、実りの予感だね」
例（画像がない場合）：「一歩ずつの歩みが、栄養だよ」

※「」や解説は不要です。メッセージのみを返してください。`;

    const contentParts: any[] = [{ text: prompt }];

    // ★ 画像（Base64形式）がある場合、Geminiが理解できる形式に変換して追加
    if (image && image.includes(",")) {
      const base64Data = image.split(",")[1]; // "data:image/jpeg;base64,..." のカンマ以降
      const mimeType = image.split(";")[0].split(":")[1]; // mimeTypeの取得

      contentParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    // 3. Geminiを呼び出し（Vision機能を使用）
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // 画像解析が得意で高速なモデル
      contents: [{ role: "user", parts: contentParts }],
    });

    const aiMessage = response.text?.trim() || "一歩ずつ進みましょう。";

    // 4. フロントエンドが期待する形式で返却
    return Response.json({
      variety: fixedVariety,
      message: aiMessage
    });

  } catch (error) {
    console.error("Gemini Multi-modal Error:", error);
    return Response.json({ 
      variety: "forest", 
      message: "木が静かに成長を見守っています。" 
    });
  }
}