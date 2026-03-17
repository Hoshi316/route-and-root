// app/api/get-route/route.ts
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get("routeId");

  if (!routeId) return Response.json({ error: "routeIdが必要" }, { status: 400 });

  try {
    const routeRef = doc(db, "routes", routeId);
    const routeSnap = await getDoc(routeRef);

    if (!routeSnap.exists()) {
      return Response.json({ error: "ルートが見つかりません" }, { status: 404 });
    }

    // goal(目標名), nutrition(養分), pendingApples(未収穫リンゴ) などを返す
    return Response.json({ id: routeSnap.id, ...routeSnap.data() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "取得失敗" }, { status: 500 });
  }
}