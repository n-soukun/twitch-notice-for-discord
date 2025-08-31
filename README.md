# Twiter Notice for Discord

配信者がオンラインになったら Discord へ通知を送ってくれる EventSub リスナーです。

## 使い方

### 事前に必要なもの

- Cloudflare アカウント
- Twitch アカウント
  - クライアント ID
  - クライアントシークレット

### 1. Cloudflare へデプロイ

リポジトリをクローンして、`npm run deploy`コマンドを実行してください。

```bash
git clone https://github.com/n-soukun/twitch-notice-for-discord.git
npm install
npm run deploy
```

Cloudflare のコンソール画面で、以下の環境変数を設定してください。

```
TWITCH_SECRET=***
DISCORD_WEBHOOK=https://discord.com/api/webhooks/****
```

### 2. Twitch への登録

Twitch Developer Console で事前に、アプリケーション登録を済ませて、クライアント ID とアクセストークンを取得してください。

#### アクセストークンの取得

リクエスト例

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<あなたのクライアントID>" \
  -d "client_secret=<あなたのクライアントシークレット>" \
  -d "grant_type=client_credentials"
```

レスポンス例

```json
  "access_token": "xxxxxxxxxxxx",
  "expires_in": 4929058,
  "token_type": "bearer"
```

#### 配信者 ID の取得

```bash
curl.exe -X GET "https://api.twitch.tv/helix/users?login=<配信者URLの末尾>" \
  -H "Client-ID: <あなたのクライアントID>" \
  -H "Authorization: Bearer <取得したアクセストークン>"
```

※配信者 URL の末尾とは

```
https://www.twitch.tv/<ここの文字列>
```

レスポンス例

```json
{"data":
    [
        {
            "id":"<配信者ID>",
            "login":"***",
            "display_name":"***",
            ...
            "created_at":"2024-11-15T06:51:25Z"
        }
    ]
}
```

#### EventSub サブスクライブのリクエスト

```bash
curl -X POST "https://api.twitch.tv/helix/eventsub/subscriptions" \
  -H "Client-ID: <あなたのクライアントID>" \
  -H "Authorization: Bearer <取得したアクセストークン>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "<取得した配信者ID>"
    },
    "transport": {
      "method": "webhook",
      "callback": "<あなたのWorkersのURL 例: https://**** */.workers.dev/eventsub/>",
      "secret": "<設定したTWITCH_SECRE>"
    }
  }'
```
