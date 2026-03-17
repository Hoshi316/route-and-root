"use client";

import { useState, use, useEffect, useRef } from "react"; 
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, User } from "firebase/auth";
import AppleTree from "@/components/AppleTree";
import HarvestModal from "@/components/HarvestModal";
import Link from "next/link";
import { AppleVariety, APPLE_NAMES, APPLE_COLORS } from "@/lib/apple"; 

export default function GardenPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);

  // 1. 状態管理
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutrition, setNutrition] = useState(0);
  const [hasGrown, setHasGrown] = useState(false);
  const [useMood, setUseMood] = useState(false); 
  const [mood, setMood] = useState(3);
  const [memo, setMemo] = useState("");
  const [isWatering, setIsWatering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [pendingApples, setPendingApples] = useState<any[]>([]);
  const [routeName, setRouteName] = useState("");
  const [variety, setVariety] = useState<AppleVariety>('forest');

  // マルチモーダル用
  const [image, setImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null); // 音声認識用

  const pendingCount = pendingApples.length;
  const isFull = nutrition >= 100;

  // 2. 音声認識のセットアップ（Web Speech API）
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ja-JP';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMemo(prev => prev + transcript); // メモ欄に直接書き込む
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  // ... (ログイン・データ取得・自動保存のuseEffectなどは以前と同じ)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    async function fetchRoute() {
      try {
        const res = await fetch(`/api/get-route?routeId=${routeId}`);
        const data = await res.json();
        setRouteName(data.goal || "無題の目標");
        setHasGrown(data.hasGrown || false);
        setNutrition(data.nutrition || 0);
        setPendingApples(data.pendingApples || []);
        setVariety(data.currentVariety || 'forest');
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchRoute();
    return () => unsubscribe();
  }, [routeId]);

  const saveProgress = async (newN: number, newA: any[], curV: string, grown: boolean) => {
    try {
      await fetch("/api/update-route-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, nutrition: newN, pendingApples: newA, variety: curV, hasGrown: grown }),
      });
    } catch (e) { console.error(e); }
  };

  const handleGiveNutrition = async () => {
    if (isFull) return;
    const hasInput = useMood || memo.trim() || image;
    if (!hasInput) return alert("今日の頑張りを見せてください🌱");

    setIsWatering(true);
    try {
      const response = await fetch("/api/generate-apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moodScore: useMood ? mood : null, note: memo.trim(), image: image }),
      });
      const data = await response.json();

      const nextNutrition = Math.min(nutrition + 25, 100);
      let nextApples = [...pendingApples];
      const existingIndex = nextApples.findIndex(a => a.variety === data.variety);
      const newNote = memo.trim() || (image ? "（写真で報告）" : "（養分を注いだ）");

      if (existingIndex !== -1) {
        nextApples[existingIndex] = {
          ...nextApples[existingIndex],
          note: nextApples[existingIndex].note + " | " + newNote,
          comment: data.message,
          createdAt: new Date().toISOString()
        };
      } else {
        nextApples.push({ variety: data.variety, note: newNote, moodScore: useMood ? mood : null, comment: data.message, createdAt: new Date().toISOString() });
      }

      setVariety(data.variety);
      setPendingApples(nextApples);
      setNutrition(nextNutrition);
      const nextHasGrown = nextNutrition === 100 ? true : hasGrown;
      setHasGrown(nextHasGrown);
      setAiMessage(data.message);
      setMemo(""); setImage(null);
      saveProgress(nextNutrition, nextApples, data.variety, nextHasGrown);
    } finally { setIsWatering(false); }
  };

  const handleCloseModal = () => {
    setShowModal(false); setPendingApples([]); setNutrition(0); setAiMessage("");
    saveProgress(0, [], variety, true); 
  };

  let treeLevel = hasGrown ? 2 : (nutrition < 30 ? 0 : nutrition < 60 ? 1 : 2);

  if (loading) return <div className="p-10 text-center font-bold">農園を準備中...</div>;

  return (
    <div className="min-h-screen bg-orange-50 p-6 pb-32 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black text-orange-900">🍎 {routeName} 農園</h1>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
        
        {/* 左側：入力エリア（複数同時入力可能UI） */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-orange-100 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-700">📝 今日の養分</h2>
            <div className="flex gap-2">
              {/* 写真追加ボタン */}
              <label className="cursor-pointer bg-orange-50 p-2 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors">
                <span>📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const r = new FileReader();
                    r.onloadend = () => setImage(r.result as string);
                    r.readAsDataURL(file);
                  }
                }} />
              </label>
              {/* 音声入力ボタン */}
              <button 
                onClick={toggleRecording}
                className={`p-2 rounded-xl border transition-all ${isRecording ? 'bg-red-500 border-red-600 animate-pulse' : 'bg-orange-50 border-orange-100'}`}
              >
                <span>{isRecording ? '🛑' : '🎙️'}</span>
              </button>
            </div>
          </div>

          {/* メモ入力（常に表示） */}
          <div className="relative">
            <textarea 
              className="w-full p-4 bg-orange-50/20 border-2 border-orange-100 text-slate-900 font-bold rounded-2xl h-32 outline-none focus:border-orange-500 transition-all text-sm"
              placeholder={isRecording ? "音声を聞き取っています..." : "写真の説明や頑張りをメモ..."}
              value={memo} 
              onChange={(e) => setMemo(e.target.value)} 
            />
            {isRecording && <div className="absolute top-2 right-2 flex gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></span></div>}
          </div>

          {/* 画像プレビュー（ある時だけ表示） */}
          {image && (
            <div className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-orange-200">
              <img src={image} className="w-full h-full object-cover" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full text-xs">✕</button>
            </div>
          )}

          <div className="bg-orange-50/50 p-4 rounded-2xl border-2 border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={useMood} onChange={(e) => setUseMood(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                <span className="font-bold text-slate-700 text-sm">やる気レバー</span>
              </label>
              {useMood && <span className="text-orange-500 font-black px-2 py-1 bg-white rounded-lg shadow-sm text-xs">Lv.{mood}</span>}
            </div>
            <input type="range" min="1" max="5" value={mood} disabled={!useMood} onChange={(e) => setMood(Number(e.target.value))} className={`w-full ${useMood ? 'accent-orange-500' : 'opacity-30'}`} />
          </div>

          <button 
            onClick={handleGiveNutrition} 
            disabled={isWatering} 
            className="w-full py-5 text-white font-black rounded-3xl shadow-lg transition-all active:scale-95" 
            style={{ backgroundColor: APPLE_COLORS[variety] }}
          >
            {isWatering ? "吸収中..." : isFull ? `🍎 収穫可能です！` : `養分を注ぐ (${nutrition}%) 💧`}
          </button>
        </div>

        {/* 右側：木のエフェクト（省略なし） */}
        <div className="relative overflow-hidden flex flex-col items-center justify-center bg-white p-8 rounded-[40px] shadow-xl border-4 border-emerald-100 min-h-[480px]">
          {isWatering && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="absolute text-2xl animate-drop" style={{ left: `${20 + i * 15}%`, color: APPLE_COLORS[variety], animationDelay: `${i * 0.1}s` }}>💧</span>
              ))}
            </div>
          )}
          <AppleTree level={treeLevel} variety={variety === 'rare' ? 'sun' : variety} hasApple={pendingCount > 0} moodScore={useMood ? mood : 3} />
          <div className="mt-8 w-full max-w-xs text-center">
            <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: APPLE_COLORS[variety] }}>
              <span>Growth</span><span>{nutrition}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-emerald-50">
              <div className="h-full transition-all duration-1000" style={{ width: `${nutrition}%`, backgroundColor: APPLE_COLORS[variety] }} />
            </div>
          </div>
          {aiMessage && (
            <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl shadow-sm mx-4 animate-in zoom-in fade-in">
              <p className="text-[9px] font-black text-orange-400 uppercase mb-1 text-center">園主の言葉</p>
              <p className="text-sm text-slate-700 font-bold italic text-center">「{aiMessage}」</p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl flex justify-around items-center z-40">
        <Link href={`/map/${routeId}`} className="flex flex-col items-center gap-1">🗺️<span className="text-[10px] font-black text-slate-400">マップ</span></Link>
        <Link href={`/collection/${user?.uid || 'guest'}?from=${routeId}`} className="flex flex-col items-center gap-1">📦<span className="text-[10px] font-black text-slate-400">貯蔵庫</span></Link>
        <Link href="/history" className="flex flex-col items-center gap-1">📜<span className="text-[10px] font-black text-slate-400">履歴</span></Link>
      </footer>
      {showModal && <HarvestModal apples={pendingApples} onClose={handleCloseModal} />}
      <style jsx global>{`@keyframes drop { 0% { transform: translateY(-50px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(300px); opacity: 0; } } .animate-drop { display: inline-block; animation: drop linear infinite; animation-duration: 0.8s; }`}</style>
    </div>
  );
}