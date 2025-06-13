// proxy-server/index.js

import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Notion OAuth情報（自分のIntegration情報に合わせて入力）
const CLIENT_ID = process.env.NOTION_CLIENT_ID;
const CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const REDIRECT_URI = process.env.NOTION_REDIRECT_URI;

// 共通：Laravelから現在のトークンを取得
async function getCurrentTokens() {
  const response = await axios.get("http://localhost:8000/api/get-token");
  return response.data;
}

// 共通：refresh_tokenから新しいaccess_tokenを取得
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(
    "https://api.notion.com/v1/oauth/token",
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    },
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { "Content-Type": "application/json" },
    }
  );
  return response.data;
}

// 共通：Discord通知
async function sendDiscordNotify(message) {
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: message,
    });
  } catch (err) {
    console.error("❌ Discord通知失敗:", err.response?.data || err);
  }
}

// ① OAuth認証開始URLを返すエンドポイント
app.get("/auth/url", (req, res) => {
  const url = `https://api.notion.com/v1/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  res.send({ url });
});

// ② Notionから認証コードを受け取るコールバック
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const tokenRes = await axios.post(
      "https://api.notion.com/v1/oauth/token",
      {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: process.env.NOTION_CLIENT_ID,
        client_secret: process.env.NOTION_CLIENT_SECRET,
      },
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { "Content-Type": "application/json" },
      }
    );

    // ここからLaravelにPOSTで保存依頼
    await axios.post("http://localhost:8000/api/save-token", {
      access_token: tokenRes.data.access_token,
      refresh_token: tokenRes.data.refresh_token,
      expires_in: tokenRes.data.expires_in,
      fetched_at: new Date().toISOString(),
    });

    res.send("✅ 認証成功！これでLaravelから叩ける準備ができました。");
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send("認証失敗💦");
  }
});

// ③ Notion学習記録登録（毎回refresh_token更新してから登録）
app.post("/add-record", async (req, res) => {
  try {
    // ① Laravelからトークン取得
    const currentTokens = await getCurrentTokens();

    // ② refresh_tokenで更新
    const newTokens = await refreshAccessToken(currentTokens.refresh_token);

    // ③ Laravelに新しいトークンを保存
    try {
      await axios.post("http://localhost:8000/api/save-token", {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_in: newTokens.expires_in,
        fetched_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("❌ Laravel保存失敗:", err.response?.data || err);
      await sendDiscordNotify(
        "❌【Notion連携】Laravelとの通信エラー（save-token失敗）"
      );
    }

    // ④ Notionに学習記録登録
    const response = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          Date: { date: { start: new Date().toISOString().split("T")[0] } },
          Day: { number: req.body.day },
          Summary: { title: [{ text: { content: req.body.summary } }] },
          Learned: { rich_text: [{ text: { content: req.body.learned } }] },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${newTokens.access_token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    res.send(response.data);
  } catch (err) {
    if (err.response?.status === 401) {
      const msg = "❌【Notion連携】認証エラー: refresh_token失効";
      console.error(msg);
      await sendDiscordNotify(msg);
    } else if (err.response?.status >= 500) {
      const msg = "❌【Notion連携】Notion APIのサーバー障害";
      console.error(msg);
      await sendDiscordNotify(msg);
    } else if (err.code === "ECONNREFUSED") {
      const msg = "❌【Notion連携】Laravelとの通信エラー";
      console.error(msg);
      await sendDiscordNotify(msg);
    } else {
      const msg = "❌【Notion連携】その他エラー発生";
      console.error(msg);
      await sendDiscordNotify(msg);
    }
    res.status(500).send("Notion登録失敗💦");
  }
});

// ポート起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy Server 起動中 🚀  ポート: ${PORT}`);
});
