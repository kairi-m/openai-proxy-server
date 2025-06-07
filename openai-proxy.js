require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

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

  // 翻訳用のエンドポイントを追加
app.post("/translate-section", async (req, res) => {
  const { content, targetLanguage } = req.body;
  if (!content) return res.status(400).json({ error: "翻訳するコンテンツが指定されていません。" });
  if (!targetLanguage) return res.status(400).json({ error: "翻訳先の言語が指定されていません。" });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `あなたは学術論文の翻訳を専門とするAIアシスタントです。与えられた論文セクションを${targetLanguage}に翻訳してください。
            学術的な正確性を保ちながら、自然な翻訳を心がけてください。
            専門用語は適切に翻訳し、必要に応じて原語を括弧内に残してください。`
          },
          {
            role: "user",
            content: `以下の論文セクションを${targetLanguage}に翻訳してください：\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // 翻訳結果を返す
    res.json({ 
      reply: response.data.choices[0].message.content,
      sourceLanguage: "English", // または適切な言語検出ロジックを実装
      targetLanguage: targetLanguage
    });

  } catch (err) {
    console.error("セクション翻訳エラー:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "翻訳処理に失敗しました。", 
      details: err.message 
    });
  }
});
});
