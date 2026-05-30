# PrivateChat

Приватный чат по ссылке для двух пользователей без хранения сообщений.

## Цели MVP

- Пользователь создает комнату и делится ссылкой.
- Второй пользователь подключается по ссылке в ту же комнату.
- В комнате максимум 2 участника.
- Сообщения не сохраняются в БД и файлах.
- Состояние комнаты удаляется, когда пользователи выходят.

## Документация проекта

- `FRONTEND_SPEC.md` — стек и требования фронтенда
- `BACKEND_SPEC.md` — стек и требования бэкенда
- `IMPLEMENTATION_PLAN.md` — этапы реализации
- `docs/WS_PROTOCOL.md` — контракт событий WebSocket
- `docs/TEST_STRATEGY.md` — стратегия тестирования
- `docs/PRELAUNCH_CHECKLIST.md` — pre-flight перед разработкой
- `docs/STAGING_SMOKE_CHECKLIST.md` — smoke-проверка перед релизом
- `docs/adr/0001-core-architecture.md` — зафиксированные архитектурные решения

## Быстрый запуск

### 1) Установка зависимостей

```bash
cd client && npm ci
cd ../server && npm ci
```

### 2) Запуск бэкенда

```bash
cd server
npm run dev
```

Серверный runtime находится в `server/src`. Legacy-файлы в корне `server` не используются текущими скриптами.

#### WSS (TLS) для локальной разработки или продакшена

1. Сгенерировать dev-сертификат (только для localhost):

```bash
cd server
npm run certs:dev
npm run dev:secure
```

2. В `client/.env` указать:

```env
VITE_WS_URL=wss://localhost:5001/ws
VITE_HEALTH_URL=https://localhost:5001/health
```

3. Один раз открыть `https://localhost:5001/health` в браузере и принять self-signed сертификат.

В продакшене обычно TLS терминирует reverse proxy (Nginx/Caddy). Альтернатива — задать `TLS_CERT_PATH` и `TLS_KEY_PATH` в `server/.env`, тогда Node поднимает `https`/`wss` напрямую.

### 3) Запуск фронтенда

```bash
cd client
npm run dev
```

## Переменные окружения

- `server/.env.example` — пример переменных сервера
- `client/.env.example` — пример переменных клиента

Скопируйте примеры в `.env` файлы и заполните значения.

## Команды качества

### Client

```bash
cd client
npm run lint
npm run typecheck
npm run test
npm run build
```

### Server

```bash
cd server
npm run lint
npm run typecheck
npm run test
npm run build
```

Единый форматтер проекта: `Prettier` (`.prettierrc.json` в корне).

## Продакшен запуск (Docker + reverse proxy)

В проекте предусмотрен production-контур:
- `server/Dockerfile` — сборка и запуск WS-бэкенда;
- `client/Dockerfile` — сборка SPA и запуск через Nginx;
- `client/docker/nginx/default.conf` — reverse proxy с WS upgrade (`/ws`);
- `docker-compose.yml` — связка frontend + backend с healthchecks.

Запуск:

```bash
docker compose up --build
```

После старта:
- приложение: [http://localhost:8080](http://localhost:8080)
- liveness: [http://localhost:8080/health](http://localhost:8080/health)
- readiness: [http://localhost:8080/ready](http://localhost:8080/ready)

## Наблюдаемость и безопасность

- Сервер пишет структурированные JSON-логи (`LOG_LEVEL`).
- Поддерживаются probes `/health` и `/ready` (для readiness учитывается состояние дренирования).
- В production обязателен `CORS_ORIGIN`, wildcard не используется.
- Входной payload ограничивается `MAX_MESSAGE_BYTES`.
- Для входящих WS-событий действует rate limit:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_EVENTS_PER_WINDOW`
