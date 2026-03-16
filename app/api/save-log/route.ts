import { saveLog } from "@/lib/firestore";
import { getAppleStats } from "@/lib/apple";
import { LogDoc } from "@/types/log";

export async function POST(req: Request) {
  try {
    const { userId, routeId, moodScore, note, variety, comment } = await req.json();

    if (!userId || !routeId || !moodScore) {
      return Response.json(
        { error: "userId, routeId, moodScore は必須です" },
        { status: 400 }
      );
    }

    const apple = getAppleStats(Number(moodScore));

    const log: LogDoc = {
      userId,
      routeId,
      moodScore: Number(moodScore),
      note: note ?? "",
      variety: variety || "forest",
      appleColor: apple.color,
      appleSize: apple.size,
      comment: apple.message,
      createdAt: new Date().toISOString(),
    };

    const logId = await saveLog(log);

    return Response.json({
      success: true,
      logId,
      apple,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "感情ログの保存に失敗しました" },
      { status: 500 }
    );
  }
}