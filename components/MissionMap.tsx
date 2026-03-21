"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { exportToGoogleTasks } from "@/lib/googleTasks";
import { getGoogleTasksAccessToken } from "@/lib/auth";

type Step = {
  id: string;
  title: string;
  description: string;
  scheduledDay: number;
  done: boolean;
};

type Phase = {
  title: string;
  startDay: number;
  endDay: number;
  description: string;
};

type Props = {
  routeId: string;
  goal: string;
  summary: string;
  progress: number;
  steps: Step[];
  phases?: Phase[];
};

// --- サブコンポーネント: アニメーション付きステップカード ---
function StepCard({
  step, index, total, unlocked, loading,
  editingStepId, editTitle, editDescription,
  onToggle, onEditStart, onEditSave, onEditCancel,
  onEditTitleChange, onEditDescriptionChange,
}: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isEditing = editingStepId === step.id;
  const isLeft = index % 2 === 0;
  const depthScale = 1 - (total - 1 - index) * 0.03;

  return (
    <div
      ref={ref}
      className="relative flex items-center py-5"
      style={{
        opacity: visible ? (unlocked ? 1 : 0.4) : 0,
        transform: visible ? `scaleX(${depthScale}) translateY(0)` : `scaleX(${depthScale}) translateY(20px)`,
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="absolute left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100">
          <div className={`h-4 w-4 rounded-full border-2 transition-all ${
            step.done ? "border-sky-500 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
            : unlocked ? "border-sky-300 bg-white" : "border-sky-200 bg-sky-100"
          }`} />
        </div>
      </div>
      <div className={`w-[44%] ${isLeft ? "mr-auto pl-1" : "ml-auto pr-1"}`}>
        <div className={`rounded-2xl border p-4 transition-all ${
          step.done ? "border-sky-300 bg-sky-100/80 shadow-md"
          : unlocked ? "border-sky-200 bg-white shadow-lg"
          : "border-sky-100 bg-sky-50/60"
        }`}>
          {!unlocked && <p className="mb-1 text-[10px] text-sky-300 font-bold">🔒 前を完了してください</p>}
          <p className="mb-1 text-[10px] font-bold text-sky-400">Day {step.scheduledDay}</p>
          
          {isEditing ? (
            <div className="space-y-2">
              <input type="text" value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} className="w-full rounded-lg border border-sky-300 bg-sky-50 p-2 text-sm font-bold" />
              <textarea value={editDescription} onChange={(e) => onEditDescriptionChange(e.target.value)} className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-[10px]" rows={2} />
              <div className="flex gap-2">
                <button onClick={onEditSave} className="rounded-lg bg-sky-500 px-3 py-1 text-[10px] font-bold text-white">保存</button>
                <button onClick={onEditCancel} className="rounded-lg bg-sky-100 px-3 py-1 text-[10px] text-sky-600">戻る</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-black leading-snug ${step.done ? "text-sky-400 line-through" : "text-sky-900"}`}>{step.title}</h3>
              <p className={`mt-1 text-[11px] leading-relaxed ${step.done ? "text-sky-400" : unlocked ? "text-sky-600" : "text-sky-300"}`}>{step.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <label className={`flex cursor-pointer items-center gap-2 ${!unlocked ? "cursor-not-allowed" : ""}`}>
                  <input type="checkbox" checked={step.done} disabled={loading || !unlocked} onChange={onToggle} className="h-4 w-4 accent-sky-500" />
                  <span className="text-[10px] text-sky-400 font-bold">{step.done ? "完了！" : "完了にする"}</span>
                </label>
                {unlocked && !step.done && <button onClick={onEditStart} className="text-[10px] text-sky-300 underline">編集</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- メインコンポーネント ---
export default function MissionMap({ routeId, goal, summary, progress, steps, phases }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [localSteps, setLocalSteps] = useState(steps);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // フィードバック入力用
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingStep, setPendingStep] = useState<Step | null>(null);
  const [feedbackData, setFeedbackData] = useState({ difficulty: 3, feeling: "まあまあ", memo: "", energy: 3 });
  
  // 達成診断・おすそわけ用
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  // おすそわけフォーム用
  const [shareComment, setShareComment] = useState("");
  const [shareGoal, setShareGoal] = useState(true);
  const [shareDiagnosis, setShareDiagnosis] = useState(true);
  const [shareChart, setShareChart] = useState(true);
  const [shareToOrchard, setShareToOrchard] = useState(false);
  const [sharePosting, setSharePosting] = useState(false);

  const sortedAsc = [...localSteps].sort((a, b) => a.scheduledDay - b.scheduledDay);
  const sortedSteps = [...sortedAsc].reverse();
  const nextStep = sortedAsc.find(s => !s.done);
  const currentProgress = localSteps.length === 0 ? 0 : Math.round((localSteps.filter(s => s.done).length / localSteps.length) * 100);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const isUnlocked = (stepId: string) => {
    const idx = sortedAsc.findIndex(s => s.id === stepId);
    return idx === 0 ? true : sortedAsc[idx - 1].done;
  };

  // --- 完走後の診断・グラフ収集ロジック ---
  useEffect(() => {
    if (!showDiagnosis || !user) return;
    async function fetchDiagnosis() {
      setDiagnosisLoading(true);
      try {
        const routeRes = await fetch(`/api/get-route?routeId=${routeId}`);
        const routeData = await routeRes.json();
        const logsRes = await fetch(`/api/get-user-logs?userId=${user?.uid}&routeId=${routeId}`);
        const logsData = await logsRes.json();
        
        const feedbacks = (routeData.stepFeedbacks || []).sort((a: any, b: any) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        const logs = (logsData.logs || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        setChartData({
          energies: feedbacks.map((f: any) => f.energy || 3),
          difficulties: feedbacks.map((f: any) => f.difficulty || 3),
          feelings: feedbacks.map((f: any) => f.feeling || "まあまあ"),
          moodScores: logs.map((l: any) => l.moodScore || 3),
        });

        const res = await fetch("/api/completion-diagnosis", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, goal, appleLogs: logsData.logs || [], stepFeedbacks: routeData.stepFeedbacks || [] }),
        });
        const data = await res.json();
        setDiagnosisText(data.diagnosis);
      } catch (e) { console.error(e); } finally { setDiagnosisLoading(false); }
    }
    fetchDiagnosis();
  }, [showDiagnosis, routeId, goal, user]);

  // --- ハンドラー ---
  const handleToggle = async (stepId: string) => {
    if (!isUnlocked(stepId)) return;
    const target = localSteps.find(s => s.id === stepId);
    if (target && !target.done) {
      setPendingStep(target);
      setShowFeedbackModal(true);
      return;
    }
    updateStepInDB(localSteps.map(s => s.id === stepId ? { ...s, done: false } : s));
  };

  const updateStepInDB = async (updated: Step[]) => {
    setLocalSteps(updated);
    setLoading(true);
    try {
      await fetch("/api/update-steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routeId, steps: updated }) });
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleFeedbackSubmit = async () => {
    if (!pendingStep) return;
    setShowFeedbackModal(false);
    const updated = localSteps.map(s => s.id === pendingStep.id ? { ...s, done: true } : s);
    setLocalSteps(updated);
    setLoading(true);
    try {
      await fetch("/api/update-steps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, steps: updated, feedback: { stepId: pendingStep.id, stepTitle: pendingStep.title, ...feedbackData } })
      });
      // カラーセラピー対応（緑/青/赤）
      const varietyMap: any = { 2: "green", 3: "blue", 4: "red" };
      await fetch("/api/save-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, routeId, routeName: goal, moodScore: feedbackData.energy,
          note: feedbackData.memo || `「${pendingStep.title}」を完了`, variety: varietyMap[feedbackData.difficulty] || "green",
          source: 'step', stepDay: pendingStep.scheduledDay, stepTitle: pendingStep.title
        })
      });
      if (updated.every(s => s.done)) setShowDiagnosis(true);
      else router.refresh();
    } finally { setLoading(false); }
  };

  const handleEditStart = (step: Step) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description);
  };

  const handleEditSave = async (stepId: string) => {
    const updated = localSteps.map(s => s.id === stepId ? { ...s, title: editTitle, description: editDescription } : s);
    updateStepInDB(updated);
    setEditingStepId(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getGoogleTasksAccessToken();
      if (token) await exportToGoogleTasks(token, goal, localSteps);
      alert("Google Tasksに書き出しました！");
    } finally { setExporting(false); }
  };

  return (
    <div className="relative h-screen overflow-hidden text-sky-900" style={{ background: "linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)" }}>

      {/* ── トップバー（固定・進捗） ── */}
      <div className="sticky top-0 z-30 w-full px-4 py-3" style={{ backgroundColor: "#e0f2fe" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/history" className="text-xs font-bold text-sky-500 hover:text-sky-700 transition">← 旅の記録</Link>
          <div className="flex-1 text-center px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-0.5">✦ Active Goal ✦</span>
            <h1 className="text-sm font-black text-sky-900 truncate">{goal}</h1>
          </div>
          <div className="text-right"><span className="text-xs font-black text-sky-600">{currentProgress}%</span></div>
        </div>
        <div className="mx-auto mt-2 max-w-6xl h-1.5 w-full overflow-hidden rounded-full bg-sky-200">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-1000" style={{ width: `${currentProgress}%` }} />
        </div>
      </div>

      {/* ── メインコンテンツ（2カラム） ── */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-24 md:grid md:grid-cols-[1fr_320px] md:gap-8 md:pb-8 h-[calc(100vh-80px)]">

        {/* ── 左カラム：ロードマップ ── */}
        <div ref={scrollRef} className="relative overflow-y-auto pr-2 custom-scrollbar">
          <div className="relative mx-auto max-w-lg">
            <div className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-sky-100 via-sky-300 to-sky-100 top-0 bottom-0 opacity-50" />
            
            <div className="flex flex-col space-y-6">
              {phases && phases.length > 0 ? (
                phases.map((phase, pIdx) => (
                  <div key={pIdx} className="rounded-3xl overflow-hidden border border-sky-100 bg-white/40 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div>
                        <h2 className="text-sm font-black text-sky-900">{phase.title}</h2>
                        <p className="text-[10px] text-sky-500 font-bold">Day {phase.startDay} 〜 {phase.endDay}</p>
                      </div>
                      <span className="text-xl">🚩</span>
                    </div>
                    {sortedSteps.filter(s => s.scheduledDay >= phase.startDay && s.scheduledDay <= phase.endDay).map((step, sIdx) => (
                      <StepCard key={step.id} step={step} index={sIdx} total={sortedSteps.length} unlocked={isUnlocked(step.id)} loading={loading} editingStepId={editingStepId} editTitle={editTitle} editDescription={editDescription} onToggle={() => handleToggle(step.id)} onEditStart={() => handleEditStart(step)} onEditSave={() => handleEditSave(step.id)} onEditCancel={() => setEditingStepId(null)} onEditTitleChange={setEditTitle} onEditDescriptionChange={setEditDescription} />
                    ))}
                  </div>
                ))
              ) : (
                sortedSteps.map((step, index) => (
                  <StepCard key={step.id} step={step} index={index} total={sortedSteps.length} unlocked={isUnlocked(step.id)} loading={loading} editingStepId={editingStepId} editTitle={editTitle} editDescription={editDescription} onToggle={() => handleToggle(step.id)} onEditStart={() => handleEditStart(step)} onEditSave={() => handleEditSave(step.id)} onEditCancel={() => setEditingStepId(null)} onEditTitleChange={setEditTitle} onEditDescriptionChange={setEditDescription} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── 右カラム：サイドバー（PC） ── */}
        <div className="hidden md:block">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-sky-400">旅の概要</p>
              <p className="text-sm text-sky-700 font-bold leading-relaxed">{summary}</p>
            </div>
            {nextStep && (
              <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 shadow-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-500">🎯 次のミッション</p>
                <p className="text-sm font-black text-sky-900">{nextStep.title}</p>
                <button onClick={() => handleToggle(nextStep.id)} className="mt-4 w-full rounded-xl bg-sky-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-600 transition">完了にする</button>
              </div>
            )}
            <button onClick={handleExport} disabled={exporting} className="w-full rounded-xl bg-white border border-sky-200 py-3 text-xs font-bold text-sky-500 hover:bg-sky-50 transition">📤 Google Tasksへ書き出す</button>
            <Link href={`/garden/${routeId}`} className="block w-full rounded-xl bg-emerald-500 py-4 text-center text-sm font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition">果樹園（Garden）へ向かう 🍎</Link>
          </div>
        </div>
      </div>

      {/* ── SP用 下部固定ボタン ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t border-sky-100 p-4 flex gap-2 md:hidden">
        <button onClick={handleExport} className="flex-1 rounded-xl bg-sky-100 py-3 text-xs font-bold text-sky-600">Tasks出力</button>
        <Link href={`/garden/${routeId}`} className="flex-[2] rounded-xl bg-emerald-500 py-3 text-center text-xs font-bold text-white shadow-lg">🍎 果樹園へ向かう</Link>
      </div>

      {/* ── モーダル：詳細フィードバック（↑のやつから移植） ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="text-center mb-6"><div className="text-4xl mb-2">✅</div><h2 className="text-lg font-black text-slate-800">ステップ完了！</h2><p className="text-xs text-slate-400 font-bold">{pendingStep?.title}</p></div>
             
             <div className="space-y-5">
                {/* 難易度 */}
                <div>
                   <p className="text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">難易度は？</p>
                   <div className="flex gap-2">
                     {[
                       { v: 2, e: "😌", l: "簡単" },
                       { v: 3, e: "😐", l: "普通" },
                       { v: 4, e: "😵", l: "難しい" },
                     ].map(({v, e, l}) => (
                       <button key={v} onClick={() => setFeedbackData(p=>({...p, difficulty:v}))} className={`flex-1 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${feedbackData.difficulty===v ? "border-sky-500 bg-sky-50" : "border-slate-100 bg-slate-50"}`}>
                         <span className="text-xl">{e}</span>
                         <span className={`text-[10px] font-bold ${feedbackData.difficulty===v ? "text-sky-600" : "text-slate-400"}`}>{l}</span>
                       </button>
                     ))}
                   </div>
                </div>

                {/* やる気 */}
                <div>
                   <p className="text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">やる気レベル: <span className="text-sky-500">Lv.{feedbackData.energy}</span></p>
                   <input type="range" min="1" max="5" value={feedbackData.energy} onChange={e=>setFeedbackData(p=>({...p, energy:Number(e.target.value)}))} className="w-full h-2 bg-sky-100 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                </div>

                {/* 達成感 */}
                <div>
                   <p className="text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">達成感</p>
                   <div className="flex gap-2">
                     {[
                       { v: "微妙", e: "😞", c: "#10b981" },
                       { v: "まあまあ", e: "👍", c: "#f97316" },
                       { v: "バッチリ", e: "🎉", c: "#ef4444" },
                     ].map(({v, e, c}) => (
                        <button key={v} onClick={() => setFeedbackData(p=>({...p, feeling:v}))} className={`flex-1 py-2 rounded-2xl border-2 transition-all flex flex-col items-center ${feedbackData.feeling===v ? `border-[${c}] bg-white shadow-sm` : "border-slate-100 bg-slate-50 opacity-60"}`} style={{ borderColor: feedbackData.feeling===v ? c : "" }}>
                          <span className="text-lg">{e}</span>
                          <span className="text-[9px] font-bold text-slate-500">{v}</span>
                        </button>
                     ))}
                   </div>
                </div>

                {/* メモ */}
                <textarea placeholder="一言メモ（任意）" value={feedbackData.memo} onChange={e=>setFeedbackData(p=>({...p, memo:e.target.value}))} className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-xs focus:outline-none focus:border-sky-300 min-h-[60px] resize-none" />

                <button onClick={handleFeedbackSubmit} className="w-full py-4 rounded-2xl bg-sky-500 font-black text-white shadow-xl hover:bg-sky-600 transition">完了を記録 🍎</button>
                <button onClick={()=>setShowFeedbackModal(false)} className="w-full text-slate-400 text-[10px] font-bold">戻る</button>
             </div>
          </div>
        </div>
      )}

      {/* ── モーダル：達成診断 ＆ おすそわけ（↑の豪華版グラフを移植） ── */}
      {showDiagnosis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl my-8">
             <div className="text-center mb-8">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{goal} を完遂！</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mt-2">CONGRATULATIONS</p>
             </div>

             {diagnosisLoading ? (
               <div className="text-center py-12"><div className="animate-spin h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full inline-block" /><p className="mt-4 text-slate-400 font-bold text-sm">AIコーチが旅を振り返っています...</p></div>
             ) : (
               <div className="space-y-6">
                 {chartData && (
                   <div className="space-y-4">
                     {/* グラフ1: 難易度 & やる気 */}
                     <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Step Motivation Track</p>
                        <div className="flex items-end gap-1.5 h-24">
                           {chartData.energies.map((e:any, i:number) => {
                             const feeling = chartData.feelings[i];
                             const barColor = feeling === "バッチリ" ? "#10b981" : feeling === "微妙" ? "#ef4444" : "#f97316";
                             return (
                               <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                 <div className="w-full rounded-t-lg transition-all duration-1000" style={{ height: `${e * 16}px`, background: barColor, opacity: 0.8 }} />
                                 <span className="text-[7px] text-slate-300 font-bold">S{i+1}</span>
                               </div>
                             );
                           })}
                        </div>
                     </div>

                     {/* グラフ2: 達成感の内訳 */}
                     <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Satisfaction Ratio</p>
                        <div className="flex gap-2">
                           {(["バッチリ", "まあまあ", "微妙"] as const).map((label) => {
                              const count = chartData.feelings.filter((f:any) => f === label).length;
                              const pct = Math.round(count / chartData.feelings.length * 100);
                              const color = label === "バッチリ" ? "#10b981" : label === "微妙" ? "#ef4444" : "#f97316";
                              return (
                                <div key={label} className="flex-1 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                                  <div className="text-lg font-black" style={{ color }}>{pct}%</div>
                                  <div className="text-[8px] text-slate-400 font-bold">{label}</div>
                                </div>
                              );
                           })}
                        </div>
                     </div>
                   </div>
                 )}

                 {/* AI診断テキスト */}
                 <div className="bg-sky-50 rounded-3xl p-6 border-2 border-sky-100">
                    <p className="text-[10px] font-black text-sky-400 uppercase mb-3 tracking-widest">🤖 AI Journey Diagnosis</p>
                    <p className="text-sm font-bold leading-relaxed text-slate-700 whitespace-pre-wrap">{diagnosisText}</p>
                 </div>

                 {/* おすそわけフォーム */}
                 <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input type="checkbox" checked={shareToOrchard} onChange={e => setShareToOrchard(e.target.checked)} className="w-5 h-5 rounded-lg accent-sky-500" />
                      <span className="text-sm font-black text-slate-700">この旅をみんなにおすそわけする 🐝</span>
                    </label>
                    {shareToOrchard && (
                      <div className="pl-8 space-y-3">
                        <textarea placeholder="仲間への一言（任意）" value={shareComment} onChange={e => setShareComment(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs min-h-[60px] resize-none focus:outline-none focus:border-sky-300" />
                      </div>
                    )}
                 </div>

                 <button
                   disabled={sharePosting}
                   onClick={async () => {
                     try {
                        if (shareToOrchard) {
                          setSharePosting(true);
                          await fetch("/api/update-route-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routeId, isPublic: true }) });
                          await fetch("/api/share-to-orchard", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user?.uid, routeId, goal: shareGoal ? goal : null, comment: shareComment, source: "completion", diagnosisText: shareDiagnosis ? diagnosisText : null, chartData: shareChart ? chartData : null }),
                          });
                        }
                        router.push(`/collection/${routeId}`);
                     } catch (e) { console.error(e); } finally { setSharePosting(false); }
                   }}
                   className="block w-full py-5 rounded-[28px] bg-emerald-500 text-center font-black text-white text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                 >
                   {sharePosting ? "投稿中..." : "情熱の結晶を確認する 📦"}
                 </button>
               </div>
             )}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bae6fd; border-radius: 10px; }
      `}</style>
    </div>
  );
}