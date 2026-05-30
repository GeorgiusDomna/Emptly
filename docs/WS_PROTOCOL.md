# Контракт WebSocket (v1)

## Общие правила

- Все сообщения в формате JSON.
- Каждое сообщение содержит поле `type`.
- Сервер валидирует входящие сообщения и при ошибке отправляет событие `error`.
- Клиент игнорирует события с `roomId`, отличным от текущей комнаты.

## События клиент -> сервер

## `join_room`

```json
{
  "type": "join_room",
  "roomId": "string",
  "userId": "string"
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
  "sentAt": "ISO-8601 string"
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
  "userId": "string"
}
```

## События сервер -> клиент

## `room_joined`

```json
{
  "type": "room_joined",
  "roomId": "string",
  "userId": "string",
  "participants": 1
}
```

## `peer_joined`

```json
{
  "type": "peer_joined",
  "roomId": "string",
  "userId": "string",
  "participants": 2
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
  "sentAt": "ISO-8601 string"
}
```

## `peer_left`

```json
{
  "type": "peer_left",
  "roomId": "string",
  "userId": "string",
  "participants": 1
}
```

## `room_full`

```json
{
  "type": "room_full",
  "roomId": "string",
  "code": "ROOM_FULL",
  "message": "Комната уже занята двумя пользователями"
}
```

## `error`

```json
{
  "type": "error",
  "code": "INVALID_PAYLOAD | UNKNOWN_EVENT | ROOM_MISMATCH | INTERNAL_ERROR",
  "message": "string"
}
```
