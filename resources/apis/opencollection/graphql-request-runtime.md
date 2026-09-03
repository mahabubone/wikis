## 3.2.3. GraphQL Request Runtime


*Source: [OpenCollection Spec](https://spec.opencollection.com/#graphql-request-runtime)*

GraphQL Request

GraphQL request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | GraphQLRequestInfo | Optional |  |
| graphql | GraphQLRequestDetails | Optional |  |
| runtime | GraphQLRequestRuntime | Optional |  |
| settings | GraphQLRequestSettings | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get Users Query
  type: graphql

graphql:
  method: POST
  url: "{{baseUrl}}/graphql"
  body:
    query: |
      query GetUsers {
        users {
          id
          name
        }
    variables: "{}"
runtime:
  variables: []
  scripts: []
  assertions: []
settings:
  encodeUrl: true
  timeout: 30000
```

GraphQL Request Info

GraphQL request metadata and documentation


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
  name: Get Users Query
  description: Fetches all users via GraphQL
  type: graphql
  seq: 1
  tags:
    - users
    - graphql
```

GraphQL Request Details

GraphQL request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| method | string | Optional | HTTP method |
| url | string | Optional | The URL of the request |
| headers | array | Optional | Array of request headers |
| params | array | Optional | Array of request parameters |
| body | GraphQLBody | array | Optional |  |


### Example

```yaml
graphql:
  method: POST
  url: "{{baseUrl}}/graphql"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"
  body:
    query: |
      query GetUsers($limit: Int) {
        users(limit: $limit) {
          id
          name
          email
        }
    variables: |
      {
        "limit": 10
```

GraphQL Request Runtime

GraphQL request runtime configuration


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
        bru.setVar('users', res.body.data.users);
  assertions:
    - expression: res.status
      operator: equals
      value: "200"
  auth:
    type: bearer
    token: "{{authToken}}"
```

GraphQL Request Settings

Settings for GraphQL request execution


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

