## 3.4.1. WebSocket Request Info


*Source: [OpenCollection Spec](https://spec.opencollection.com/#websocket-request-info)*

WebSocket Request

WebSocket request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | WebSocketRequestInfo | Optional |  |
| websocket | WebSocketRequestDetails | Optional |  |
| runtime | WebSocketRequestRuntime | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Chat Connection
  type: websocket

websocket:
  url: "ws://{{baseUrl}}/chat"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"
  message:
    type: json
    data: |
      {
        "action": "subscribe",
        "channel": "general"
      }
runtime:
  variables: []
  scripts: []
```

WebSocket Request Info

WebSocket request metadata and documentation


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| name | string | Optional | The name of the request |
| description | Description | Optional |  |
| type | string | Optional | The type of request |
| seq | Sequence | Optional |  |
| tags | array | Optional | Array of tags |


### Example

```yaml
info:
  name: Chat Connection
  description: WebSocket connection for real-time chat
  type: websocket
  seq: 1
  tags:
    - chat
    - realtime
```

WebSocket Request Details

WebSocket request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| url | string | Optional | The WebSocket URL |
| headers | array | Optional | Array of request headers |
| message | WebSocketMessage | array | Optional |  |


### Example

```yaml
websocket:
  url: "ws://{{baseUrl}}/chat"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"
    - name: X-Client-Id
      value: "{{clientId}}"
  message:
    type: json
    data: |
      {
        "action": "subscribe",
        "channel": "general"
      }
```

WebSocket Request Runtime

WebSocket request runtime configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| variables | array | Optional | Array of variables |
| scripts | Scripts | Optional |  |
| auth | Auth | Optional |  |


### Example

```yaml
runtime:
  variables:
    - name: clientId
      value: "client-123"
  scripts:
    - type: before-request
      code: |
        bru.setVar('timestamp', Date.now());
  auth:
    type: bearer
    token: "{{authToken}}"
```

---

