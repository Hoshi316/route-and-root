import { getRoute } from "@/lib/firestore";
import MissionMap from "@/components/MissionMap";

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
    <MissionMap
      routeId={routeId}
      goal={typedRoute.goal}
      summary={typedRoute.summary}
      progress={typedRoute.progress}
      steps={typedRoute.steps}
    />
  );
}