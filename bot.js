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
    const token = (await rl.question("Вставь BOT_TOKEN из BotFather и нажми Enter: ")).trim();
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
    console.error("Переменная BOT_TOKEN не задана, а терминал не интерактивный.");
    console.error("Запусти так: $env:BOT_TOKEN='ТВОЙ_ТОКЕН'; npm run bot");
    return;
  }

  if (message.includes("EMPTY_TOKEN")) {
    console.error("Токен пустой. Запусти снова и вставь BOT_TOKEN.");
    return;
  }

  if (lower.includes("401") || lower.includes("unauthorized")) {
    console.error("Telegram вернул 401 Unauthorized. BOT_TOKEN неверный.");
    return;
  }

  if (lower.includes("econnreset") || lower.includes("enotfound") || lower.includes("network")) {
    console.error("Ошибка сети при обращении к Telegram API. Проверь интернет/VPN.");
    return;
  }

  console.error("Бот не запустился:", message);
}

let bot;

async function main() {
  bot = new Telegraf(await getBotToken());

  bot.start(async (ctx) => {
    await ctx.reply("Открыть Gym Check", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Открыть", web_app: { url: "https://gum-mini-app.vercel.app" } }],
        ],
      },
    });
  });

  await bot.launch();
  console.log("Бот запущен. Отправь /start своему боту в Telegram.");
}

process.once("SIGINT", () => bot?.stop("SIGINT"));
process.once("SIGTERM", () => bot?.stop("SIGTERM"));

main().catch((error) => {
  printStartupError(error);
  process.exit(1);
});
