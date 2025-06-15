require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const emotionMapBefore = {
  happy: '確信',
  stressed: 'ストレス',
  tired: '疲労',
  excited: '興奮',
  normal: '何となく'
};
const emotionMapAfter = {
  happy: '満足',
  regret: '後悔',
  relief: '安心',
  guilty: '罪悪感',
  normal: '普通'
};

app.post("/ask", async (req, res) => {
  const { userPrompt } = req.body;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
  {
    role: "system",
    content:
  "次の形式の **正確なJSON** 配列のみを返してください。すべてのキーと文字列値をダブルクォートで囲んでください。文章は禁止です。\n\n" +
  "[\n  {\n    \"date\": \"2025-07-12\",\n    \"title\": \"川越夏祭り\",\n    \"location\": \"川越市駅前\"\n  },\n  ...\n]"
  },
  { role: "user", content: userPrompt }
],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
console.log("🔁 OpenAI reply:", response.data.choices[0].message.content);
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "OpenAIとの通信に失敗しました。" });
  }
});

app.listen(3001, () => console.log("🟢 OpenAIプロキシ実行中：http://localhost:3001"));

app.post("/evaluate", async (req, res) => {
  const entry = req.body.entry;

  const prompt = `
以下は1人の日記の記録です：

- 朝食：${entry.breakfast}
- 昼食：${entry.lunch}
- 夕食：${entry.dinner}
- この日の起床時間：${entry.wakeUp}
- この日の就寝時間：${entry.sleep}
- 運動時間：${entry.exercise}分
- 気分:${entry.tension}
- 天気:${entry.weather}
- 活動記録：${entry.notes}

上記はある人物の1日の生活記録です。健康習慣の観点から評価を行い、改善すべき点やその理由を説明してください。特に「睡眠」「食事」「運動」「気分」の観点から考えてください。
また、本人が記録した「活動記録」には前向きな励ましやモチベーションの上がる言葉を添えてください。
以下の形式で返答してください：
{
  "healthReview": "...",
  "improvementSuggestions": "...",
  "encouragement": "..."
}
`;

  try {
    const result = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "あなたは生活習慣の専門アドバイザーです。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    res.json({ reply: JSON.parse(result.data.choices[0].message.content) });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "AI評価に失敗しました。" });
  }
});

app.post("/goal-advice", async (req, res) => {
  const { userPrompt } = req.body;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは目標達成を支援する専門家です。ユーザーの目標やカテゴリ、締め切りに応じて、目標の実現に向けた実行可能でやる気の出るアドバイスを5個以内で与えてください。"
          },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ reply: response.data.choices[0].message.content });

  } catch (err) {
    console.error("🚨 goal-adviceエラー:", err.response?.data || err.message);
    res.status(500).json({ reply: "提案を生成できませんでした。" });
  }
});

app.post("/evaluate-lifestyle-summary", async (req, res) => {
  const entries = req.body.entry;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "評価対象の記録がありません。" });
  }

  const formatted = entries.map(e => {
    return `【${e.date}】
- 朝食：${e.breakfast || "未記入"}
- 昼食：${e.lunch || "未記入"}
- 夕食：${e.dinner || "未記入"}
- 起床時間：${e.wakeUp || "未記入"}
- 就寝時間：${e.sleep || "未記入"}
- 運動時間：${e.exercise || "未記入"}分
- 活動記録：${e.notes || "未記入"}`;
  }).join("\n\n");

  const prompt = `
以下はあるユーザーの複数日分の生活記録です：

${formatted}

これらの記録をもとに、
1. 生活習慣の全体的な評価（健康面で良い点と改善点）
2. 改善のための提案（起床・就寝時間、運動、食事など）
3. 活動に対する前向きな励ましコメント

を以下のJSON形式で出力してください：

{
  "healthReview": "...",
  "improvementSuggestions": "...",
  "encouragement": "..."
}
`;

  try {
    const result = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "あなたは生活習慣の専門家です。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    res.json({ reply: JSON.parse(result.data.choices[0].message.content) });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "評価に失敗しました。" });
  }
});

app.post("/summarize-section", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "要約するコンテンツが指定されていません。" });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは学術論文の要約を専門とするAIアシスタントです。与えられた論文セクションの内容を、重要なポイントを保持しながら要約してください。"
          },
          {
            role: "user",
            content: `以下の論文セクションを要約してください：\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error("セクション要約エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "要約処理に失敗しました。", details: err.message });
  }
});

app.post("/summarize-full", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "要約するコンテンツが指定されていません。" });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは学術論文の要約を専門とするAIアシスタントです。論文全体を分析し、各セクションの主要なポイントと論文全体の貢献を含めて要約してください。"
          },
          {
            role: "user",
            content: `以下の論文全体を要約してください：\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error("全体要約エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "論文全体の要約に失敗しました。", details: err.message });
  }
});

app.post("/analyze-log", async (req, res) => {
  const { log } = req.body;

  // 感情を日本語に変換
  const beforeEmotionJP = emotionMapBefore[log.beforeEmotion] || log.beforeEmotion;
  const afterEmotionJP = emotionMapAfter[log.afterEmotion] || log.afterEmotion;

  const prompt = `
以下の節約/浪費ログを分析し、振り返りコメントを生成してください：

- 種類: ${log.type === 'saving' ? '節約' : '浪費'}
- 金額: ${log.amount}円
- メモ: ${log.note}
- 未来の自分へのメッセージ: ${log.message}
- 選択前の感情: ${log.beforeEmotion}
- 選択後の感情: ${log.afterEmotion}
- シチュエーション: ${log.situations.join(', ')}

以下のJSON形式で返答してください：
{
  "reflection": "振り返りコメント",
  "suggestion": "改善提案（浪費の場合）または成功のポイント（節約の場合）",
  "encouragement": "励ましのメッセージ"
}`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは節約と浪費の分析を専門とするアドバイザーです。"
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ reply: JSON.parse(response.data.choices[0].message.content) });
  } catch (err) {
    console.error("ログ分析エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "ログの分析に失敗しました。" });
  }
});

app.post("/analyze-trends", async (req, res) => {
  const { logs } = req.body;
  
  const prompt = `
以下の過去の節約/浪費ログを分析し、傾向と改善点を抽出してください：

${logs.map(log => {
  const beforeEmotionJP = emotionMapBefore[log.beforeEmotion] || log.beforeEmotion;
  const afterEmotionJP = emotionMapAfter[log.afterEmotion] || log.afterEmotion;
  return `
【${log.date}】
- 種類: ${log.type === 'saving' ? '節約' : '浪費'}
- 金額: ${log.amount}円
- メモ: ${log.note}
- 未来の自分へのメッセージ: ${log.message}
- 感情の変化: ${beforeEmotionJP} → ${afterEmotionJP}
- シチュエーション: ${log.situations.join(', ')}
`}).join('\n')}

以下のJSON形式で返答してください：
{
  "trendAnalysis": "全体的な傾向分析",
  "emotionPatterns": "感情パターンの分析",
  "situationAnalysis": "シチュエーション別の分析",
  "recommendations": "改善のための具体的な提案"
}`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "あなたは節約と浪費のパターン分析を専門とするアドバイザーです。"
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ reply: JSON.parse(response.data.choices[0].message.content) });
  } catch (err) {
    console.error("傾向分析エラー:", err.response?.data || err.message);
    res.status(500).json({ error: "傾向分析に失敗しました。" });
  }
});
