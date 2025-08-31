import crypto from "crypto";
import { Hono, HonoRequest } from "hono";

type Bindings = {
  TWITCH_SECRET: string;
  DISCORD_WEBHOOK: string;
  TWITCH_ACCESS_TOKEN: string;
  TWITCH_CLIENT_ID: string;
};

// 通知リクエストのヘッダー
const TWITCH_MESSAGE_ID = "twitch-eventsub-message-id";
const TWITCH_MESSAGE_TIMESTAMP = "twitch-eventsub-message-timestamp";
const TWITCH_MESSAGE_SIGNATURE = "twitch-eventsub-message-signature";
const MESSAGE_TYPE = "twitch-eventsub-message-type";

// 通知メッセージの種類
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// メッセージから作成したHMACの前にこの文字列を付ける
const HMAC_PREFIX = "sha256=";

const app = new Hono<{ Bindings: Bindings }>();

app.post("/eventsub/", async (c) => {
  const secret = c.env.TWITCH_SECRET;
  const message = await getHmacMessage(c.req);
  const hmac = HMAC_PREFIX + getHmac(secret, message); // 比較する署名

  const twitchMessageSignature = c.req.header(TWITCH_MESSAGE_SIGNATURE);

  if (
    twitchMessageSignature &&
    true === verifyMessage(hmac, twitchMessageSignature)
  ) {
    console.log("signatures match");

    // ボディからJSONオブジェクトを取得し、メッセージを処理できるようにする
    const notification = await c.req.json();

    if (MESSAGE_TYPE_NOTIFICATION === c.req.header(MESSAGE_TYPE)) {
      if (notification.subscription.type === "stream.online") {
        const message = {
          content: `🔴 ${notification.event.broadcaster_user_name} さんがオンラインになりました！\nhttps://twitch.tv/${notification.event.broadcaster_user_login}`,
        };
        await fetch(c.env.DISCORD_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
      }

      console.log(`Event type: ${notification.subscription.type}`);
      console.log(JSON.stringify(notification.event, null, 4));

      return new Response(null, { status: 204 });
    } else if (MESSAGE_TYPE_VERIFICATION === c.req.header(MESSAGE_TYPE)) {
      return c.body(notification.challenge, 200, {
        "Content-Type": "text/plain",
      });
    } else if (MESSAGE_TYPE_REVOCATION === c.req.header(MESSAGE_TYPE)) {
      console.log(`${notification.subscription.type} notifications revoked!`);
      console.log(`reason: ${notification.subscription.status}`);
      console.log(
        `condition: ${JSON.stringify(
          notification.subscription.condition,
          null,
          4
        )}`
      );
      return new Response(null, { status: 204 });
    } else {
      console.log(`Unknown message type: ${c.req.header(MESSAGE_TYPE)}`);
      return new Response(null, { status: 204 });
    }
  } else {
    console.log("403"); // Signatures didn't match.
    return c.text("", 403);
  }
});

// HMACを作成するために使うメッセージを構築する
async function getHmacMessage(req: HonoRequest) {
  const body = await req.text();
  return (
    req.header(TWITCH_MESSAGE_ID)! +
    req.header(TWITCH_MESSAGE_TIMESTAMP)! +
    body
  );
}

// HMACを取得する
function getHmac(secret: string, message: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// 自分のハッシュがTwitchがヘッダーで渡したハッシュと一致するかを検証する
function verifyMessage(hmac: string, verifySignature: string) {
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(verifySignature)
  );
}

export default app;
