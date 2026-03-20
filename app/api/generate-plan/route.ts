import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: "us-central1",
});

// ... stepSchema, planSchema は既存のまま ...

export async function POST(req: Request) {
  try {
    const { goal, durationDays, message } = await req.json();

    if (!goal || !durationDays) {
      return Response.json({ error: "goal と durationDays は必須です" }, { status: 400 });
    }

    // ── 過去の全フィードバックを分析 ──
    let feedbackContext = "";
    if (userId) {
      try {
        const { db } = await import("@/lib/firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const snap = await getDocs(query(collection(db, "routes"), where("userId", "==", userId)));
        const allFeedbacks = snap.docs.flatMap(d => d.data().stepFeedbacks || []);

        if (allFeedbacks.length > 0) {
          const avgDiff = (allFeedbacks.reduce((s: number, f: any) => s + f.difficulty, 0) / allFeedbacks.length).toFixed(1);

          const feelings = allFeedbacks.map((f: any) => f.feeling).filter(Boolean);
          const batchiCount = feelings.filter((f: string) => f === "バッチリ").length;
          const muzuiCount = feelings.filter((f: string) => f === "微妙").length;
          const maaCount = feelings.filter((f: string) => f === "まあまあ").length;
          const totalFeelings = feelings.length;

          const avgEnergy = allFeedbacks.filter((f: any) => f.energy).length > 0
            ? (allFeedbacks.reduce((s: number, f: any) => s + (f.energy || 3), 0) / allFeedbacks.length).toFixed(1)
            : null;

          const hardMemos = allFeedbacks
            .filter((f: any) => f.difficulty >= 4 && f.memo)
            .map((f: any) => `"${f.memo}"`)
            .slice(0, 5)
            .join(", ");

          const easyMemos = allFeedbacks
            .filter((f: any) => f.difficulty <= 2 && f.memo)
            .map((f: any) => `"${f.memo}"`)
            .slice(0, 3)
            .join(", ");

          const totalRoutes = snap.docs.length;
          const completedRoutes = snap.docs.filter(d => d.data().progress === 100).length;

          const feelingTrend = totalFeelings > 0
            ? (batchiCount >= maaCount && batchiCount >= muzuiCount
                ? "バッチリ（余裕があるかも）"
                : muzuiCount >= batchiCount && muzuiCount >= maaCount
                ? "微妙（少し詰め込みすぎかも）"
                : "まあまあ（バランスが良い）")
            : "データなし";

          feedbackContext = `
【このユーザーの過去の学習パターン（${totalRoutes}件のルート・${allFeedbacks.length}件のフィードバックから分析）】

■ 達成状況
- 過去のルート完了率: ${completedRoutes}/${totalRoutes}件完了

■ 難易度の傾向
- ステップの平均難易度: ${avgDiff}/5
- 難しいと感じた時のメモ: ${hardMemos || "なし"}
- 簡単すぎた時のメモ: ${easyMemos || "なし"}

■ やる気・達成感の傾向
${avgEnergy ? `- 平均やる気スコア: ${avgEnergy}/5` : ""}
- 達成感の内訳: バッチリ ${batchiCount}回 / まあまあ ${maaCount}回 / 微妙 ${muzuiCount}回
- 最も多い達成感: ${feelingTrend}

■ このデータを踏まえたプラン調整指示（必ず反映すること）
${Number(avgDiff) >= 4 ? "- 難易度が高め → 1ステップの量を減らし、より細かく分割すること" : ""}
${Number(avgDiff) <= 2 ? "- 難易度が低め → もう少し密度を上げてチャレンジングにしてOK" : ""}
${muzuiCount > batchiCount ? "- 達成感「微妙」が多い → 序盤に簡単なステップを多めに配置し、小さな成功体験を積ませること" : ""}
${batchiCount > muzuiCount + maaCount ? "- 達成感「バッチリ」が多い → ステップ数を増やすか、1ステップの内容を充実させてOK" : ""}
${completedRoutes === 0 ? "- まだ完了ルートがない → 短期間で達成感を得やすいプランを優先すること" : ""}
`;
        }
      } catch (e) {
        console.warn("フィードバック取得失敗:", e);
      }
    }

    // ── Google検索で最新情報を収集 ──
    let searchContext = "";
    try {
      const searchResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `以下の目標を達成するための、現在最も効果的・最新の学習方法、ツール、リソースをGoogle検索で調べてください。

目標: ${goal}

以下の観点で調べてください：
- 最新バージョンや最新トレンド（2024〜2025年）
- 現在最も推奨されているツールやサービス名（具体的に）
- 効率的な学習順序や方法論
- 初心者〜中級者向けの具体的なリソース名やサイト名

検索結果をもとに、重要な情報を箇条書きで300文字以内で日本語でまとめてください。`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      searchContext = searchResponse.text ?? "";
    } catch (e) {
      // 検索失敗してもプラン生成は続行
      console.warn("Search grounding failed, continuing without it:", e);
    }

    // ── Step2: 検索情報を注入してプラン生成 ──
    const prompt = `
あなたは目標達成を支援する、ユーザーの専任コーチです。
以下の情報をもとに、3つのプランを作成し、その中からユーザーに最適な1つを推薦してください。

目標: ${goal}
ユーザー希望期間(日): ${durationDays}
メッセージ: ${message ?? "なし"}

${searchContext ? `【Google検索で得た最新情報 - ステップに反映すること】
${searchContext}
` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━
【プラン1】style: "full_throttle"
styleLabel: "Full Throttle" / styleEmoji: "⚡"
philosophy: 速度と密度で圧倒する。今すぐ結果を出す。
tagline: 最速で、限界の向こう側へ。
- 希望期間を上限として最短日数を設定（最短は3分の1まで）
- ステップ3〜4個・高密度
- intensityLevel: 5
- 禁止ワード：「無理せず」「少しずつ」「ゆっくり」

【プラン2】style: "wayfinder"
styleLabel: "Wayfinder" / styleEmoji: "🧭"
philosophy: 納得と理解を積み重ねる。自分の地図を自分で描く。
tagline: 正解より納得を。本物の力をつける旅。
- 希望期間（${durationDays}日）そのまま使用
- ステップ5〜7個・各ステップに理由を含める
- intensityLevel: 3
- 禁止ワード：「効率」「最短」「ショートカット」

【プラン3】style: "flow_state"
styleLabel: "Flow State" / styleEmoji: "🌊"
philosophy: 毎日15分でも続く習慣に変換する。AIと道具を賢く使い、消耗しない。
tagline: 頑張らずに、仕組みで進む。
- 希望期間の最大1.5倍まで延長可
- 1日15〜30分の最小単位に分解
- 具体的なツール名を2つ以上含める
- intensityLevel: 2
- 禁止ワード：「集中して」「まとめて」「一気に」

━━━━━━━━━━━━━━━━━━━━━━━━━
【おすすめの選定】
上記3つのプランを作成した後、以下の観点でユーザーに最適な1つを選んでください：

判断基準（優先度順）：
1. ユーザーの過去の完遂率（低ければ負荷の軽いプランを推薦）
2. ユーザーのメッセージのトーン（忙しそうならflow_state、やる気満々ならfull_throttle）
3. 目標の性質（知識習得ならwayfinder、スキル習得ならfull_throttle）
4. 初回ユーザーの場合はwayfinderを推薦

recommendedStyle: "full_throttle" / "wayfinder" / "flow_state" のいずれか
recommendationMessage: 推薦理由を「ユーザーの状況に寄り添った」温かい口調で2〜3文で。
  過去データがある場合は必ずそれに言及すること。
  例：「以前のFull Throttleでは3日目で失速されていましたね。今回はFlow Stateで
  毎日小さく積み上げる方が、きっと最後まで走り切れると思います。」

━━━━━━━━━━━━━━━━━━━━━━━━━
出力ルール（厳守）:
- 3つのプランは明確に性格が違うこと
- 日本語で出力
- JSONのみを出力すること

【文字数制限 - これを最優先で守ること】
- philosophy: 20文字以内
- tagline: 20文字以内
- suitableFor: 30文字以内
- tradeoff: 30文字以内
- daysComment: 25文字以内
- summary: 40文字以内
- recommendationMessage: 60文字以内
- steps.title: 15文字以内
- steps.description: 40文字以内

長い文章は必ず削れ。無駄な情報を削ぎ落とすことがこのプランナーの美学である。
【フェーズ分割ルール】
- 期間が14日以下：phases は1つ（全体を1フェーズ）
- 期間が15〜60日：phases は2〜3つ
- 期間が61日以上：phases は3〜5つ
- 各フェーズにタイトルをつけること（例：「第1章：基礎固め」「第2章：実践編」）
- フェーズのstartDayとendDayはstepsのscheduledDayと整合させること
`
;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: { type: Type.ARRAY, items: planSchema },
            recommendedStyle: { type: Type.STRING },
            recommendationMessage: { type: Type.STRING },
          },
          required: ["plans", "recommendedStyle", "recommendationMessage"],
        },
      },
    });

    const text = response.text;
    const data = JSON.parse(text);
    return Response.json(data);

  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "プラン生成に失敗しました" },
      { status: 500 }
    );
  }
}