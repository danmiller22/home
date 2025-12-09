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

async function sendToTelegram(
  fullName: string,
  phone: string,
  acceptedAt: string,
  receipt?: File,
) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
    return;
  }

  const caption =
    `<b>Новый договор HOME</b>\n\n` +
    `<b>ФИО:</b> ${fullName}\n` +
    `<b>Телефон:</b> ${phone}\n` +
    `<b>Дата/время (клиент):</b> ${acceptedAt}`;

  if (receipt) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    form.append("document", receipt, `receipt-${Date.now()}`);

    const res = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Ошибка отправки документа в Telegram:", res.status, body);
    }
  } else {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: caption,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Ошибка отправки сообщения в Telegram:", res.status, body);
    }
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS preflight для /sign-contract
  if (req.method === "OPTIONS" && url.pathname === "/sign-contract") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Приём формы + файла
  if (req.method === "POST" && url.pathname === "/sign-contract") {
    try {
      const contentType = req.headers.get("content-type") ?? "";

      if (!contentType.includes("multipart/form-data")) {
        return new Response(
          JSON.stringify({ ok: false, error: "Unsupported content type" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      }

      const formData = await req.formData();

      const fullName = (formData.get("fullName")?.toString() ?? "").trim();
      const phone = (formData.get("phone")?.toString() ?? "").trim();
      const acceptedAt = (formData.get("acceptedAt")?.toString() ?? "").trim();
      const receipt = formData.get("receipt");

      if (!fullName || !phone || !acceptedAt || !(receipt instanceof File)) {
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

      await sendToTelegram(fullName, phone, acceptedAt, receipt);

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

  // Статика из текущей директории (index.html и т.д.)
  return await serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    showDirListing: false,
    quiet: true,
  });
}

serve(handler);
