"use client";
import Apple from "./Apple";
import { AppleVariety } from "@/lib/apple"; // 型をインポート
import { useState, useEffect } from "react";

type AppleTreeProps = {
  level: number;
  isPlanted: boolean;
  variety: AppleVariety; // ★12種類を受け入れ
  hasApple: boolean;
  moodScore: number;
};

export default function AppleTree({ level, isPlanted, variety, hasApple, moodScore }: AppleTreeProps) {
  const [imgError, setImgError] = useState(false);

  // 伝説の果実（ビッグツリー限定）のリスト
  const isLegendary = ['sakura', 'nashi', 'suika', 'pin'].includes(variety);

  const getImagePath = () => {
    if (isPlanted) return "/images/bigtree.svg";
    if (level === 0) return "/images/naegi.svg";
    if (level === 1) return "/images/growup.svg";
    return "/images/tree.svg";
  };

  const treeImagePath = getImagePath();

  useEffect(() => {
    setImgError(false);
  }, [level, isPlanted, variety]); // varietyが変わった時も再チェック

  return (
    <div className="relative flex flex-col items-center justify-center w-80 h-80">
      
      {/* 演出エフェクト */}
      {(isPlanted || isLegendary) && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className={`absolute inset-0 animate-pulse blur-3xl rounded-full ${
            isLegendary ? "bg-orange-200/20" : "bg-yellow-200/10"
          }`} />
          {[...Array(isLegendary ? 10 : 6)].map((_, i) => (
            <span
              key={i}
              className={`absolute animate-ping opacity-60 ${isLegendary ? "text-orange-300" : "text-yellow-400"}`}
              style={{
                top: `${Math.random() * 80}%`,
                left: `${Math.random() * 80}%`,
                animationDuration: `${1.5 + i * 0.5}s`,
                fontSize: `${10 + i * 2}px`
              }}
            >
              {isLegendary ? "✨" : "✦"}
            </span>
          ))}
        </div>
      )}

      {/* 木の本体 */}
      <div className="z-10 flex items-center justify-center transition-all duration-1000">
        {!imgError ? (
          <img 
            src={treeImagePath} 
            alt="Tree" 
            className={`object-contain transition-all duration-700 ${
              isPlanted ? "w-72 h-72 translate-y-2" : "w-64 h-64"
            } ${isLegendary && isPlanted ? "brightness-110 drop-shadow-[0_0_15px_rgba(255,223,0,0.2)]" : ""}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-8xl animate-bounce">🌳</div>
        )}
      </div>

      {/* りんごの実：判定がここでされます */}
      {(isPlanted || level >= 2) && hasApple && (
        <div className="absolute top-12 z-20 animate-bounce">
           {/* varietyが正しく渡っていれば、ここで画像が表示されます */}
           <Apple variety={variety} moodScore={moodScore} />
        </div>
      )}

      {/* 地面の影 */}
      <div className={`mt-2 h-4 rounded-full blur-sm transition-all duration-1000 ${
        isPlanted ? "w-48 bg-orange-900/10" : "w-32 bg-orange-200/50"
      }`}></div>
    </div>
  );
}