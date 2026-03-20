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

type Props = {
  routeId: string;
  goal: string;
  summary: string;
  progress: number;
  steps: Step[];
};

function StepCard({ step, index, total, unlocked, loading, editingStepId, editTitle, editDescription, onToggle, onEditStart, onEditSave, onEditCancel, onEditTitleChange, onEditDescriptionChange }: any) {
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
  const depthScale = 1 - (total - 1 - index) * 0.04;

  return (
    <div ref={ref} className="relative flex items-center py-5" style={{ opacity: visible ? (unlocked ? 1 : 0.4) : 0, transform: visible ? `scaleX(${depthScale}) translateY(0)` : `scaleX(${depthScale}) translateY(28px)`, transformOrigin: "center center", transition: "opacity 0.4s ease, transform 0.4s ease" }}>
      <div className="absolute left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "#e0f2fe" }}>
          <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${step.done ? "border-sky-500 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]" : unlocked ? "border-sky-300 bg-white" : "border-sky-200 bg-sky-100"}`} />
        </div>
      </div>
      <div className={`w-[44%] ${isLeft ? "mr-auto pl-1" : "ml-auto pr-1"}`}>
        <div className={`rounded-2xl border p-4 transition-all duration-300 ${step.done ? "border-sky-300 bg-sky-100/80 shadow-md" : unlocked ? "border-sky-200 bg-white shadow-lg" : "border-sky-100 bg-sky-50/60"}`}>
          {!unlocked && <p className="mb-1 text-xs text-sky-300">🔒 前を完了してください</p>}
          <p className={`mb-1 text-xs font-bold ${step.done ? "text-sky-500" : unlocked ? "text-sky-400" : "text-sky-300"}`}>Day {step.scheduledDay}</p>
          {isEditing ? (
            <div className="space-y-2">
              <input type="text" value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} className="w-full rounded-lg border border-sky-300 bg-sky-50 p-2 text-sm font-bold focus:outline-none" />
              <textarea value={editDescription} onChange={(e) => onEditDescriptionChange(e.target.value)} className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs focus:outline-none" rows={2} />
              <div className="flex gap-2">
                <button onClick={onEditSave} className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-bold text-white">保存</button>
                <button onClick={onEditCancel} className="rounded-lg bg-sky-100 px-3 py-1 text-xs text-sky-600">キャンセル</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-black leading-snug ${step.done ? "text-sky-400 line-through" : "text-sky-900"}`}>{step.title}</h3>
              <p className={`mt-1 text-xs leading-relaxed ${step.done ? "text-sky-400" : unlocked ? "text-sky-600" : "text-sky-300"}`}>{step.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <label className={`flex cursor-pointer items-center gap-2 ${!unlocked ? "cursor-not-allowed" : ""}`}>
                  <input type="checkbox" checked={step.done} disabled={loading || !unlocked} onChange={onToggle} className="h-4 w-4 accent-sky-500" />
                  <span className="text-xs text-sky-400">{step.done ? "完了！" : "完了にする"}</span>
                </label>
                {unlocked && !step.done && <button onClick={onEditStart} className="text-xs text-sky-300 underline hover:text-sky-500">編集</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionMap({ routeId, goal, summary, progress, steps }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [localSteps, setLocalSteps] = useState(steps);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [headerH] = useState(160);
  const [footerH] = useState(180);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingStep, setPendingStep] = useState<Step | null>(null);
  const [feedbackData, setFeedbackData] = useState({ difficulty: 3, feeling: "まあまあ", memo: "", energy: 3 });

  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [chartData, setChartData] = useState<{
    stepLabels: string[];
    difficulties: number[];
    energies: number[];
    feelings: string[];
    moodScores: number[];
  } | null>(null);

  const [shareComment, setShareComment] = useState("");
  const [shareGoal, setShareGoal] = useState(true);
  const [shareDiagnosis, setShareDiagnosis] = useState(true);
  const [shareChart, setShareChart] = useState(true);
  const [shareToOrchard, setShareToOrchard] = useState(false);
  const [sharePosting, setSharePosting] = useState(false);

  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
  }, []);

  useEffect(() => {
    if (!showDiagnosis) return;
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
          stepLabels: feedbacks.map((f: any) => `Day ${f.stepTitle?.slice(0, 6) || ""}`),
          difficulties: feedbacks.map((f: any) => f.difficulty || 3),
          energies: feedbacks.map((f: any) => f.energy || 3),
          feelings: feedbacks.map((f: any) => f.feeling || "まあまあ"),
          moodScores: logs.map((l: any) => l.moodScore || 3),
        });
        const res = await fetch("/api/completion-diagnosis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, goal, appleLogs: logsData.logs || [], stepFeedbacks: routeData.stepFeedbacks || [] }),
        });
        const data = await res.json();
        setDiagnosisText(data.diagnosis);
      } catch (e) {
        setDiagnosisText("旅の診断中にエラーが発生しました。ですが、あなたの努力は本物です！");
      } finally {
        setDiagnosisLoading(false);
      }
    }
    fetchDiagnosis();
  }, [showDiagnosis, routeId, goal, user]);

  const sortedAsc = [...localSteps].sort((a, b) => a.scheduledDay - b.scheduledDay);
  const sortedSteps = [...sortedAsc].reverse();
  const currentProgress = localSteps.length === 0 ? 0 : Math.round((localSteps.filter((s) => s.done).length / localSteps.length) * 100);

  const isUnlocked = (stepId: string) => {
    const idx = sortedAsc.findIndex((s) => s.id === stepId);
    if (idx === 0) return true;
    return sortedAsc[idx - 1].done;
  };

  const handleToggle = async (stepId: string) => {
    if (!isUnlocked(stepId)) return;
    const target = localSteps.find(s => s.id === stepId);
    if (target && !target.done) {
      setPendingStep(target);
      setShowFeedbackModal(true);
      return;
    }
    const updated = localSteps.map((s) => s.id === stepId ? { ...s, done: false } : s);
    setLocalSteps(updated);
    setLoading(true);
    try {
      await fetch("/api/update-steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routeId, steps: updated }) });
      router.refresh();
    } catch (e) { alert("更新に失敗しました"); } finally { setLoading(false); }
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
      const varietyMap: Record<number, string> = { 1: "forest", 2: "moon", 3: "midnight", 4: "sun", 5: "rare" };
      const variety = varietyMap[feedbackData.difficulty] || "forest";
      const currentUser = auth.currentUser;
      if (currentUser) {
        await fetch("/api/save-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.uid, routeId, routeName: goal,
            moodScore: feedbackData.energy ?? feedbackData.difficulty,
            note: feedbackData.memo || `「${pendingStep.title}」を完了`, variety,
            comment: `難易度: ${["簡単", "普通", "難しい"][feedbackData.difficulty - 1]} / ${feedbackData.feeling}`,
            source: 'step', stepDay: pendingStep.scheduledDay, stepTitle: pendingStep.title,
          })
        });
      }
      const newProgress = Math.round((updated.filter(s => s.done).length / updated.length) * 100);
      if (newProgress === 100) { setShowDiagnosis(true); } else { router.refresh(); }
    } catch (e) { console.error(e); alert("更新に失敗しました"); } finally { setLoading(false); }
    setFeedbackData({ difficulty: 3, feeling: "まあまあ", memo: "", energy: 3 });
  };

  const handleEditStart = (step: Step) => { setEditingStepId(step.id); setEditTitle(step.title); setEditDescription(step.description); };
  const handleEditSave = async (stepId: string) => {
    const updated = localSteps.map((s) => s.id === stepId ? { ...s, title: editTitle, description: editDescription } : s);
    setLocalSteps(updated);
    setEditingStepId(null);
    await fetch("/api/update-steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routeId, steps: updated }) });
  };
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getGoogleTasksAccessToken();
      if (!token) throw new Error("トークンなし");
      await exportToGoogleTasks(token, goal, localSteps);
      alert(`「Route & Root: ${goal}」を Google Tasks に書き出しました`);
    } catch (e) { alert("書き出し失敗"); } finally { setExporting(false); }
  };

  return (
    <div className="relative h-screen overflow-hidden text-sky-900" style={{ background: "linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)" }}>

      {/* ヘッダー */}
      <div className="fixed left-0 right-0 top-0 z-30 pb-4 pt-6 text-center" style={{ backgroundColor: "#e0f2fe" }}>
        <div className="mx-auto max-w-sm px-4">
          <div className="mb-1 inline-block rounded-full bg-sky-200/70 px-4 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">✦ Goal ✦</div>
          <h1 className="text-lg font-black text-sky-900">{goal}</h1>
          <p className="mt-1 text-xs text-sky-500">{summary}</p>
          <div className="mx-auto mt-3 max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-sky-400"><span>進捗</span><span className="font-bold text-sky-600">{currentProgress}%</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-700" style={{ width: `${currentProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* タスクリスト */}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto" style={{ paddingTop: `${headerH + 48}px`, paddingBottom: `${footerH}px`, zIndex: 10 }}>
        <div className="relative mx-auto max-w-lg px-4">
          <div className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2" style={{ top: 0, bottom: 0, background: "linear-gradient(to bottom, rgba(125,211,252,0.1), rgba(125,211,252,0.5) 20%, rgba(125,211,252,0.5) 80%, rgba(125,211,252,0.1))" }} />
          <div className="flex flex-col">
            {sortedSteps.map((step, index) => (
              <StepCard key={step.id} step={step} index={index} total={sortedSteps.length} unlocked={isUnlocked(step.id)} loading={loading} editingStepId={editingStepId} editTitle={editTitle} editDescription={editDescription} onToggle={() => handleToggle(step.id)} onEditStart={() => handleEditStart(step)} onEditSave={() => handleEditSave(step.id)} onEditCancel={() => setEditingStepId(null)} onEditTitleChange={setEditTitle} onEditDescriptionChange={setEditDescription} />
            ))}
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-4" style={{ background: "linear-gradient(to top, #ffffff 60%, transparent)" }}>
        <div className="mx-auto flex max-w-sm flex-col gap-3">
          <button onClick={handleExport} disabled={exporting} className="w-full rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-50">{exporting ? "書き出し中..." : "Google Tasks に書き出す"}</button>
          <Link href={`/garden/${routeId}`} className="w-full rounded-xl bg-emerald-500 py-3 text-center font-bold text-white transition hover:bg-emerald-600">果樹園（Garden）へ向かう 🍎</Link>
          <Link href="/history" className="w-full rounded-xl bg-sky-100 py-3 text-center font-bold text-sky-600">📜 旅の記録を見る</Link>
        </div>
      </div>

      {/* フィードバックモーダル */}
      {/* フィードバックモーダル */}
{showFeedbackModal && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
    <div style={{ background: "#ffffff", borderRadius: "24px", padding: "28px 24px", maxWidth: "380px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
        <p style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>ステップ完了</p>
        <p style={{ fontSize: "15px", fontWeight: 600 }}>{pendingStep?.title}</p>
      </div>

      {/* 難易度 3択 */}
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "10px" }}>難易度</p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {([
          { value: 2, emoji: "😌", label: "簡単" },
          { value: 3, emoji: "😐", label: "普通" },
          { value: 4, emoji: "😵", label: "難しい" },
        ] as const).map(({ value, emoji, label }) => {
          const selected = feedbackData.difficulty === value;
          return (
            <button
              key={label}
              onClick={() => setFeedbackData(p => ({ ...p, difficulty: value }))}
              style={{
                flex: 1, padding: "12px 4px", borderRadius: "14px", cursor: "pointer",
                border: selected ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                background: selected ? "#eff6ff" : "#f8fafc",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"
              }}
            >
              <span style={{ fontSize: "22px" }}>{emoji}</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: selected ? "#3b82f6" : "#94a3b8" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* やる気 */}
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "10px" }}>やる気: <span style={{ color: "#f97316" }}>Lv.{feedbackData.energy}</span></p>
      <input type="range" min="1" max="5" value={feedbackData.energy} onChange={e => setFeedbackData(p => ({ ...p, energy: Number(e.target.value) }))} style={{ width: "100%", accentColor: "#f97316", marginBottom: "20px" }} />

      {/* 達成感 */}
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "10px" }}>達成感</p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {([
          { value: "微妙", emoji: "😞", color: "#10b981" },
          { value: "まあまあ", emoji: "👍", color: "#f97316" },
          { value: "バッチリ", emoji: "🎉", color: "#ef4444" },
        ] as const).map(({ value, emoji, color }) => {
          const selected = feedbackData.feeling === value;
          return (
            <button
              key={value}
              onClick={() => setFeedbackData(p => ({ ...p, feeling: value }))}
              style={{
                flex: 1, padding: "12px 4px", borderRadius: "14px", cursor: "pointer",
                border: selected ? `2px solid ${color}` : "2px solid #e2e8f0",
                background: selected ? `${color}15` : "#f8fafc",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"
              }}
            >
              <span style={{ fontSize: "22px" }}>{emoji}</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: selected ? color : "#94a3b8" }}>{value}</span>
            </button>
          );
        })}
      </div>

      {/* メモ */}
      <textarea
        placeholder="メモ（任意）"
        value={feedbackData.memo}
        onChange={e => setFeedbackData(p => ({ ...p, memo: e.target.value }))}
        style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "2px solid #e2e8f0", background: "#f8fafc", fontSize: "13px", height: "72px", marginBottom: "20px", resize: "none" }}
      />

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setShowFeedbackModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "2px solid #e2e8f0", background: "white", cursor: "pointer" }}>戻る</button>
        <button onClick={handleFeedbackSubmit} style={{ flex: 2, padding: "12px", borderRadius: "12px", background: "#3b82f6", color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}>完了して記録 🍎</button>
      </div>
    </div>
  </div>
) }

      {/* 達成診断モーダル */}
      {showDiagnosis && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#ffffff", borderRadius: "32px", padding: "28px 24px", maxWidth: "520px", width: "100%", boxShadow: "0 30px 100px rgba(0,0,0,0.5)", maxHeight: "92vh", overflowY: "auto" }}>

            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏆</div>
              <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em" }}>Congratulation!</p>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#1e293b", marginTop: "6px", lineHeight: 1.3 }}>{goal} を完遂！</h2>
            </div>

            {/* グラフエリア */}
            {chartData && chartData.difficulties.length > 0 && (
              <div style={{ marginBottom: "24px" }}>

                {/* 難易度 & やる気バー */}
                <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", marginBottom: "16px", textTransform: "uppercase" }}>ステップごとの難易度 & やる気</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "120px" }}>
                    {chartData.difficulties.map((d, i) => {
                      const e = chartData.energies[i] || 3;
                      const feeling = chartData.feelings[i];
                      const barColor = feeling === "バッチリ" ? "#10b981" : feeling === "微妙" ? "#ef4444" : "#f97316";
                      const faceEmoji = d >= 4 ? "😵" : d <= 2 ? "😌" : "😐";
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "16px", lineHeight: 1 }}>{faceEmoji}</span>
                          <div style={{ width: "100%", height: `${e * 16}px`, background: barColor, borderRadius: "6px 6px 0 0", opacity: 0.85 }} />
                          <span style={{ fontSize: "9px", color: "#94a3b8" }}>S{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
                    {[{ face: "😌", label: "簡単" }, { face: "😐", label: "普通" }, { face: "😵", label: "難しい" }].map(({ face, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "13px" }}>{face}</span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{label}</span>
                      </div>
                    ))}
                    {[{ color: "#10b981", label: "バッチリ" }, { color: "#f97316", label: "まあまあ" }, { color: "#ef4444", label: "微妙" }].map(({ color, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "14px", height: "10px", background: color, borderRadius: "3px" }} />
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 農園やる気推移 */}
                {chartData.moodScores.length > 0 && (
                  <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", marginBottom: "16px", textTransform: "uppercase" }}>農園でのやる気推移</p>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
                      {chartData.moodScores.map((m, i) => {
                        const colors = ["#10b981", "#4338ca", "#94a3b8", "#ff4d4d", "#fbbf24"];
                        const faces = ["😴", "😌", "😐", "😤", "🔥"];
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "12px", lineHeight: 1 }}>{faces[m - 1]}</span>
                            <div style={{ width: "100%", height: `${m * 12}px`, background: colors[m - 1] || "#f97316", borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                      <span style={{ fontSize: "9px", color: "#94a3b8" }}>開始</span>
                      <span style={{ fontSize: "9px", color: "#94a3b8" }}>完了</span>
                    </div>
                  </div>
                )}

                {/* 達成感の内訳 */}
                {chartData.feelings.length > 0 && (
                  <div style={{ background: "#f8fafc", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", marginBottom: "14px", textTransform: "uppercase" }}>達成感の内訳</p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      {(["バッチリ", "まあまあ", "微妙"] as const).map((label) => {
                        const count = chartData.feelings.filter(f => f === label).length;
                        const pct = Math.round(count / chartData.feelings.length * 100);
                        const color = label === "バッチリ" ? "#10b981" : label === "微妙" ? "#ef4444" : "#f97316";
                        const emoji = label === "バッチリ" ? "🎉" : label === "まあまあ" ? "👍" : "😞";
                        return (
                          <div key={label} style={{ flex: 1, textAlign: "center", background: "white", borderRadius: "16px", padding: "14px 6px", border: `2px solid ${color}33` }}>
                            <div style={{ fontSize: "22px", marginBottom: "6px" }}>{emoji}</div>
                            <div style={{ fontSize: "24px", fontWeight: 900, color }}>{pct}%</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, marginTop: "2px" }}>{label}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{count}回</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI診断テキスト */}
            <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)", borderRadius: "20px", padding: "20px", marginBottom: "20px", border: "2px solid #dbeafe" }}>
              <p style={{ fontSize: "11px", fontWeight: 800, color: "#3b82f6", marginBottom: "12px", textTransform: "uppercase" }}>🤖 Journey Diagnosis — AI達成診断</p>
              {diagnosisLoading ? (
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div className="inline-block animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full" />
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>AIコーチが振り返り中...</p>
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#334155", lineHeight: 2, whiteSpace: "pre-wrap", fontWeight: 500 }}>{diagnosisText}</p>
              )}
            </div>

            {/* おすそわけフォーム */}
            <div style={{ marginBottom: "16px", background: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "10px" }}>
                <input type="checkbox" checked={shareToOrchard} onChange={e => setShareToOrchard(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "#3b82f6" }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>この旅をみんなにおすそわけする 🐝</span>
              </label>
              {shareToOrchard && (
                <div style={{ paddingLeft: "28px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "8px" }}>投稿する内容を選ぶ</p>
                  {([
                    { label: "目標名", value: shareGoal, set: setShareGoal },
                    { label: "AI達成診断", value: shareDiagnosis, set: setShareDiagnosis },
                    { label: "やる気グラフデータ", value: shareChart, set: setShareChart },
                  ] as { label: string, value: boolean, set: (v: boolean) => void }[]).map(({ label, value, set }) => (
                    <label key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={value} onChange={e => set(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                      <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>{label}</span>
                    </label>
                  ))}
                  <textarea
                    placeholder="一言コメント（任意）"
                    value={shareComment}
                    onChange={e => setShareComment(e.target.value)}
                    style={{ width: "100%", marginTop: "8px", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", resize: "none", height: "64px", background: "white", boxSizing: "border-box" as any }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/update-route-status", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ routeId, isPublic: shareToOrchard }),
                  });
                  if (shareToOrchard) {
                    setSharePosting(true);
                    await fetch("/api/share-to-orchard", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user?.uid, routeId,
                        goal: shareGoal ? goal : null,
                        comment: shareComment,
                        source: "completion",
                        diagnosisText: shareDiagnosis ? diagnosisText : null,
                        chartData: shareChart ? chartData : null,
                      }),
                    });
                    setSharePosting(false);
                  }
                } catch (e) { console.error(e); }
                router.push(`/collection/${routeId}`);
              }}
              style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 10px 20px rgba(37,99,235,0.3)" }}
            >
              {sharePosting ? "投稿中..." : "貯蔵庫で情熱の結晶を確認する 📦"}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}