import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { RouteDoc } from "@/types/route";

export async function saveRoute(route: RouteDoc) {
  const docRef = await addDoc(collection(db, "routes"), route);
  return docRef.id;
}

export async function getRoute(routeId: string) {
  const docRef = doc(db, "routes", routeId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("ルートが見つかりません");
  }

  return { id: snap.id, ...snap.data() };
}

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

  await updateDoc(doc(db, "routes", routeId), {
    steps,
    progress,
  });
}