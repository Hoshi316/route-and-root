import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { routeId, isPublic } = await req.json();
    const routeRef = doc(db, "routes", routeId);

    await updateDoc(routeRef, {
      isPublic: isPublic,
      sharedAt: isPublic ? new Date().toISOString() : null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "更新失敗" }, { status: 500 });
  }
}