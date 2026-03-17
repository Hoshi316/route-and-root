// lib/apple.ts

// 1. リンゴの品種（バラエティ）の型定義
export type AppleVariety = 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';

// 2. リンゴの日本語名マスターデータ
// 貯蔵庫（Collection）などで表示する際に使用します
export const APPLE_NAMES: Record<AppleVariety, string> = {
  sun: "サン・ルビー",
  moon: "ムーン・シルバー",
  forest: "フォレスト・ジェイド",
  midnight: "ミッドナイト",
  rare: "ゴールデン・ピピン"
};

// 3. 品種ごとのイメージカラー（UI演出用）
// 背景を光らせたり、雨の色を変えたりする時に便利です
export const APPLE_COLORS: Record<AppleVariety, string> = {
  sun: "#ff4d4d",      // 鮮やかな赤
  moon: "#e2e8f0",     // シルバーグレー
  forest: "#10b981",   // エメラルドグリーン
  midnight: "#4338ca", // 深いネイビー
  rare: "#fbbf24"      // ゴールド
};

// 4. (おまけ) 品種ごとの説明文（図鑑風にしたい場合）
export const APPLE_DESC: Record<AppleVariety, string> = {
  sun: "情熱的なやる気に満ちた時に実る、太陽の果実。",
  moon: "静かな落ち着きの中で育つ、神秘的なリンゴ。",
  forest: "安定した心が生み出す、癒やしの力を持つ果実。",
  midnight: "深い思索や葛藤の末に実る、夜のリンゴ。",
  rare: "奇跡的なバランスで生まれる、最高級の黄金リンゴ。"
};