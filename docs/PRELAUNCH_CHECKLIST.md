# Pre-launch чеклист перед разработкой

## 1) Решения и архитектура

- [ ] Выбор стеков зафиксирован в `FRONTEND_SPEC.md` и `BACKEND_SPEC.md`
- [ ] ADR принят: `docs/adr/0001-core-architecture.md`
- [ ] Контракт WS принят: `docs/WS_PROTOCOL.md`
- [ ] Definition of Done согласован командой

## 2) Безопасность

- [ ] Все секреты вынесены в `.env`
- [ ] В репозитории нет секретов/ключей/паролей
- [ ] Выполнена ротация ранее засвеченных ключей
- [ ] Настроен CORS whitelist
- [ ] Определены лимиты `MAX_MESSAGE_BYTES` и rate limit

## 3) Репозиторий и процесс

- [ ] Есть верхнеуровневый `README.md`
- [ ] Есть `.env.example` для `client` и `server`
- [ ] Добавлен PR шаблон (`.github/pull_request_template.md`)
- [ ] Утверждены правила ветвления и ревью

## 4) Качество

- [ ] CI pipeline добавлен (`.github/workflows/ci.yml`)
- [ ] В CI запускаются lint/typecheck/test/build (если скрипты присутствуют)
- [ ] Сформирована стратегия тестирования: `docs/TEST_STRATEGY.md`

## 5) Готовность среды

- [ ] Подготовлен staging контур
- [ ] Есть чеклист smoke-проверки: `docs/STAGING_SMOKE_CHECKLIST.md`
- [ ] Определен ответственный за релиз и валидацию
