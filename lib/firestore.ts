import { addDoc, collection, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { RouteDoc } from "@/types/route";
import { LogDoc } from "@/types/log";
import { query, where, orderBy, getDocs } from "firebase/firestore";

export async function saveUser(user: { uid: string; displayName: string | null; email: string | null }) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    displayName: user.displayName || "匿名ユーザー",
    email: user.email,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveRoute(route: RouteDoc) {
  const docRef = await addDoc(collection(db, "routes"), route);
  return docRef.id;
}

export async function getRoute(routeId: string) {
  const docRef = doc(db, "routes", routeId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("ルートが見つかりません");
  return { id: snap.id, ...snap.data() };
}

export async function updateStepDone(routeId: string, steps: RouteDoc["steps"]) {
  const progress =
    steps.length === 0
      ? 0
      : Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
  await updateDoc(doc(db, "routes", routeId), { steps, progress });
}

export async function saveLog(log: LogDoc) {
  const docRef = await addDoc(collection(db, "logs"), log);
  return docRef.id;
}

export async function getUserLogs(userId: string) {
  const q = query(
    collection(db, "logs"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
}

export async function getUserRoutes(userId: string) {
  const q = query(
    collection(db, "routes"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as RouteDoc) }));
}

export async function deleteUserLog(logId: string) {
  await deleteDoc(doc(db, "logs", logId));
}

export async function getActiveRoutes(userId: string) {
  const q = query(
    collection(db, "routes"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as RouteDoc) }));
}

export async function getUserRouteSummary(userId: string): Promise<string> {
  try {
    const q = query(
      collection(db, "routes"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const routes = snap.docs.map((doc) => ({ ...(doc.data() as RouteDoc) }));

    if (routes.length === 0) return "過去の旅の記録なし（初回ユーザー）";

    const summary = routes.slice(0, 5).map((r) => {
      const total = r.steps.length;
      const done = r.steps.filter((s) => s.done).length;
      const rate = total === 0 ? 0 : Math.round((done / total) * 100);
      return `・目標「${r.goal}」: 完遂率${rate}%（${done}/${total}ステップ完了）`;
    }).join("\n");

    return summary;
  } catch {
    return "過去データ取得失敗";
  }
}