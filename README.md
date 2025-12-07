# HOMEKG Contract

Deno Deploy project: static page with public-offer contract + API that sends signed data to Telegram.

## Files

- `main.ts` — Deno HTTP server:
  - serves static files from `public/`
  - handles `POST /sign-contract` and forwards data to Telegram
- `public/index.html` — contract page and form
- `public/logo.png` — logo used on the page

## Deploy steps (short)

1. Создай новый репозиторий и залей туда содержимое этого архива.
2. В Deno Deploy создай новый проект из этого репо. В качестве entrypoint укажи `main.ts`.
3. В настройках проекта добавь переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Открой выданный домен:
   - страница договора будет доступна по `/`
   - форма шлёт запрос `POST /sign-contract`, данные придут в Telegram.
