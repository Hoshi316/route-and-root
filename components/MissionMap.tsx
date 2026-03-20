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

function StepCard({
  step, index, total, unlocked, loading,
  editingStepId, editTitle, editDescription,
  onToggle, onEditStart, onEditSave, onEditCancel,
  onEditTitleChange, onEditDescriptionChange,
}: {
  step: Step; index: number; total: number; unlocked: boolean; loading: boolean;
  editingStepId: string | null; editTitle: string; editDescription: string;
  onToggle: () => void; onEditStart: () => void; onEditSave: () => void;
  onEditCancel: () => void; onEditTitleChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
}) {
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
    <div
      ref={ref}
      className="relative flex items-center py-5"
      style={{
        opacity: visible ? (unlocked ? 1 : 0.4) : 0,
        transform: visible
          ? `scaleX(${depthScale}) translateY(0)`
          : `scaleX(${depthScale}) translateY(28px)`,
        transformOrigin: "center center",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div className="absolute left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "#e0f2fe" }}>
          <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
            step.done ? "border-sky-500 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
            : unlocked ? "border-sky-300 bg-white" : "border-sky-200 bg-sky-100"
          }`} />
        </div>
      </div>

      <div className={`w-[44%] ${isLeft ? "mr-auto pl-1" : "ml-auto pr-1"}`}>
        <div className={`rounded-2xl border p-4 transition-all duration-300 ${
          step.done ? "border-sky-300 bg-sky-100/80 shadow-md"
          : unlocked ? "border-sky-200 bg-white shadow-lg"
          : "border-sky-100 bg-sky-50/60"
        }`}>
          {!unlocked && <p className="mb-1 text-xs text-sky-300">🔒 前を完了してください</p>}
          <p className={`mb-1 text-xs font-bold ${step.done ? "text-sky-500" : unlocked ? "text-sky-400" : "text-sky-300"}`}>
            Day {step.scheduledDay}
          </p>

          {isEditing ? (
            <div className="space-y-2">
              <input type="text" value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)}
                className="w-full rounded-lg border border-sky-300 bg-sky-50 p-2 text-sm font-bold text-sky-900 focus:outline-none" />
              <textarea value={editDescription} onChange={(e) => onEditDescriptionChange(e.target.value)}
                className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700 focus:outline-none" rows={2} />
              <div className="flex gap-2">
                <button onClick={onEditSave} className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-bold text-white">保存</button>
                <button onClick={onEditCancel} className="rounded-lg bg-sky-100 px-3 py-1 text-xs text-sky-600">キャンセル</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-black leading-snug ${step.done ? "text-sky-400 line-through" : "text-sky-900"}`}>
                {step.title}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed ${step.done ? "text-sky-400" : unlocked ? "text-sky-600" : "text-sky-300"}`}>
                {step.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <label className={`flex cursor-pointer items-center gap-2 ${!unlocked ? "cursor-not-allowed" : ""}`}>
                  <input type="checkbox" checked={step.done} disabled={loading || !unlocked}
                    onChange={onToggle} className="h-4 w-4 accent-sky-500" />
                  <span className="text-xs text-sky-400">{step.done ? "完了！" : "完了にする"}</span>
                </label>
                {unlocked && !step.done && (
                  <button onClick={onEditStart} className="text-xs text-sky-300 underline hover:text-sky-500">編集</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionMap({ routeId, goal, summary, progress, steps, phases,}: Props) {
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



  const [openPhases, setOpenPhases] = useState<Set<number>>(() => {
    if (!phases || phases.length === 0) return new Set([0]);
    const completedDays = sortedAsc.filter(s => s.done).map(s => s.scheduledDay);
    const maxCompletedDay = completedDays.length > 0 ? Math.max(...completedDays) : 0;
    const currentPhaseIndex = phases.findIndex(p => maxCompletedDay >= p.startDay && maxCompletedDay <= p.endDay);
    return new Set([Math.max(0, currentPhaseIndex)]);
  });

  const togglePhase = (index: number) => {
    setOpenPhases(prev => {
      const next = new Set(prev);
      if (next.has(index)) { next.delete(index); } else { next.add(index); }
      return next;
    });
  };


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
    const idx = sortedAsc.findIndex(s => s.id === stepId);
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
      const res = await fetch("/api/update-steps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, steps: updated }),
      });
      if (!res.ok) throw new Error("更新失敗");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally { setLoading(false); }
  };

  const handleFeedbackSubmit = async () => {
    if (!pendingStep) return;
    setShowFeedbackModal(false);
    const updated = localSteps.map(s => s.id === pendingStep.id ? { ...s, done: true } : s);
  const handleEditStart = (step: Step) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description);
  };



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
    } catch (e) {
      alert(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally { setExporting(false); }
  };

  return (
    <div className="relative h-screen overflow-hidden text-sky-900" style={{ background: "linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)" }}>

      {/* ── トップバー（全幅・PC/SP共通） ── */}
      <div className="sticky top-0 z-30 w-full px-4 py-3 text-center" style={{ backgroundColor: "#e0f2fe" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/history" className="text-xs font-bold text-sky-500 hover:text-sky-700">
            ← 旅の記録
          </Link>
          <div className="flex-1 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-500">✦ Goal ✦</span>
            <h1 className="text-sm font-black text-sky-900 md:text-base">{goal}</h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-sky-600">{currentProgress}%</span>
          </div>
        </div>
        {/* 進捗バー */}
        <div className="mx-auto mt-2 max-w-6xl">
          <div className="h-1 w-full overflow-hidden rounded-full bg-sky-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-700"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full h-8"
          style={{ background: "linear-gradient(to bottom, #e0f2fe, transparent)" }} />
      </div>

      {/* ── メインコンテンツ（PC: 2カラム, SP: 1カラム） ── */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-24 md:grid md:grid-cols-[1fr_320px] md:gap-8 md:pb-8">

        {/* ── 左カラム：3Dロードマップ ── */}
        <div
          ref={scrollRef}
          className="relative overflow-y-auto md:h-[calc(100vh-120px)] md:rounded-2xl"
        >
          <div className="relative mx-auto max-w-lg px-2">
            {/* 中央縦ライン */}
            <div className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2"
              style={{
                top: 0, bottom: 0,
                background: "linear-gradient(to bottom, rgba(125,211,252,0.1), rgba(125,211,252,0.5) 20%, rgba(125,211,252,0.5) 80%, rgba(125,211,252,0.1))",
              }}
            />

            <div className="flex flex-col">
              {phases && phases.length > 0 ? (
                phases.map((phase, phaseIndex) => {
                  const phaseSteps = sortedSteps.filter(
                    s => s.scheduledDay >= phase.startDay && s.scheduledDay <= phase.endDay
                  );
                  const phaseDone = phaseSteps.filter(s => s.done).length;
                  const phaseTotal = phaseSteps.length;
                  const phaseProgress = phaseTotal === 0 ? 0 : Math.round((phaseDone / phaseTotal) * 100);
                  const isOpen = openPhases.has(phaseIndex);
                  const isCompleted = phaseProgress === 100;

                  return (
                    <div key={phaseIndex} className="mb-4">
                      <button
                        onClick={() => togglePhase(phaseIndex)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-sky-100/80 border border-sky-200 text-left transition hover:bg-sky-200/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isCompleted ? "✅" : isOpen ? "📖" : "📕"}</span>
                          <div>
                            <p className="text-sm font-black text-sky-900">{phase.title}</p>
                            <p className="text-xs text-sky-500">Day {phase.startDay} 〜 {phase.endDay}　{phaseDone}/{phaseTotal} 完了</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-sky-200 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${phaseProgress}%` }} />
                          </div>
                          <span className="text-sky-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="mt-2">
                          {phaseSteps.map((step) => {
                            const globalIndex = sortedSteps.findIndex(s => s.id === step.id);
                            return (
                              <StepCard
                                key={step.id} step={step} index={globalIndex} total={sortedSteps.length}
                                unlocked={isUnlocked(step.id)} loading={loading}
                                editingStepId={editingStepId} editTitle={editTitle} editDescription={editDescription}
                                onToggle={() => handleToggle(step.id)} onEditStart={() => handleEditStart(step)}
                                onEditSave={() => handleEditSave(step.id)} onEditCancel={() => setEditingStepId(null)}
                                onEditTitleChange={setEditTitle} onEditDescriptionChange={setEditDescription}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                sortedSteps.map((step, index) => (
                  <StepCard
                    key={step.id} step={step} index={index} total={sortedSteps.length}
                    unlocked={isUnlocked(step.id)} loading={loading}
                    editingStepId={editingStepId} editTitle={editTitle} editDescription={editDescription}
                    onToggle={() => handleToggle(step.id)} onEditStart={() => handleEditStart(step)}
                    onEditSave={() => handleEditSave(step.id)} onEditCancel={() => setEditingStepId(null)}
                    onEditTitleChange={setEditTitle} onEditDescriptionChange={setEditDescription}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── 右カラム：サイドバー（PC: sticky, SP: 下部固定ボタンのみ） ── */}
        <div className="hidden md:block">
          <div className="sticky top-[88px] space-y-4">

            {/* 概要カード */}
            <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-sky-400">旅の概要</p>
              <p className="text-sm text-sky-700">{summary}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-sky-400">
                  <span>全体進捗</span>
                  <span className="font-bold text-sky-600">{currentProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-700"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-sky-400">
                  {localSteps.filter(s => s.done).length} / {localSteps.length} ステップ完了
                </p>
              </div>
            </div>

            {/* 今やるべきタスク */}
            {nextStep && (
              <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500">
                  🎯 次のステップ
                </p>
                <p className="text-xs font-bold text-sky-400">Day {nextStep.scheduledDay}</p>
                <p className="mt-1 text-sm font-black text-sky-900">{nextStep.title}</p>
                <p className="mt-1 text-xs text-sky-600">{nextStep.description}</p>
                <button
                  onClick={() => handleToggle(nextStep.id)}
                  disabled={loading || !isUnlocked(nextStep.id)}
                  className="mt-3 w-full rounded-xl bg-sky-500 py-2 text-xs font-bold text-white transition hover:bg-sky-600 disabled:opacity-40"
                >
                  {isUnlocked(nextStep.id) ? "✓ 完了にする" : "🔒 前のステップを完了してください"}
                </button>
              </div>
            )}

            {/* 完了時メッセージ */}
            {currentProgress === 100 && (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
                <p className="text-2xl">🎉</p>
                <p className="mt-1 text-sm font-black text-emerald-700">旅を完走しました！</p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full rounded-xl bg-blue-500 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                {exporting ? "書き出し中..." : "Google Tasks に書き出す"}
              </button>
              <Link href={`/garden/${routeId}`}
                className="block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600">
                果樹園へ向かう 🍎
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── SP用 下部ボタン（PCでは非表示） ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-4 md:hidden"
        style={{ background: "linear-gradient(to top, #ffffff 60%, transparent)" }}>
        <div className="flex flex-col gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="w-full rounded-xl bg-blue-500 py-3 font-bold text-white transition hover:bg-blue-600 disabled:opacity-50">
            {exporting ? "書き出し中..." : "Google Tasks に書き出す"}
          </button>
          <Link href={`/garden/${routeId}`}
            className="w-full rounded-xl bg-emerald-500 py-3 text-center font-bold text-white transition hover:bg-emerald-600">
            果樹園（Garden）へ向かう 🍎
          </Link>
          <Link href="/history"
            className="w-full rounded-xl bg-sky-100 py-3 text-center font-bold text-sky-600 transition hover:bg-sky-200">
            📜 旅の記録を見る
          </Link>
        </div>
      </div>
    </div>
  );
  }
}