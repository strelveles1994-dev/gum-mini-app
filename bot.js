import { Telegraf } from "telegraf";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function getBotToken() {
  const envToken = process.env.BOT_TOKEN?.trim();
  if (envToken) return envToken;

  if (!input.isTTY) {
    throw new Error("NO_TOKEN_NONINTERACTIVE");
  }

  const rl = createInterface({ input, output });
  try {
    const token = (await rl.question("Paste BOT_TOKEN from BotFather and press Enter: ")).trim();
    if (!token) {
      throw new Error("EMPTY_TOKEN");
    }
    return token;
  } finally {
    rl.close();
  }
}

function printStartupError(error) {
  const message = String(error?.description || error?.message || error);
  const lower = message.toLowerCase();

  if (message.includes("NO_TOKEN_NONINTERACTIVE")) {
    console.error("BOT_TOKEN is missing and terminal is non-interactive.");
    console.error("Run: $env:BOT_TOKEN='YOUR_TOKEN'; npm run bot");
    return;
  }

  if (message.includes("EMPTY_TOKEN")) {
    console.error("Token is empty. Start again and paste BOT_TOKEN.");
    return;
  }

  if (lower.includes("401") || lower.includes("unauthorized")) {
    console.error("Telegram returned 401 Unauthorized. BOT_TOKEN is invalid.");
    return;
  }

  if (lower.includes("econnreset") || lower.includes("enotfound") || lower.includes("network")) {
    console.error("Network error while contacting Telegram API. Check internet/VPN.");
    return;
  }

  console.error("Bot failed to start:", message);
}

let bot;

async function main() {
  bot = new Telegraf(await getBotToken());

  bot.start(async (ctx) => {
    await ctx.reply("Open Gym Check", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Open", web_app: { url: "https://gum-mini-app.vercel.app" } }],
        ],
      },
    });
  });

  await bot.launch();
  console.log("Bot started. Send /start to your bot in Telegram.");
}

process.once("SIGINT", () => bot?.stop("SIGINT"));
process.once("SIGTERM", () => bot?.stop("SIGTERM"));

main().catch((error) => {
  printStartupError(error);
  process.exit(1);
});
