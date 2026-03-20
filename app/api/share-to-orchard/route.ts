import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { userId, routeId, goal, comment, variety, note, source,
      moodScore, stepDay, stepTitle, diagnosisText, chartData } = await req.json();

    if (!userId || !routeId) {
      return Response.json({ error: "userId と routeId が必要" }, { status: 400 });
    }

    await addDoc(collection(db, "orchard_posts"), {
      userId,
      routeId,
      goal: goal || "",
      comment: comment || "",
      variety: variety || "forest",
      note: note || "",
      source: source || "garden",
      moodScore: moodScore || null,
      stepDay: stepDay || null,
      stepTitle: stepTitle || null,
      diagnosisText: diagnosisText || null,
      chartData: chartData || null,
      createdAt: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "投稿失敗" }, { status: 500 });
  }
}