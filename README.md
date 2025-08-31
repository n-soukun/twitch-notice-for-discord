# Twiter Notice for Discord

配信者がオンラインになったら Discord へ通知を送ってくれる EventSub リスナーです。

## 使い方

### 事前に必要なもの

- Discord Webhook URL
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

### 2. リスナーのテスト（任意）

正しくデプロイできているか、以下のコマンドを使って確かめてください。`twitch`コマンドのインストール方法は[Twitch CLI の公式ページ](https://dev.twitch.tv/docs/cli/)を参照してください。

```bash
twitch event trigger stream.online -F "<あなたのWorkersのURL 例: https://**** */.workers.dev/eventsub/>" -s "<設定したTWITCH_SECRET>"
```

設定した Discord チャンネルにメッセージが届けば成功です！

### 3. Twitch への登録

[Twitch Developers Console](https://dev.twitch.tv/console) で事前にアプリケーション登録を済ませて、クライアント ID とクライアントシークレットを取得してください。

#### アクセストークンの取得

```
node cli/index.mjs token -c <あなたのクライアントID> -s <あなたのクライアントシークレット>
> Access Token: **********
```

#### EventSub サブスクライブのリクエスト

```
node cli/index.mjs subscribe -c <あなたのクライアントID> -t <取得したアクセストークン> -b <配信者のユーザーネーム> -u <デプロイしたWorkerのURL> -s <設定したシークレット>
```

## ライセンス

MIT License (see `LICENSE` file).
