// app/api/update-progress/route.ts
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { routeId, nutrition, pendingApples, variety } = await req.json();

    if (!routeId) {
      return Response.json({ error: "routeIdは必須です" }, { status: 400 });
    }

    const routeRef = doc(db, "routes", routeId);
    
    // Firestoreのルート情報を更新（養分、溜まっているリンゴ、今の品種を保存）
    await updateDoc(routeRef, {
      nutrition: nutrition,
      pendingApples: pendingApples,
      currentVariety: variety
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "進捗の保存に失敗しました" }, { status: 500 });
  }
}