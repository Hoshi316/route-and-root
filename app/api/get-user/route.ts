import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) return Response.json({ error: "uid が必要" }, { status: 400 });

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return Response.json({ exists: false });
    return Response.json({ exists: true, ...snap.data() });
  } catch (error) {
    return Response.json({ error: "取得失敗" }, { status: 500 });
  }
}