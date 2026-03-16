// components/Apple.tsx
type Props = {
  variety: 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';
  moodScore: number; // 1〜5
};

export default function Apple({ variety, moodScore }: Props) {
  // 仕様書 8.1 のサイズ定義を適用
  const sizeMap: Record<number, number> = {
    1: 60,
    2: 75,
    3: 90,
    4: 105,
    5: 120
  };

  const size = sizeMap[moodScore] || 90;

  return (
    <img 
      src={`/images/apple-${variety}.svg`} 
      alt={variety} 
      style={{ width: `${size}px`, height: 'auto' }}
      className="drop-shadow-xl animate-bounce-slow"
    />
  );
}