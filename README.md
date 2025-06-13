こちらは Proxy サーバー側の実装です

# Notion 学習記録管理 API システム

## 📌 概要

Notion API と連携し、学習記録を自動登録・永続管理する API システムです。  
SaaS の API インフラ設計を想定し、以下の実務技術を取り入れています。

- OAuth 2.0 認可フロー
- refresh_token によるアクセストークン自動更新
- Laravel × Node.js による API 分離設計
- 障害監視通知（Discord Webhook）
- DB 管理によるトークン永続化

---

## 🛠 使用技術

| 項目             | 使用技術                      |
| ---------------- | ----------------------------- |
| バックエンド API | Laravel 12 (PHP)              |
| プロキシサーバー | Node.js (Express)             |
| 認証方式         | OAuth 2.0 (Notion API)        |
| データベース     | MySQL (Laravel Eloquent 使用) |
| 監視通知         | Discord Webhook               |
| インフラ         | Docker（※導入済みなら追記）   |
| バージョン管理   | GitHub                        |

---

## 🗺 システム構成図

```plaintext
[ ユーザー ]
    ↓ 認証
[ Notion OAuth ]
    ↓ アクセストークン
[ Node.js Proxy Server ]
    ↓ API保存
[ Laravel Backend Server ]
    ↓ 永続保存
[ MySQL Database ]
    ↓ 障害検知
[ Discord Webhook通知 ]
```

## 🚀 主な機能

- Notion API と連携して学習記録を自動登録

- refresh_token でアクセストークンを安全に更新

- Laravel にトークン情報を永続保存（DB 運用設計）

- API 障害時に Discord へ通知（障害検知の実務設計）

- RESTful な API 構成を意識した実務的 API 設計

## 📦 セットアップ手順

### Laravel サーバー構築

```bash
git clone https://github.com/xxxx/my-notion-laravel.git
cd my-notion-laravel
composer install
cp .env.example .env

# DB設定・Notion関連のAPIキー設定
php artisan key:generate
php artisan migrate
php artisan serve
```

### Proxy サーバー構築

```bash
git clone https://github.com/xxxx/my-notion-proxy.git
cd my-notion-proxy
npm install
cp .env.example .env

# 環境変数にNotionのClient ID/Secretなどを記載
node index.js
```

## 🌐 事前に準備が必要なもの

- Notion API Integration 作成

- OAuth2.0 クライアント ID/Secret 取得

- Notion Database 作成 & Database ID 取得

- Discord Webhook URL 発行

## 🎯 今回の実務設計ポイント

- 実務級トークン管理

  - refresh_token 含むトークン自動更新ロジック

- エラーハンドリング強化

  - 通信失敗時の分類・通知設計

- 障害監視設計

  - Discord 通知による障害監視運用

- API 責務分離
  - Proxy Server ↔ Laravel API 分離アーキテクチャ

## 🚀 今後の発展余地

- Docker コンテナ化による環境統一

- CI/CD 自動デプロイ化

- ユーザー認証管理（マルチユーザー対応）

- 通知手段の柔軟化（Slack/LINE 対応）

## 👩‍💻 制作者

| 名前     | takesan23 × じぴたん(chatGpt 4o)          |
| -------- | ----------------------------------------- |
| GitHub   | https://github.com/takesan23              |
| 言語経験 | PHP, Node.js, Laravel, Notion API, OAuth2 |
