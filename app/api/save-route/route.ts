import { saveRoute } from "@/lib/firestore";
import { RouteDoc } from "@/types/route";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, goal, durationDays, message, summary, steps } = body;

    if (!userId || !goal || !durationDays || !summary || !steps) {
      return Response.json(
        { error: "必要なデータが不足しています" },
        { status: 400 }
      );
    }

    const stepsWithState = steps.map(
      (
        step: { title: string; description: string; scheduledDay: number },
        index: number
      ) => ({
        id: crypto.randomUUID(),
        title: step.title,
        description: step.description,
        scheduledDay: step.scheduledDay,
        done: false,
      })
    );

    const route: RouteDoc = {
      userId,
      goal,
      durationDays,
      message: message ?? "",
      summary,
      steps: stepsWithState,
      progress: 0,
      createdAt: new Date().toISOString(),
      phases: body.phases ?? [],
    };

    const routeId = await saveRoute(route);

    return Response.json({ routeId });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "ルートの保存に失敗しました" },
      { status: 500 }
    );
  }
}