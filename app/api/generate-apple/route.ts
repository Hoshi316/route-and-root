import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { moodScore, note } = await req.json();

    // ★ 1. 品種をスコアで「絶対」に固定する
    const varietyMap: Record<number, string> = {
      1: 'forest',   // 低め
      2: 'moon',     // 少し低
      3: 'midnight', // 普通
      4: 'sun',      // 高め
      5: 'rare'      // 最高
    };
    const fixedVariety = varietyMap[moodScore] || 'forest';

    // ★ 2. AIには「メッセージだけ」を作らせる（JSON形式を指定しない方が速くて安定します）
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `あなたは不思議な農園のガイドです。
      ユーザーの今の状態に合わせた、短く温かい「園主の言葉」を1つだけ作成してください。
      気分レベル: ${moodScore}/5
      メモ: ${note || "（なし）"}
      ※15文字以内で、優しく語りかけてください。`;

    const result = await model.generateContent(prompt);
    const aiMessage = result.response.text().trim();

    // ★ 3. 自分で組み立てて返す
    return Response.json({
      variety: fixedVariety,
      message: aiMessage
    });

  } catch (error) {
    console.error(error);
    return Response.json({ variety: "forest", message: "一歩ずついきましょう。" });
  }
}