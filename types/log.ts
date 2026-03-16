export type LogDoc = {
  userId: string;
  routeId: string;
  moodScore: number;
  note: string;
  appleColor: string;
  appleSize: number;
  comment: string;
  createdAt: string;
  variety: 'sun' | 'moon' | 'midnight' | 'forest' | 'rare'; // ★これを追加
};