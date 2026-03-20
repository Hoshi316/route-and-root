import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { targetRouteId } = await req.json();

    if (!targetRouteId) {
      return Response.json({ error: "targetRouteIdが必要" }, { status: 400 });
    }

    const routeRef = doc(db, "routes", targetRouteId);

    // 🐝 pendingBees（未受取のハチ）を1増やす
    // Firestoreの increment 関数を使うことで、同時に複数人から送られても正確に加算されます
    await updateDoc(routeRef, {
      pendingBees: increment(1)
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("ミツバチ送信エラー:", error);
    return Response.json({ error: "送信失敗" }, { status: 500 });
  }
}