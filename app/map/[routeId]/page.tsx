import { getRoute } from "@/lib/firestore";

type PageProps = {
  params: Promise<{
    routeId: string;
  }>;
};

export default async function MapPage({ params }: PageProps) {
  const { routeId } = await params;
  const route = await getRoute(routeId);

  const typedRoute = route as {
    id: string;
    goal: string;
    summary: string;
    progress: number;
    steps: {
      id: string;
      title: string;
      description: string;
      scheduledDay: number;
      done: boolean;
    }[];
  };

  return (
    <main className="min-h-screen bg-orange-50 p-8 text-gray-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold">旅のしおり</h1>
        <h2 className="mb-2 text-2xl font-semibold">{typedRoute.goal}</h2>
        <p className="mb-4 text-gray-700">{typedRoute.summary}</p>

        <div className="mb-8 rounded-xl bg-white p-4 shadow">
          <p className="font-semibold">進捗: {typedRoute.progress}%</p>
        </div>

        <div className="space-y-4">
          {typedRoute.steps.map((step) => (
            <div
              key={step.id}
              className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-orange-600">
                Day {step.scheduledDay}
              </p>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mb-2 text-gray-700">{step.description}</p>
              <p className="text-sm">
                状態: {step.done ? "完了" : "未完了"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}