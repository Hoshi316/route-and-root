"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function MissionMap({
  routeId,
  goal,
  summary,
  progress,
  steps,
}: Props) {
  const [localSteps, setLocalSteps] = useState(steps);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const currentProgress =
    localSteps.length === 0
      ? 0
      : Math.round(
          (localSteps.filter((step) => step.done).length / localSteps.length) * 100
        );

  const handleToggle = async (stepId: string) => {
    const updatedSteps = localSteps.map((step) =>
      step.id === stepId ? { ...step, done: !step.done } : step
    );

    setLocalSteps(updatedSteps);
    setLoading(true);

    try {
      const res = await fetch("/api/update-steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId,
          steps: updatedSteps,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "更新に失敗しました");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-orange-50 p-8 text-gray-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold">旅のしおり</h1>
        <h2 className="mb-2 text-2xl font-semibold">{goal}</h2>
        <p className="mb-4 text-gray-700">{summary}</p>

        <div className="mb-8 rounded-xl bg-white p-4 shadow">
          <p className="font-semibold">進捗: {currentProgress}%</p>
        </div>

        <div className="space-y-4">
          {localSteps.map((step) => (
            <div
              key={step.id}
              className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={step.done}
                  disabled={loading}
                  onChange={() => handleToggle(step.id)}
                  className="mt-1 h-5 w-5"
                />
                <div>
                  <p className="text-sm font-semibold text-orange-600">
                    Day {step.scheduledDay}
                  </p>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-gray-700">{step.description}</p>
                  <p className="mt-1 text-sm">
                    状態: {step.done ? "完了" : "未完了"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}