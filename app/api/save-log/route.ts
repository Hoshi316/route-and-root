import { saveLog } from "@/lib/firestore";
import { APPLE_COLORS, AppleVariety } from "@/lib/apple";
import { LogDoc } from "@/types/log";

export async function POST(req: Request) {
  try {
    const { userId, routeId, routeName, moodScore, note, variety, comment, source, stepDay, stepTitle } = await req.json();

    if (!userId || !routeId || !moodScore) {
      return Response.json({ error: "userId, routeId, moodScore は必須です" }, { status: 400 });
    }

    const log: LogDoc = {
      userId,
      routeId,
      moodScore: Number(moodScore),
      note: note ?? "",
      variety: variety || "forest",
      routeName: routeName || "不明な旅路",
      appleColor: APPLE_COLORS[variety as AppleVariety] || "#10b981",
      appleSize: 100,
      comment: comment || "",
      createdAt: new Date().toISOString(),
      source: source || "garden",
      stepDay: stepDay ?? null,
      stepTitle: stepTitle ?? null,
    };

    const logId = await saveLog(log);
    return Response.json({ success: true, logId, variety: log.variety, color: log.appleColor });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "感情ログの保存に失敗しました" }, { status: 500 });
  }
}