"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function UsernameSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async () => {
    if (!username.trim()) return setError("ユーザーネームを入力してください");
    if (username.length > 20) return setError("20文字以内で入力してください");
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          username: username.trim(),
        }),
      });
      router.push("/history");
    } catch (e) {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-xl border border-orange-100">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">旅人の名前を決めよう</h1>
          <p className="text-sm text-slate-400 font-bold">直売所で表示される名前です</p>
        </div>
        <div className="mb-6">
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            placeholder="例：たびびと太郎"
            maxLength={20}
            className="w-full rounded-2xl border-2 border-orange-100 bg-orange-50 p-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all"
          />
          <div className="flex justify-between mt-2">
            {error ? <p className="text-xs text-red-400 font-bold">{error}</p> : <span />}
            <p className="text-xs text-slate-300 font-bold ml-auto">{username.length}/20</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !username.trim()}
          className="w-full py-4 rounded-2xl font-black text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "この名前で旅を始める 🍎"}
        </button>
      </div>
    </div>
  );
}