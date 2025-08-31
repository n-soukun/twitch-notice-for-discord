import { program } from "commander";

const TWITCH_OAUTH2_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API_BASE_URL = "https://api.twitch.tv/helix";

/**
 * アクセストークンを取得
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>} アクセストークン
 */
async function getAccessToken(clientId, clientSecret) {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "analytics:read:games");
  const response = await fetch(TWITCH_OAUTH2_TOKEN_URL, {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * ブロードキャスターのIDを取得
 * @param {string} clientId
 * @param {string} accessToken
 * @param {string} broadcasterName
 * @returns {Promise<string>} ブロードキャスターID
 */
async function getBroadcasterId(clientId, accessToken, broadcasterName) {
  const url = new URL(`${TWITCH_API_BASE_URL}/users`);
  url.searchParams.append("login", broadcasterName);
  const response = await fetch(url.toString(), {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to get broadcaster ID: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.data.length === 0) {
    throw new Error(`Broadcaster not found: ${broadcasterName}`);
  }

  return data.data[0].id;
}

async function subscribeToStreamOnlineEvents(
  clientId,
  accessToken,
  broadcasterId,
  callbackUrl,
  secret
) {
  const url = new URL(`${TWITCH_API_BASE_URL}/eventsub/subscriptions`);
  const body = {
    type: "stream.online",
    version: "1",
    condition: {
      broadcaster_user_id: broadcasterId,
    },
    transport: {
      method: "webhook",
      callback: callbackUrl,
      secret: secret,
    },
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to subscribe to stream.online events: ${response.statusText}`
    );
  }
  const data = await response.json();
  return data;
}

async function getEventSubSubscriptions(
  clientId,
  accessToken,
  onlyEnabled = true
) {
  const url = new URL(`${TWITCH_API_BASE_URL}/eventsub/subscriptions`);
  url.searchParams.append("enabled", onlyEnabled.toString());
  const response = await fetch(url.toString(), {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to get EventSub subscriptions: ${response.statusText}`
    );
  }
  const data = await response.json();
  return data.data;
}

async function unsubscribeFromEventSub(clientId, accessToken, subscriptionId) {
  const url = new URL(
    `${TWITCH_API_BASE_URL}/eventsub/subscriptions?id=${subscriptionId}`
  );
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to unsubscribe from EventSub: ${response.statusText}`
    );
  }
  return true;
}

function main() {
  program
    .name("twitch-eventsub-cli")
    .description("CLI to manage Twitch EventSub subscriptions")
    .version("1.0.0");

  program
    .command("token")
    .description("Get Twitch App Access Token")
    .requiredOption("-c, --client-id <clientId>", "Twitch Client ID")
    .requiredOption(
      "-s, --client-secret <clientSecret>",
      "Twitch Client Secret"
    )
    .action(async (options) => {
      try {
        const accessToken = await getAccessToken(
          options.clientId,
          options.clientSecret
        );
        console.log("Access Token:", accessToken);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("subscribe")
    .description("Subscribe to stream.online events")
    .requiredOption("-c, --client-id <clientId>", "Twitch Client ID")
    .requiredOption(
      "-t, --access-token <accessToken>",
      "Twitch App Access Token"
    )
    .requiredOption("-b, --broadcaster <broadcaster>", "Broadcaster username")
    .requiredOption("-u, --callback-url <callbackUrl>", "Callback URL")
    .requiredOption("-s, --secret <secret>", "Secret for webhook verification")
    .action(async (options) => {
      try {
        const broadcasterId = await getBroadcasterId(
          options.clientId,
          options.accessToken,
          options.broadcaster
        );
        const result = await subscribeToStreamOnlineEvents(
          options.clientId,
          options.accessToken,
          broadcasterId,
          options.callbackUrl,
          options.secret
        );
        console.log("Subscription Result:", result);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("list")
    .description("List EventSub subscriptions")
    .requiredOption("-c, --client-id <clientId>", "Twitch Client ID")
    .requiredOption(
      "-t, --access-token <accessToken>",
      "Twitch App Access Token"
    )
    .option("-a, --all", "List all subscriptions, including disabled ones")
    .action(async (options) => {
      try {
        const subscriptions = await getEventSubSubscriptions(
          options.clientId,
          options.accessToken,
          !options.all
        );
        console.log("EventSub Subscriptions:", subscriptions);
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program
    .command("unsubscribe")
    .description("Unsubscribe from an EventSub subscription")
    .requiredOption("-c, --client-id <clientId>", "Twitch Client ID")
    .requiredOption(
      "-t, --access-token <accessToken>",
      "Twitch App Access Token"
    )
    .requiredOption(
      "-i, --subscription-id <subscriptionId>",
      "Subscription ID to unsubscribe"
    )
    .action(async (options) => {
      try {
        await unsubscribeFromEventSub(
          options.clientId,
          options.accessToken,
          options.subscriptionId
        );
        console.log("Unsubscribed successfully");
      } catch (error) {
        console.error("Error:", error.message);
      }
    });

  program.parse(process.argv);
}

main();
