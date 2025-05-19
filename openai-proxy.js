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
- 活動記録：${entry.notes}

この人の生活を健康面から評価し、評価や改善案を提案してください。
また、活動記録に対して前向きな励ましのコメントも添えてください。

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
            content: "あなたは目標達成を支援する専門家です。ユーザーの目標やカテゴリ、締め切りに応じて、目標の実現に向けた実行可能でやる気の出るアドバイスを与えてください。"
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
