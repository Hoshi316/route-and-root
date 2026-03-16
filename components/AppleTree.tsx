"use client";
import Apple from "./Apple";
import { useState, useEffect } from "react";

type AppleTreeProps = {
  level: number;
  variety: 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';
  hasApple: boolean;
  moodScore: number;
};

export default function AppleTree({ level, variety, hasApple, moodScore }: AppleTreeProps) {
  const [imgError, setImgError] = useState(false);
  const treeImagePath = `/images/tree-${level}.svg`;

  // レベルが変わったらエラー状態をリセットする
  useEffect(() => {
    setImgError(false);
  }, [level]);

  return (
    <div className="relative flex flex-col items-center justify-center w-80 h-80">
      {/* 木の見た目 */}
      <div className="text-8xl flex items-center justify-center transition-all duration-500">
        {!imgError ? (
          <img 
            src={treeImagePath} 
            alt={`Tree Level ${level}`} 
            className="w-64 h-64 object-contain"
            onError={() => setImgError(true)} // 画像がない時にエラーを検知
          />
        ) : (
          /* 画像がない時のバックアップ（絵文字） */
          <div className="animate-pulse">
            {level === 0 && "🌱"}
            {level === 1 && "🎋"}
            {level >= 2 && "🌳"}
          </div>
        )}
      </div>

      {/* リンゴの実 */}
      {level >= 2 && hasApple && (
        <div className="absolute top-12 animate-bounce">
           <Apple variety={variety} moodScore={moodScore} />
        </div>
      )}

      {/* 地面の影 */}
      <div className="mt-4 w-32 h-4 bg-orange-200/50 rounded-full blur-sm"></div>
    </div>
  );
}