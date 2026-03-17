import { addDoc, collection, doc, getDoc, updateDoc, setDoc ,deleteDoc} from "firebase/firestore"; // setDocを追加
import { db } from "./firebase";
import { RouteDoc } from "@/types/route";
import { LogDoc } from "@/types/log";
import { query, where, orderBy, getDocs } from "firebase/firestore"; // インポートを追加

/**
 * ユーザー情報を Firestore の users コレクションに保存する
 * 仕様書の users/{uid} 設計に基づく
 */
export async function saveUser(user: { uid: string; displayName: string | null; email: string | null }) {
  const userRef = doc(db, "users", user.uid);
  
  // UserDoc 型の定義に合わせてデータをセット
  await setDoc(userRef, {
    displayName: user.displayName || "匿名ユーザー",
    email: user.email,
    createdAt: new Date().toISOString(),
  }, { merge: true }); // 既存のフィールドを保持しつつ更新・作成する設定
}

/**
 * ルート（旅のしおり）を新規保存する
 */
export async function saveRoute(route: RouteDoc) {
  const docRef = await addDoc(collection(db, "routes"), route); //
  return docRef.id;
}

/**
 * 指定したルートの情報を取得する
 */
export async function getRoute(routeId: string) {
  const docRef = doc(db, "routes", routeId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("ルートが見つかりません");
  }

  return { id: snap.id, ...snap.data() };
}

/**
 * ステップの完了状態を更新し、進捗率を再計算する
 */
export async function updateStepDone(
  routeId: string,
  steps: RouteDoc["steps"]
) {
  const progress =
    steps.length === 0
      ? 0
      : Math.round(
          (steps.filter((step) => step.done).length / steps.length) * 100
        );

  await updateDoc(doc(db, "routes", routeId), { //
    steps,
    progress,
  });
}

/**
 * 感情ログ（リンゴの成長記録）を保存する
 */
export async function saveLog(log: LogDoc) {
  const docRef = await addDoc(collection(db, "logs"), log); //
  return docRef.id;
}

export async function getUserLogs(userId: string) {
  // queryの中から「orderBy」を一旦消します！
  const q = query(
    collection(db, "logs"),
    where("userId", "==", userId)
    // orderBy("createdAt", "desc") // ★ ここをコメントアウト！
  );

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[];
}

export async function getUserRoutes(userId: string) {
  const q = query(
    collection(db, "routes"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as RouteDoc),
  }));
}

export async function deleteUserLog(logId: string) {
  const logRef = doc(db, "logs", logId);
  await deleteDoc(logRef);
}