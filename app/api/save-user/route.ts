import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { uid, displayName, email, username } = await req.json();
    const userRef = doc(db, "users", uid);

    await setDoc(userRef, {
      displayName: displayName || "匿名ユーザー",
      email,
      username: username || displayName || "旅人",
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "保存失敗" }, { status: 500 });
  }
}