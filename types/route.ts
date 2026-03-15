export type Step = {
  id: string;
  title: string;
  description: string;
  scheduledDay: number;
  done: boolean;
};

export type RoutePlan = {
  goal: string;
  summary: string;
  steps: {
    title: string;
    description: string;
    scheduledDay: number;
  }[];
};

export type RouteDoc = {
  userId: string;
  goal: string;
  durationDays: number;
  message: string;
  summary: string;
  steps: Step[];
  progress: number;
  createdAt: string;
};