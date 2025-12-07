import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в переменных окружения");
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function sendToTelegram(fullName: string, phone: string, acceptedAt: string) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
    return;
  }

  const text =
    `<b>Новый договор HOME</b>\n\n` +
    `<b>ФИО:</b> ${fullName}\n` +
    `<b>Телефон:</b> ${phone}\n` +
    `<b>Дата/время (клиент):</b> ${acceptedAt}`;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Ошибка отправки в Telegram:", res.status, body);
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS" && url.pathname === "/sign-contract") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method === "POST" && url.pathname === "/sign-contract") {
    try {
      const data = await req.json() as {
        fullName?: string;
        phone?: string;
        acceptedAt?: string;
      };

      const fullName = (data.fullName ?? "").trim();
      const phone = (data.phone ?? "").trim();
      const acceptedAt = (data.acceptedAt ?? "").trim();

      if (!fullName || !phone || !acceptedAt) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing fields" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      }

      await sendToTelegram(fullName, phone, acceptedAt);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (err) {
      console.error("Ошибка обработки запроса:", err);
      return new Response(
        JSON.stringify({ ok: false, error: "Server error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }
  }

  return await serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    showDirListing: false,
    quiet: true,
  });
}

serve(handler);
