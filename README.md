<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# hakanso

# Route & Root

Route & Root は、目標達成までのプロセスを「旅」として捉え、  
日々の感情を「リンゴ」として育てるタスク管理アプリです。

ユーザーが目標を入力すると、AI が達成までの道のりを「旅のしおり」として生成します。  
さらに、その日の気分や一言メモを記録することで、自分だけのリンゴが変化していきます。

進捗だけでなく、葛藤や疲れも含めて「成長の記録」として残すことを目指しています。

---

## コンセプト

従来のタスク管理アプリは、完了や進捗に注目しがちです。  
Route & Root では、そこに感情の記録を加えます。

- **Route** = 目標達成までの道のり
- **Root** = その過程で育つ感情と成長の記録

うまくいかなかった日や気分が落ち込んだ日も、  
失敗ではなく「育ち方の違い」として可視化します。

---

## MVPで実装する機能

- 目標入力フォーム
- AIによるミッションプラン生成
- ミッションマップ表示
- 気分ログ入力
- 気分に応じたリンゴの変化
- Firebase Authentication によるログイン
- Firestore へのデータ保存

---

## 画面構成

### 1. 目標入力画面
ユーザーが以下を入力します。

- 目標
- 何日で達成したいか
- 自分への一言メッセージ

送信すると、Gemini API を使ってプランを生成します。

### 2. ミッションマップ画面
AI が生成したステップ一覧を表示します。

- タスクの分解表示
- 各ステップの確認
- 完了チェック
- 進捗確認

### 3. 果樹園画面
ユーザーが以下を入力します。

- 気分スコア（1〜5）
- 一言メモ

その内容に応じて、リンゴの

- 色
- 大きさ

が変化します。

---

## 使用技術

- **言語:** TypeScript
- **フレームワーク:** Next.js（App Router）
- **UI:** React + Tailwind CSS
- **AI:** Gemini API
- **認証:** Firebase Authentication
- **データベース:** Firestore
- **デプロイ:** Vercel

---

## ディレクトリ構成

```txt
route-and-root/
├─ app/
│  ├─ page.tsx
│  ├─ map/
│  │  └─ [routeId]/
│  │     └─ page.tsx
│  ├─ garden/
│  │  └─ [routeId]/
│  │     └─ page.tsx
│  ├─ api/
│  │  ├─ generate-plan/
│  │  │  └─ route.ts
│  │  ├─ save-route/
│  │  │  └─ route.ts
│  │  ├─ get-route/
│  │  │  └─ route.ts
│  │  └─ save-log/
│  │     └─ route.ts
│  ├─ layout.tsx
│  └─ globals.css
│
├─ components/
│  ├─ GoalForm.tsx
│  ├─ MissionMap.tsx
│  ├─ Apple.tsx
│  ├─ MoodForm.tsx
│  └─ Header.tsx
│
├─ lib/
│  ├─ firebase.ts
│  ├─ firestore.ts
│  ├─ gemini.ts
│  └─ apple.ts
│
├─ types/
│  ├─ route.ts
│  ├─ log.ts
│  └─ user.ts
│
├─ .env.local
├─ package.json
└─ README.md
````

---

## データ構造

### users/{uid}

ユーザー情報を保存します。

### routes/{routeId}

以下の情報を保存します。

* goal
* durationDays
* message
* summary
* steps
* progress
* userId

### logs/{logId}

以下の情報を保存します。

* routeId
* userId
* moodScore
* note
* appleColor
* appleSize
* comment

---

## AIが返すJSON形式

AI は以下のような形式でプランを返します。

```json
{
  "goal": "統計のテストに合格する",
  "summary": "7日間で復習と演習を進める学習ルート",
  "steps": [
    {
      "title": "確率の基本を復習する",
      "description": "定義と代表的な公式を確認する",
      "scheduledDay": 1
    },
    {
      "title": "過去問を3問解く",
      "description": "基礎問題を中心に解いて流れを確認する",
      "scheduledDay": 2
    }
  ]
}
```

---

## リンゴ変化ルール

| moodScore | color   | size |
| --------- | ------- | ---- |
| 1         | #888888 | 60   |
| 2         | #6fa8dc | 75   |
| 3         | #ffaa00 | 90   |
| 4         | #ff7043 | 105  |
| 5         | #ff3333 | 120  |

---

## セットアップ方法

### 1. リポジトリをクローン

```bash
git clone <リポジトリURL>
cd route-and-root
```

### 2. パッケージをインストール

```bash
npm install
```

### 3. `.env.local` を作成

以下の環境変数を設定してください。

```env
GEMINI_API_KEY=your_gemini_api_key

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

---

## 役割分担

### ロジック / API / データベース担当

* Gemini API 連携
* API route 実装
* Firebase Authentication
* Firestore 接続
* 型定義
* 気分からリンゴパラメータへの変換ロジック

### UI / デザイン担当

* 入力フォームUI
* ミッションマップUI
* Appleコンポーネント
* 果樹園画面の見た目
* Tailwind によるデザイン調整

---

## 今回の開発目標

このプロジェクトは、万能な人生管理アプリを作ることが目的ではありません。

MVPで目指すのは、次の体験を完成させることです。

> 目標を入力すると、AIが旅のしおりを作ってくれる。
> 気分を記録すると、リンゴが育つ。

この一本の体験を、きちんと動く形で完成させます。

---

## 今回は実装しないもの

以下はMVPの対象外です。

* Google Calendar 連携
* Google Tasks 連携
* 音声入力
* 画像入力
* ソーシャル共有
* RAGによる推薦
* 過去の自分 / 未来の自分キャラクター機能

---

## デモの流れ

1. ログインする
2. 目標を入力する
3. AIでプランを生成する
4. ミッションマップを見る
5. 果樹園へ移動する
6. 気分とメモを入力する
7. リンゴが変化する

---

## メンバー

* ほし
* ゆいのみず 頑張ります

---

## ライセンス
>>>>>>> b89f4b251892c53cbd23d012b5b8f74fb36efeef
