"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signInWithGoogle, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
  try {
    const user = await signInWithGoogle();
    const res = await fetch(`/api/get-user?uid=${user.uid}`);
    const data = await res.json();

    if (!data.exists || !data.username) {
      // username未設定の場合のみセットアップへ
      router.push("/username-setup");
    } else {
      // 既存ユーザーはそのまま
      router.push("/history");
    }
  } catch (e) {
    console.error(e);
  }
  };

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Route & Root</h1>
        <p className="text-sm text-gray-500">
          {loading ? "確認中..." : user ? `ログイン中: ${user.displayName ?? user.email}` : "未ログイン"}
        </p>
      </div>
      {user ? (
        <button onClick={logout} className="rounded-xl bg-gray-200 px-4 py-2 font-semibold text-gray-700">
          ログアウト
        </button>
      ) : (
        <button onClick={handleLogin} className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white">
          Googleでログイン
        </button>
      )}
    </header>
  );
}