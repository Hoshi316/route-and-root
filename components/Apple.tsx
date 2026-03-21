"use client";

import { AppleVariety } from "@/lib/apple";

type Props = {
  variety: AppleVariety;
  moodScore: number;
};

export default function Apple({ variety, moodScore }: Props) {
  // 1. サイズマップ
  const sizeMap: Record<number, number> = {
    1: 60, 2: 75, 3: 90, 4: 105, 5: 120
  };

  // 2. ★超重要：内部名と実際のファイル名のズレをここで吸収する
  const fileMap: Record<string, string> = {
    // 以前の品種名
    red: "apple-sun",
    green: "apple-forest",
    purple: "apple-midnight",
    gold: "apple-rare",
    // 新しい品種名（ファイル名と一致しているもの）
    pink: "pink",
    blue: "blue",
    yellow: "yellow",
    orange: "orange",
    sakura: "sakura",
    nashi: "nashi",
    suika: "suika",
    pin: "pin"
  };

  const fileName = fileMap[variety] || "apple-forest";
  const size = sizeMap[moodScore] || 90;

  return (
    <img 
      src={`/images/${fileName}.svg`} 
      alt={variety} 
      style={{ width: `${size}px`, height: "auto" }}
      className="drop-shadow-xl animate-bounce-slow"
    />
  );
}