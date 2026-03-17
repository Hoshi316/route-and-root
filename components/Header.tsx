"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signInWithGoogle, logout } from "@/lib/auth";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Route & Root</h1>
        <p className="text-sm text-gray-500">
          {loading
            ? "確認中..."
            : user
            ? `ログイン中: ${user.displayName ?? user.email}`
            : "未ログイン"}
        </p>
      </div>

      {user ? (
        <button
          onClick={logout}
          className="rounded-xl bg-gray-200 px-4 py-2 font-semibold text-gray-700"
        >
          ログアウト
        </button>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white"
        >
          Googleでログイン
        </button>
      )}
    </header>
  );
}