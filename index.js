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

// Access Token管理（本来はDB等で管理すべき！学習用にメモリ保持）
let accessToken = null;
let refreshToken = null;

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
      },
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { "Content-Type": "application/json" },
      }
    );

    accessToken = tokenRes.data.access_token;
    refreshToken = tokenRes.data.refresh_token;

    res.send("✅ 認証成功！これでLaravelから叩ける準備ができました。");
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send("認証失敗💦");
  }
});

// ③ Laravel用のAPI：Notionに学習記録を登録する
app.post("/add-record", async (req, res) => {
  try {
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
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    res.send(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send("Notion登録失敗💦");
  }
});

// ポート起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy Server 起動中 🚀  ポート: ${PORT}`);
});
