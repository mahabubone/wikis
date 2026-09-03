## 3.1.4. HTTP Request Settings


*Source: [OpenCollection Spec](https://spec.opencollection.com/#http-request-settings)*

HTTP Request

HTTP request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | HttpRequestInfo | Optional |  |
| http | HttpRequestDetails | Optional |  |
| runtime | HttpRequestRuntime | Optional |  |
| settings | HttpRequestSettings | Optional |  |
| examples | array | Optional | Array of example HTTP request/response pairs |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get Users
  type: http

http:
  method: GET
  url: "{{baseUrl}}/api/users"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"
  params:
    - name: page
      value: "1"
      type: query
runtime:
  variables: []
  scripts: []
  assertions: []
settings:
  encodeUrl: true
  timeout: 30000
```

HTTP Request Info

HTTP request metadata and documentation


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
  name: Get Users
  description: Fetches all users from the API
  type: http
  seq: 1
  tags:
    - users
    - api
```

HTTP Request Details

HTTP request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| method | string | Optional | HTTP method |
| url | string | Optional | The URL of the request |
| headers | array | Optional | Array of request headers |
| params | array | Optional | Array of request parameters |
| body | HttpRequestBody | array | Optional |  |


### Example

```yaml
http:
  method: GET
  url: "{{baseUrl}}/api/users"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"
    - name: Content-Type
      value: application/json
  params:
    - name: page
      value: "1"
      type: query
    - name: limit
      value: "10"
```

HTTP Request Runtime

HTTP request runtime configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| variables | array | Optional | Array of variables |
| scripts | Scripts | Optional |  |
| assertions | array | Optional | Array of assertions for response validation |
| auth | Auth | Optional |  |


### Example

```yaml
runtime:
  variables:
    - name: userId
      value: "123"
  scripts:
    - type: before-request
      code: |
        bru.setVar('timestamp', Date.now());
    - type: after-response
        bru.setVar('token', res.body.token);
  assertions:
    - expression: res.status
      operator: equals
      value: "200"
  auth:
    type: bearer
    token: "{{authToken}}"
```

HTTP Request Settings

Settings for HTTP request execution


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| encodeUrl | boolean | boolean | string | Optional | Whether to encode the URL |
| timeout | number | string | Optional | Request timeout in milliseconds |
| followRedirects | boolean | boolean | string | Optional | Whether to follow redirects |
| maxRedirects | number | string | Optional | Maximum number of redirects to follow |


### Example

```yaml
settings:
  encodeUrl: true
  timeout: 30000
  followRedirects: true
  maxRedirects: 5
```

---

