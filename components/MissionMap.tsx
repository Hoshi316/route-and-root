"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function StepCard({
  step,
  index,
  total,
  unlocked,
  loading,
  editingStepId,
  editTitle,
  editDescription,
  onToggle,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditTitleChange,
  onEditDescriptionChange,
}: {
  step: Step;
  index: number;
  total: number;
  unlocked: boolean;
  loading: boolean;
  editingStepId: string | null;
  editTitle: string;
  editDescription: string;
  onToggle: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditTitleChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
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
        opacity: visible ? (unlocked ? 1 : 0.9) : 0,
        transform: visible
          ? `scaleX(${depthScale}) translateY(0)`
          : `scaleX(${depthScale}) translateY(28px)`,
        transformOrigin: "center center",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {/* 中央ノード */}
      <div className="absolute left-1/2 z-10 -translate-x-1/2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: "#e0f2fe" }}
        >
          <div
            className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
              step.done
                ? "border-sky-500 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                : unlocked
                ? "border-sky-300 bg-white"
                : "border-sky-200 bg-sky-100"
            }`}
          />
        </div>
      </div>

      {/* カード */}
      <div className={`w-[44%] ${isLeft ? "mr-auto pl-1" : "ml-auto pr-1"}`}>
        <div
          className={`rounded-2xl border p-4 transition-all duration-300 ${
            step.done
              ? "border-sky-300 bg-sky-100/80 shadow-md"
              : unlocked
              ? "border-sky-200 bg-white shadow-lg"
              : "border-sky-100 bg-sky-50/60"
          }`}
        >
          {!unlocked && (
            <p className="mb-1 text-xs text-sky-300">🔒 前を完了してください</p>
          )}
          <p className={`mb-1 text-xs font-bold ${
            step.done ? "text-sky-500" : unlocked ? "text-sky-400" : "text-sky-300"
          }`}>
            Day {step.scheduledDay}
          </p>

          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="w-full rounded-lg border border-sky-300 bg-sky-50 p-2 text-sm font-bold text-sky-900 focus:outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700 focus:outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={onEditSave} className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-bold text-white">保存</button>
                <button onClick={onEditCancel} className="rounded-lg bg-sky-100 px-3 py-1 text-xs text-sky-600">キャンセル</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-black leading-snug ${
                step.done ? "text-sky-400 line-through" : unlocked ? "text-sky-900" : "text-sky-300"
              }`}>
                {step.title}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed ${
                step.done ? "text-sky-400" : "text-sky-700"
                }`}>
                {step.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <label className={`flex cursor-pointer items-center gap-2 ${!unlocked ? "cursor-not-allowed" : ""}`}>
                  <input
                    type="checkbox"
                    checked={step.done}
                    disabled={loading || !unlocked}
                    onChange={onToggle}
                    className="h-4 w-4 accent-sky-500"
                  />
                  <span className="text-xs text-sky-400">
                    {step.done ? "完了！" : "完了にする"}
                  </span>
                </label>
                {unlocked && !step.done && (
                  <button onClick={onEditStart} className="text-xs text-sky-300 underline hover:text-sky-500">
                    編集
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionMap({ routeId, goal, summary, progress, steps }: Props) {
  const [localSteps, setLocalSteps] = useState(steps);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(160);
  const [footerH, setFooterH] = useState(180);
  const router = useRouter();

  // ヘッダー・フッターの高さを実測
  useEffect(() => {
    const updateSizes = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight);
      if (footerRef.current) setFooterH(footerRef.current.offsetHeight);
    };
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  const sortedAsc = [...localSteps].sort((a, b) => a.scheduledDay - b.scheduledDay);
  const sortedSteps = [...sortedAsc].reverse();

  const currentProgress =
    localSteps.length === 0
      ? 0
      : Math.round((localSteps.filter((s) => s.done).length / localSteps.length) * 100);

  const isUnlocked = (stepId: string) => {
    const idx = sortedAsc.findIndex((s) => s.id === stepId);
    if (idx === 0) return true;
    return sortedAsc[idx - 1].done;
  };

  const handleToggle = async (stepId: string) => {
    if (!isUnlocked(stepId)) return;
    const updated = localSteps.map((s) =>
      s.id === stepId ? { ...s, done: !s.done } : s
    );
    setLocalSteps(updated);
    setLoading(true);
    try {
      const res = await fetch("/api/update-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, steps: updated }),
      });
      if (!res.ok) throw new Error("更新失敗");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (step: Step) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description);
  };

  const handleEditSave = async (stepId: string) => {
    const updated = localSteps.map((s) =>
      s.id === stepId ? { ...s, title: editTitle, description: editDescription } : s
    );
    setLocalSteps(updated);
    setEditingStepId(null);
    try {
      await fetch("/api/update-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, steps: updated }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getGoogleTasksAccessToken();
      if (!token) throw new Error("トークンを取得できませんでした");
      await exportToGoogleTasks(token, goal, localSteps);
      alert(`「Route & Root: ${goal}」を Google Tasks に書き出しました`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="relative h-screen overflow-hidden text-sky-900"
      style={{ background: "linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)" }}
    >

      {/* ══════════════════════════════════
          層1: GOALヘッダー（最前面・fixed）
      ══════════════════════════════════ */}
      <div
        ref={headerRef}
        className="fixed left-0 right-0 top-0 z-30 pb-4 pt-6 text-center"
        style={{ backgroundColor: "#e0f2fe" }}
      >
        <div className="mx-auto max-w-sm px-4">
          <div className="mb-1 inline-block rounded-full bg-sky-200/70 px-4 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">
            ✦ Goal ✦
          </div>
          <h1 className="text-lg font-black text-sky-900">{goal}</h1>
          <p className="mt-1 text-xs text-sky-500">{summary}</p>
          <div className="mx-auto mt-3 max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-sky-400">
              <span>進捗</span>
              <span className="font-bold text-sky-600">{currentProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-700"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* GOALヘッダー直下のフェードアウト層 */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full"
          style={{
            height: "48px",
            background: "linear-gradient(to bottom, #e0f2fe, transparent)",
          }}
        />
      </div>

      {/* ══════════════════════════════════
          層2: ボタン群（fixed・下部）
      ══════════════════════════════════ */}
      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, #ffffff 60%, transparent)" }}
      >
        <div className="mx-auto flex max-w-sm flex-col gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full rounded-xl bg-blue-500 py-3 font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {exporting ? "書き出し中..." : "Google Tasks に書き出す"}
          </button>
          <Link
            href={`/garden/${routeId}`}
            className="w-full rounded-xl bg-emerald-500 py-3 text-center font-bold text-white transition hover:bg-emerald-600"
          >
            果樹園（Garden）へ向かう 🍎
          </Link>
          <Link
            href="/history"
            className="w-full rounded-xl bg-sky-100 py-3 text-center font-bold text-sky-600 transition hover:bg-sky-200"
          >
            📜 旅の記録を見る
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════
          層3: タスクリスト（スクロール領域）
          ヘッダーとフッターの高さ分だけpaddingを確保
      ══════════════════════════════════ */}
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{
          paddingTop: `${headerH + 48}px`,
          paddingBottom: `${footerH}px`,
          zIndex: 10,
        }}
      >
        <div className="relative mx-auto max-w-lg px-4">
          {/* 中央縦ライン */}
          <div
            className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2"
            style={{
              top: 0,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(125,211,252,0.1), rgba(125,211,252,0.5) 20%, rgba(125,211,252,0.5) 80%, rgba(125,211,252,0.1))",
            }}
          />

          <div className="flex flex-col">
            {sortedSteps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                total={sortedSteps.length}
                unlocked={isUnlocked(step.id)}
                loading={loading}
                editingStepId={editingStepId}
                editTitle={editTitle}
                editDescription={editDescription}
                onToggle={() => handleToggle(step.id)}
                onEditStart={() => handleEditStart(step)}
                onEditSave={() => handleEditSave(step.id)}
                onEditCancel={() => setEditingStepId(null)}
                onEditTitleChange={setEditTitle}
                onEditDescriptionChange={setEditDescription}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}