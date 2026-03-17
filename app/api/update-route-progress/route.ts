// app/api/update-route-progress/route.ts
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { routeId, nutrition, pendingApples, variety, hasGrown} = await req.json();

    if (!routeId) return Response.json({ error: "routeIdが必要" }, { status: 400 });

    const routeRef = doc(db, "routes", routeId);
    
    // 農園の状態（成長度、リンゴ、今の品種）をFirestoreに上書き保存
    await updateDoc(routeRef, {
      nutrition: nutrition,
      pendingApples: pendingApples,
      currentVariety: variety,
      hasGrown: hasGrown
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "保存失敗" }, { status: 500 });
  }
}