# Контракт WebSocket (v1.0)

## Общие правила

- Все сообщения в формате JSON.
- Каждое сообщение содержит поле `type`.
- Каждое сообщение содержит поле `protocolVersion`.
- Сервер валидирует входящие сообщения и при ошибке отправляет событие `error`.
- Клиент игнорирует события с `roomId`, отличным от текущей комнаты.

Текущая версия протокола: `1.4`.

## События клиент -> сервер

## `join_room`

```json
{
  "type": "join_room",
  "roomId": "string",
  "userId": "string",
  "protocolVersion": "1.0"
}
```

## `chat_message`

```json
{
  "type": "chat_message",
  "roomId": "string",
  "userId": "string",
  "messageId": "string",
  "text": "string",
  "sentAt": "ISO-8601 string",
  "protocolVersion": "1.0"
}
```

Ограничения:
- `text` не пустой.
- максимальный размер полезной нагрузки: `MAX_MESSAGE_BYTES`.

## `leave_room`

```json
{
  "type": "leave_room",
  "roomId": "string",
  "userId": "string",
  "protocolVersion": "1.0"
}
```

## `typing_activity`

```json
{
  "type": "typing_activity",
  "roomId": "string",
  "userId": "string",
  "active": true,
  "protocolVersion": "1.4"
}
```

Ограничения:
- `active` — `true`, когда пользователь набирает текст; `false`, когда поле пустое или набор остановлен.
- Событие не содержит текст сообщения и не требует завершённого handshake.

## События сервер -> клиент

## `room_joined`

```json
{
  "type": "room_joined",
  "roomId": "string",
  "userId": "string",
  "participants": 1,
  "protocolVersion": "1.0"
}
```

## `peer_joined`

```json
{
  "type": "peer_joined",
  "roomId": "string",
  "userId": "string",
  "participants": 2,
  "protocolVersion": "1.0"
}
```

## `new_message`

```json
{
  "type": "new_message",
  "roomId": "string",
  "messageId": "string",
  "userId": "string",
  "text": "string",
  "sentAt": "ISO-8601 string",
  "protocolVersion": "1.0"
}
```

## `peer_left`

```json
{
  "type": "peer_left",
  "roomId": "string",
  "userId": "string",
  "participants": 1,
  "protocolVersion": "1.0"
}
```

## `peer_typing`

```json
{
  "type": "peer_typing",
  "roomId": "string",
  "userId": "string",
  "active": true,
  "protocolVersion": "1.4"
}
```

## `room_full`

```json
{
  "type": "room_full",
  "roomId": "string",
  "code": "ROOM_FULL",
  "message": "Комната уже занята двумя пользователями",
  "protocolVersion": "1.0"
}
```

## `error`

```json
{
  "type": "error",
  "code": "INVALID_PAYLOAD | UNKNOWN_EVENT | ROOM_MISMATCH | HANDSHAKE_REQUIRED | HANDSHAKE_INVALID | RATE_LIMITED | INTERNAL_ERROR",
  "message": "string",
  "protocolVersion": "1.0"
}
```
