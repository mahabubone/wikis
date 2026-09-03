# OpenCollection Specification Wiki

Source: https://spec.opencollection.com/

> This is a giant markdown wiki containing the complete OpenCollection Specification converted from the official documentation.

---

## Table of Contents

- [1. Introduction](#introduction)
- [2. Collection](#collection)
- [3. Items](#items)
- [3.1. HTTP Request](#http-request)
- [3.1.1. HTTP Request Info](#http-request-info)
- [3.1.2. HTTP Request Details](#http-request-details)
- [3.1.3. HTTP Request Runtime](#http-request-runtime)
- [3.1.4. HTTP Request Settings](#http-request-settings)
- [3.2. GraphQL Request](#graphql-request)
- [3.2.1. GraphQL Request Info](#graphql-request-info)
- [3.2.2. GraphQL Request Details](#graphql-request-details)
- [3.2.3. GraphQL Request Runtime](#graphql-request-runtime)
- [3.2.4. GraphQL Request Settings](#graphql-request-settings)
- [3.3. gRPC Request](#grpc-request)
- [3.3.1. gRPC Request Info](#grpc-request-info)
- [3.3.2. gRPC Request Details](#grpc-request-details)
- [3.3.3. gRPC Request Runtime](#grpc-request-runtime)
- [3.4. WebSocket Request](#websocket-request)
- [3.4.1. WebSocket Request Info](#websocket-request-info)
- [3.4.2. WebSocket Request Details](#websocket-request-details)
- [3.4.3. WebSocket Request Runtime](#websocket-request-runtime)
- [3.5. Folder](#folder)
- [3.6. Script](#script)
- [4. Request Defaults](#base-config)
- [5. Environments](#environments)
- [6. Authentication](#auth)
- [6.1. AWS V4](#auth-awsv4)
- [6.2. Basic](#auth-basic)
- [6.3. Bearer](#auth-bearer)
- [6.4. Digest](#auth-digest)
- [6.5. API Key](#auth-apikey)
- [6.6. NTLM](#auth-ntlm)
- [6.7. WSSE](#auth-wsse)
- [6.8. OAuth 2.0](#auth-oauth2)
- [6.8.1. OAuth 2.0 Client Credentials](#oauth2-client-credentials)
- [6.8.2. OAuth 2.0 Resource Owner Password](#oauth2-resource-owner)
- [6.8.3. OAuth 2.0 Authorization Code](#oauth2-authorization-code)
- [6.8.4. OAuth 2.0 Implicit](#oauth2-implicit)
- [7. Request Body](#request-body)
- [7.1. Raw Body](#raw-body)
- [7.2. Form URL Encoded](#form-urlencoded)
- [7.3. Multipart Form](#multipart-form)
- [7.4. File Body (unavailable - causes app crash)](#file-body)
- [8. Variables](#variables)
- [9. Assertions](#assertions)
- [10. Scripts & Lifecycle](#scripts-lifecycle)

---

## 1. Introduction

*Source: [OpenCollection Spec](https://spec.opencollection.com/#introduction)*

Introduction

The OpenCollection Specification is a format for describing API collections, including requests, authentication, variables, and scripts. This specification enables tools to understand and work with API collections in a standardized way.

Version: v1.0.0

Schema: https://schema.opencollection.com/opencollection/v1.0.0.json
---

## 2. Collection

*Source: [OpenCollection Spec](https://spec.opencollection.com/#collection)*

Collection

The root object of an OpenCollection specification. This contains all the information about the API collection.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| opencollection | string | Optional | The version of the opencollection |
| info | Info | Optional |  |
| config | CollectionConfig | Optional |  |
| items | array | Optional | Array of items in the collection |
| request | RequestDefaults | Optional |  |
| docs | Documentation | Optional |  |
| bundled | boolean | Optional | True if the opencollection is a standalone file, false if stored on the filesystem with nested structure of folders and files |
| extensions | Extensions | Optional |  |


### Example

```yaml
opencollection: "1.0.0"

info:
  name: My API Collection
  summary: A collection of API requests
  version: "1.0.0"
config:
  environments: []
items: []
request: {}
docs: Documentation for this collection
```

---

## 3. Items

*Source: [OpenCollection Spec](https://spec.opencollection.com/#items)*

Items

Items represent the different types of elements that can be included in a collection. Each item can be one of the following types:

HTTP Request - Standard HTTP/REST API requests
GraphQL Request - GraphQL queries and mutations
gRPC Request - gRPC service calls
Folder - Organizational containers for grouping items
Script - JavaScript modules for shared functionality

Click on any item type in the sidebar to see its detailed schema.
---

## 3.1. HTTP Request

*Source: [OpenCollection Spec](https://spec.opencollection.com/#http-request)*

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

## 3.1.1. HTTP Request Info

*Source: [OpenCollection Spec](https://spec.opencollection.com/#http-request-info)*

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

## 3.1.2. HTTP Request Details

*Source: [OpenCollection Spec](https://spec.opencollection.com/#http-request-details)*

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

## 3.1.3. HTTP Request Runtime

*Source: [OpenCollection Spec](https://spec.opencollection.com/#http-request-runtime)*

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

## 3.2. GraphQL Request

*Source: [OpenCollection Spec](https://spec.opencollection.com/#graphql-request)*

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

## 3.2.1. GraphQL Request Info

*Source: [OpenCollection Spec](https://spec.opencollection.com/#graphql-request-info)*

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

## 3.2.2. GraphQL Request Details

*Source: [OpenCollection Spec](https://spec.opencollection.com/#graphql-request-details)*

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

## 3.2.4. GraphQL Request Settings

*Source: [OpenCollection Spec](https://spec.opencollection.com/#graphql-request-settings)*

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

## 3.3. gRPC Request

*Source: [OpenCollection Spec](https://spec.opencollection.com/#grpc-request)*

gRPC Request

gRPC request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | GrpcRequestInfo | Optional |  |
| grpc | GrpcRequestDetails | Optional |  |
| runtime | GrpcRequestRuntime | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get User
  type: grpc

grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  message: |
    {
      "id": "123"
    }
runtime:
  variables: []
  scripts: []
  assertions: []
```

gRPC Request Info

gRPC request metadata and documentation


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
  name: Get User
  description: Fetches a user by ID via gRPC
  type: grpc
  seq: 1
  tags:
    - users
    - grpc
```

gRPC Request Details

gRPC request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| url | string | Optional | The gRPC service URL or endpoint |
| method | string | Optional | Full RPC method name (package.Service/Method) |
| methodType | enum: unary | client-streaming | server-streaming | bidi-streaming | Optional | Method streaming type |
| protoFilePath | string | Optional | Path to the proto file |
| metadata | array | Optional | Array of gRPC metadata |
| message | GrpcMessage | array | Optional |  |


### Example

```yaml
grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  metadata:
    - name: authorization
      value: "Bearer {{token}}"
  message: |
    {
      "id": "123"
    }
```

gRPC Request Runtime

gRPC request runtime configuration


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
        bru.setVar('user', res.body);
  assertions:
    - expression: res.status
      operator: equals
      value: "0"
  auth:
    type: bearer
    token: "{{authToken}}"
```

---

## 3.3.1. gRPC Request Info

*Source: [OpenCollection Spec](https://spec.opencollection.com/#grpc-request-info)*

gRPC Request

gRPC request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | GrpcRequestInfo | Optional |  |
| grpc | GrpcRequestDetails | Optional |  |
| runtime | GrpcRequestRuntime | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get User
  type: grpc

grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  message: |
    {
      "id": "123"
    }
runtime:
  variables: []
  scripts: []
  assertions: []
```

gRPC Request Info

gRPC request metadata and documentation


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
  name: Get User
  description: Fetches a user by ID via gRPC
  type: grpc
  seq: 1
  tags:
    - users
    - grpc
```

gRPC Request Details

gRPC request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| url | string | Optional | The gRPC service URL or endpoint |
| method | string | Optional | Full RPC method name (package.Service/Method) |
| methodType | enum: unary | client-streaming | server-streaming | bidi-streaming | Optional | Method streaming type |
| protoFilePath | string | Optional | Path to the proto file |
| metadata | array | Optional | Array of gRPC metadata |
| message | GrpcMessage | array | Optional |  |


### Example

```yaml
grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  metadata:
    - name: authorization
      value: "Bearer {{token}}"
  message: |
    {
      "id": "123"
    }
```

gRPC Request Runtime

gRPC request runtime configuration


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
        bru.setVar('user', res.body);
  assertions:
    - expression: res.status
      operator: equals
      value: "0"
  auth:
    type: bearer
    token: "{{authToken}}"
```

---

## 3.3.2. gRPC Request Details

*Source: [OpenCollection Spec](https://spec.opencollection.com/#grpc-request-details)*

gRPC Request

gRPC request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | GrpcRequestInfo | Optional |  |
| grpc | GrpcRequestDetails | Optional |  |
| runtime | GrpcRequestRuntime | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get User
  type: grpc

grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  message: |
    {
      "id": "123"
    }
runtime:
  variables: []
  scripts: []
  assertions: []
```

gRPC Request Info

gRPC request metadata and documentation


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
  name: Get User
  description: Fetches a user by ID via gRPC
  type: grpc
  seq: 1
  tags:
    - users
    - grpc
```

gRPC Request Details

gRPC request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| url | string | Optional | The gRPC service URL or endpoint |
| method | string | Optional | Full RPC method name (package.Service/Method) |
| methodType | enum: unary | client-streaming | server-streaming | bidi-streaming | Optional | Method streaming type |
| protoFilePath | string | Optional | Path to the proto file |
| metadata | array | Optional | Array of gRPC metadata |
| message | GrpcMessage | array | Optional |  |


### Example

```yaml
grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  metadata:
    - name: authorization
      value: "Bearer {{token}}"
  message: |
    {
      "id": "123"
    }
```

gRPC Request Runtime

gRPC request runtime configuration


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
        bru.setVar('user', res.body);
  assertions:
    - expression: res.status
      operator: equals
      value: "0"
  auth:
    type: bearer
    token: "{{authToken}}"
```

---

## 3.3.3. gRPC Request Runtime

*Source: [OpenCollection Spec](https://spec.opencollection.com/#grpc-request-runtime)*

gRPC Request

gRPC request configuration


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | GrpcRequestInfo | Optional |  |
| grpc | GrpcRequestDetails | Optional |  |
| runtime | GrpcRequestRuntime | Optional |  |
| docs | string | Optional | Documentation for this request |


### Example

```yaml
info:
  name: Get User
  type: grpc

grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  message: |
    {
      "id": "123"
    }
runtime:
  variables: []
  scripts: []
  assertions: []
```

gRPC Request Info

gRPC request metadata and documentation


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
  name: Get User
  description: Fetches a user by ID via gRPC
  type: grpc
  seq: 1
  tags:
    - users
    - grpc
```

gRPC Request Details

gRPC request protocol details


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| url | string | Optional | The gRPC service URL or endpoint |
| method | string | Optional | Full RPC method name (package.Service/Method) |
| methodType | enum: unary | client-streaming | server-streaming | bidi-streaming | Optional | Method streaming type |
| protoFilePath | string | Optional | Path to the proto file |
| metadata | array | Optional | Array of gRPC metadata |
| message | GrpcMessage | array | Optional |  |


### Example

```yaml
grpc:
  url: "{{baseUrl}}:50051"
  method: "user.UserService/GetUser"
  methodType: unary
  protoFilePath: "./proto/user.proto"
  metadata:
    - name: authorization
      value: "Bearer {{token}}"
  message: |
    {
      "id": "123"
    }
```

gRPC Request Runtime

gRPC request runtime configuration


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
        bru.setVar('user', res.body);
  assertions:
    - expression: res.status
      operator: equals
      value: "0"
  auth:
    type: bearer
    token: "{{authToken}}"
```

---

## 3.4. WebSocket Request

*Source: [OpenCollection Spec](https://spec.opencollection.com/#websocket-request)*

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

## 3.4.2. WebSocket Request Details

*Source: [OpenCollection Spec](https://spec.opencollection.com/#websocket-request-details)*

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

## 3.4.3. WebSocket Request Runtime

*Source: [OpenCollection Spec](https://spec.opencollection.com/#websocket-request-runtime)*

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

## 3.5. Folder

*Source: [OpenCollection Spec](https://spec.opencollection.com/#folder)*

Folder

A folder for organizing collection items


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| info | FolderInfo | Optional |  |
| items | array | Optional | Array of items in the folder |
| request | RequestDefaults | Optional |  |
| docs | Documentation | Optional |  |


Folders can contain any type of item, including other folders, allowing for nested organization of your collection.
---

## 3.6. Script

*Source: [OpenCollection Spec](https://spec.opencollection.com/#script)*

Script File

Javascript module or shared collection scripts


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Optional |  |
| script | string | Optional | The script |


### Example

```yaml
type: script
script: |-
  // Shared utility functions
  export function generateTimestamp() {
      return new Date().toISOString();
  }

```

---

## 4. Request Defaults

*Source: [OpenCollection Spec](https://spec.opencollection.com/#base-config)*

Request Defaults

Default request configuration for the collection/folder

Default request configuration applies to all items in the collection and can be overridden at the folder or request level.


---

## 5. Environments

*Source: [OpenCollection Spec](https://spec.opencollection.com/#environments)*

Environments

Environments allow you to define different sets of variables for different contexts (development, staging, production, etc.).

Environment Properties
PROPERTY	TYPE	REQUIRED	DESCRIPTION
name	string	Required	The name of the environment
color	string	Optional	The color of the environment
description	Description	Optional	
variables	array	Optional	Array of environment variables
clientCertificates	array	Optional	Array of client certificates for mutual TLS authentication
extends	string	Optional	The name of the environment to extend from
dotEnvFilePath	string	Optional	Path to a .env file to load variables from

### Example

```yaml
name: Production
description: Production environment configuration
variables:
  - name: baseUrl
    value: https://api.production.com
  - name: apiKey
    value: prod-key-123
    transient: true

```

---

## 6. Authentication

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth)*

Authentication

OpenCollection supports multiple authentication methods. Each auth type has its own specific configuration.

Supported Authentication Types
AWS V4 - AWS Signature Version 4 authentication
Basic - Basic HTTP authentication with username and password
Bearer - Bearer token authentication
Digest - HTTP Digest authentication
API Key - API key in header or query parameter
NTLM - NT LAN Manager authentication
WSSE - WS-Security authentication

Click on any authentication type in the sidebar to see its detailed configuration.
---

## 6.1. AWS V4

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-awsv4)*

AWS V4 Authentication

AWS V4 authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| accessKeyId | string | Optional | AWS access key ID |
| secretAccessKey | string | Optional | AWS secret access key |
| sessionToken | string | Optional | AWS session token |
| service | string | Optional | AWS service name |
| region | string | Optional | AWS region |
| profileName | string | Optional | AWS profile name |


### Example

```yaml
type: awsv4
accessKeyId: AKIAIOSFODNN7EXAMPLE
secretAccessKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region: us-east-1
service: execute-api

```

---

## 6.2. Basic

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-basic)*

Basic Authentication

Basic authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| username | string | Optional | Username for basic auth |
| password | string | Optional | Password for basic auth |


### Example

```yaml
type: basic
username: admin
password: password123

```

---

## 6.3. Bearer

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-bearer)*

Bearer Token Authentication

Bearer token authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| token | string | Optional | Bearer token |


### Example

```yaml
type: bearer
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```

---

## 6.4. Digest

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-digest)*

Digest Authentication

Digest authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| username | string | Optional | Username for digest auth |
| password | string | Optional | Password for digest auth |


### Example

```yaml
type: digest
username: user
password: pass

```

---

## 6.5. API Key

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-apikey)*

API Key Authentication

API Key authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| key | string | Optional | API key name |
| value | string | Optional | API key value |
| placement | enum: header | query | Optional | Where to place the API key |


### Example

```yaml
type: apikey
key: X-API-Key
value: your-api-key-here
placement: header

```

---

## 6.6. NTLM

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-ntlm)*

NTLM Authentication

NTLM authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| username | string | Optional | Username for NTLM auth |
| password | string | Optional | Password for NTLM auth |
| domain | string | Optional | Domain for NTLM auth |


### Example

```yaml
type: ntlm
username: user
password: pass
domain: DOMAIN

```

---

## 6.7. WSSE

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-wsse)*

WSSE Authentication

WSSE authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| username | string | Optional | Username for WSSE auth |
| password | string | Optional | Password for WSSE auth |


### Example

```yaml
type: wsse
username: user
password: pass

```

---

## 6.8. OAuth 2.0

*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-oauth2)*

OAuth 2.0 Authentication

OAuth 2.0 authentication

OAuth 2.0 supports multiple authorization flows. Choose the appropriate flow based on your application type:

Client Credentials Flow

OAuth 2.0 Client Credentials flow

Best for: Server-to-server authentication where no user interaction is needed.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: client_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
refreshTokenUrl: "https://api.example.com/oauth/refresh"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
tokenConfig:
  id: "myToken"
  placement:
    header: "Authorization"
settings:
  autoFetchToken: true
  autoRefreshToken: true
```

Resource Owner Password Flow

OAuth 2.0 Resource Owner Password Credentials flow

Best for: Highly trusted applications where the user provides credentials directly to the app.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| resourceOwner | OAuth2ResourceOwner | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: resource_owner_password_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
resourceOwner:
  username: "user@example.com"
  password: "userpassword"
scope: "read write"
```

Authorization Code Flow

OAuth 2.0 Authorization Code flow

Best for: Web applications with a backend server. Most secure and commonly used flow.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| pkce | OAuth2PKCE | Optional |  |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: authorization_code
authorizationUrl: "https://api.example.com/oauth/authorize"
accessTokenUrl: "https://api.example.com/oauth/token"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
state: "random-state-string"
pkce:
  enabled: true
  method: S256
```

Implicit Flow

OAuth 2.0 Implicit flow

Best for: Single-page applications (SPAs). Note: This flow is deprecated in OAuth 2.1; consider using Authorization Code with PKCE instead.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | object | Optional | Client credentials (implicit flow only needs clientId) |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: implicit
authorizationUrl: "https://api.example.com/oauth/authorize"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
scope: "read write"
state: "random-state-string"
```

---

## 6.8.1. OAuth 2.0 Client Credentials

*Source: [OpenCollection Spec](https://spec.opencollection.com/#oauth2-client-credentials)*

OAuth 2.0 Authentication

OAuth 2.0 authentication

OAuth 2.0 supports multiple authorization flows. Choose the appropriate flow based on your application type:

Client Credentials Flow

OAuth 2.0 Client Credentials flow

Best for: Server-to-server authentication where no user interaction is needed.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: client_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
refreshTokenUrl: "https://api.example.com/oauth/refresh"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
tokenConfig:
  id: "myToken"
  placement:
    header: "Authorization"
settings:
  autoFetchToken: true
  autoRefreshToken: true
```

Resource Owner Password Flow

OAuth 2.0 Resource Owner Password Credentials flow

Best for: Highly trusted applications where the user provides credentials directly to the app.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| resourceOwner | OAuth2ResourceOwner | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: resource_owner_password_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
resourceOwner:
  username: "user@example.com"
  password: "userpassword"
scope: "read write"
```

Authorization Code Flow

OAuth 2.0 Authorization Code flow

Best for: Web applications with a backend server. Most secure and commonly used flow.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| pkce | OAuth2PKCE | Optional |  |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: authorization_code
authorizationUrl: "https://api.example.com/oauth/authorize"
accessTokenUrl: "https://api.example.com/oauth/token"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
state: "random-state-string"
pkce:
  enabled: true
  method: S256
```

Implicit Flow

OAuth 2.0 Implicit flow

Best for: Single-page applications (SPAs). Note: This flow is deprecated in OAuth 2.1; consider using Authorization Code with PKCE instead.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | object | Optional | Client credentials (implicit flow only needs clientId) |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: implicit
authorizationUrl: "https://api.example.com/oauth/authorize"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
scope: "read write"
state: "random-state-string"
```

---

## 6.8.2. OAuth 2.0 Resource Owner Password

*Source: [OpenCollection Spec](https://spec.opencollection.com/#oauth2-resource-owner)*

OAuth 2.0 Authentication

OAuth 2.0 authentication

OAuth 2.0 supports multiple authorization flows. Choose the appropriate flow based on your application type:

Client Credentials Flow

OAuth 2.0 Client Credentials flow

Best for: Server-to-server authentication where no user interaction is needed.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: client_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
refreshTokenUrl: "https://api.example.com/oauth/refresh"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
tokenConfig:
  id: "myToken"
  placement:
    header: "Authorization"
settings:
  autoFetchToken: true
  autoRefreshToken: true
```

Resource Owner Password Flow

OAuth 2.0 Resource Owner Password Credentials flow

Best for: Highly trusted applications where the user provides credentials directly to the app.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| resourceOwner | OAuth2ResourceOwner | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: resource_owner_password_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
resourceOwner:
  username: "user@example.com"
  password: "userpassword"
scope: "read write"
```

Authorization Code Flow

OAuth 2.0 Authorization Code flow

Best for: Web applications with a backend server. Most secure and commonly used flow.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| pkce | OAuth2PKCE | Optional |  |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: authorization_code
authorizationUrl: "https://api.example.com/oauth/authorize"
accessTokenUrl: "https://api.example.com/oauth/token"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
state: "random-state-string"
pkce:
  enabled: true
  method: S256
```

Implicit Flow

OAuth 2.0 Implicit flow

Best for: Single-page applications (SPAs). Note: This flow is deprecated in OAuth 2.1; consider using Authorization Code with PKCE instead.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | object | Optional | Client credentials (implicit flow only needs clientId) |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: implicit
authorizationUrl: "https://api.example.com/oauth/authorize"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
scope: "read write"
state: "random-state-string"
```

---

## 6.8.3. OAuth 2.0 Authorization Code

*Source: [OpenCollection Spec](https://spec.opencollection.com/#oauth2-authorization-code)*

OAuth 2.0 Authentication

OAuth 2.0 authentication

OAuth 2.0 supports multiple authorization flows. Choose the appropriate flow based on your application type:

Client Credentials Flow

OAuth 2.0 Client Credentials flow

Best for: Server-to-server authentication where no user interaction is needed.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: client_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
refreshTokenUrl: "https://api.example.com/oauth/refresh"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
tokenConfig:
  id: "myToken"
  placement:
    header: "Authorization"
settings:
  autoFetchToken: true
  autoRefreshToken: true
```

Resource Owner Password Flow

OAuth 2.0 Resource Owner Password Credentials flow

Best for: Highly trusted applications where the user provides credentials directly to the app.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| resourceOwner | OAuth2ResourceOwner | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: resource_owner_password_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
resourceOwner:
  username: "user@example.com"
  password: "userpassword"
scope: "read write"
```

Authorization Code Flow

OAuth 2.0 Authorization Code flow

Best for: Web applications with a backend server. Most secure and commonly used flow.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| pkce | OAuth2PKCE | Optional |  |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: authorization_code
authorizationUrl: "https://api.example.com/oauth/authorize"
accessTokenUrl: "https://api.example.com/oauth/token"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
state: "random-state-string"
pkce:
  enabled: true
  method: S256
```

Implicit Flow

OAuth 2.0 Implicit flow

Best for: Single-page applications (SPAs). Note: This flow is deprecated in OAuth 2.1; consider using Authorization Code with PKCE instead.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | object | Optional | Client credentials (implicit flow only needs clientId) |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: implicit
authorizationUrl: "https://api.example.com/oauth/authorize"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
scope: "read write"
state: "random-state-string"
```

---

## 6.8.4. OAuth 2.0 Implicit

*Source: [OpenCollection Spec](https://spec.opencollection.com/#oauth2-implicit)*

OAuth 2.0 Authentication

OAuth 2.0 authentication

OAuth 2.0 supports multiple authorization flows. Choose the appropriate flow based on your application type:

Client Credentials Flow

OAuth 2.0 Client Credentials flow

Best for: Server-to-server authentication where no user interaction is needed.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: client_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
refreshTokenUrl: "https://api.example.com/oauth/refresh"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
tokenConfig:
  id: "myToken"
  placement:
    header: "Authorization"
settings:
  autoFetchToken: true
  autoRefreshToken: true
```

Resource Owner Password Flow

OAuth 2.0 Resource Owner Password Credentials flow

Best for: Highly trusted applications where the user provides credentials directly to the app.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| credentials | OAuth2ClientCredentials | Optional |  |
| resourceOwner | OAuth2ResourceOwner | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: resource_owner_password_credentials
accessTokenUrl: "https://api.example.com/oauth/token"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
resourceOwner:
  username: "user@example.com"
  password: "userpassword"
scope: "read write"
```

Authorization Code Flow

OAuth 2.0 Authorization Code flow

Best for: Web applications with a backend server. Most secure and commonly used flow.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| accessTokenUrl | string | Optional | URL to fetch the access token |
| refreshTokenUrl | string | Optional | URL to refresh the token |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | OAuth2ClientCredentials | Optional |  |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| pkce | OAuth2PKCE | Optional |  |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: authorization_code
authorizationUrl: "https://api.example.com/oauth/authorize"
accessTokenUrl: "https://api.example.com/oauth/token"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  placement: body
scope: "read write"
state: "random-state-string"
pkce:
  enabled: true
  method: S256
```

Implicit Flow

OAuth 2.0 Implicit flow

Best for: Single-page applications (SPAs). Note: This flow is deprecated in OAuth 2.1; consider using Authorization Code with PKCE instead.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| flow | string | Required |  |
| authorizationUrl | string | Optional | URL to authorize the user |
| callbackUrl | string | Optional | URL to callback to after authorization |
| credentials | object | Optional | Client credentials (implicit flow only needs clientId) |
| scope | string | Optional | Space-delimited OAuth 2.0 scopes |
| state | string | Optional | Opaque value used for CSRF protection |
| additionalParameters | object | Optional |  |
| tokenConfig | OAuth2TokenConfig | Optional |  |
| settings | OAuth2Settings | Optional |  |


### Example

```yaml
type: oauth2
flow: implicit
authorizationUrl: "https://api.example.com/oauth/authorize"
callbackUrl: "https://myapp.com/callback"
credentials:
  clientId: "your-client-id"
scope: "read write"
state: "random-state-string"
```

---

## 7. Request Body

*Source: [OpenCollection Spec](https://spec.opencollection.com/#request-body)*

Request Body

The request body can be one of several types, depending on the content being sent.

Supported Body Types
Raw Body - JSON, XML, Text, or SPARQL content
Form URL Encoded - application/x-www-form-urlencoded data
Multipart Form - multipart/form-data for file uploads and mixed content
File Body - Direct file upload

Click on any body type in the sidebar to see its detailed schema.
---

## 7.1. Raw Body

*Source: [OpenCollection Spec](https://spec.opencollection.com/#raw-body)*

Raw Body

Raw request body with type and data

Schema
PROPERTY	TYPE	REQUIRED	DESCRIPTION
type	enum: json | text | xml | sparql	Required	The type of raw body content
data	string	Required	The raw body data

### Example

```yaml
type: json
data: |-
  {
    "name": "John Doe",
    "email": "john@example.com"
  }

```

---

## 7.2. Form URL Encoded

*Source: [OpenCollection Spec](https://spec.opencollection.com/#form-urlencoded)*

Form URL Encoded Body

Form URL encoded body

Schema
PROPERTY	TYPE	REQUIRED	DESCRIPTION
type	string	Required	The body type identifier
data	array	Required	Form fields as array of key-value pairs
Data Item Structure
PROPERTY	TYPE	REQUIRED	DESCRIPTION
name	string	Required	The form field name
value	string	Required	The form field value
description	Description	Optional	
disabled	boolean	Optional	Whether the form field is disabled

### Example

```yaml
type: form-urlencoded
data:
  - name: username
    value: john_doe
    disabled: false
  - name: password
    value: secret123

```

---

## 7.3. Multipart Form

*Source: [OpenCollection Spec](https://spec.opencollection.com/#multipart-form)*

Multipart Form Body

Multipart form body

Schema
PROPERTY	TYPE	REQUIRED	DESCRIPTION
type	string	Required	The body type identifier
data	array	Required	Form parts as array
Data Item Structure
PROPERTY	TYPE	REQUIRED	DESCRIPTION
name	string	Required	The form part name
type	enum: text | file	Required	The type of form part
value	string | array	Required	The form part value
description	Description	Optional	
disabled	boolean	Optional	Whether the form part is disabled

### Example

```yaml
type: multipart-form
data:
  - name: file
    type: file
    value: /path/to/file.pdf
    disabled: false
  - name: description
    type: text
    value: File description

```

---

## 7.4. File Body (unavailable - causes app crash)

*Source: [OpenCollection Spec](https://spec.opencollection.com/#file-body)*

*This section causes the source application to crash and could not be retrieved.*

---

## 8. Variables

*Source: [OpenCollection Spec](https://spec.opencollection.com/#variables)*

Variables

A variable with name, value, description, and state flags


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| name | string | Optional | The variable name |
| value | VariableValue | array | Optional |  |
| description | Description | Optional |  |
| disabled | boolean | Optional | Whether the variable is disabled |

Variable Types

Variables can have different value types and support variants for different contexts.

Value Types
string
number
boolean
null
object

### Example

```yaml
name: apiEndpoint
value:
  - title: Production
    selected: true
      type: string
      data: https://api.example.com
  - title: Development
    selected: false
      data: https://api.dev.example.com
description: API base endpoint URL
disabled: false
```

---

## 9. Assertions

*Source: [OpenCollection Spec](https://spec.opencollection.com/#assertions)*

Assertions

An assertion for response validation


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| expression | string | Required | The expression to evaluate |
| operator | string | Required | The comparison operator |
| value | string | Optional | The expected value |
| disabled | boolean | Optional | Whether the assertion is disabled |
| description | Description | Optional |  |

Common Operators
equals - Exact match
notEquals - Not equal
contains - String contains
notContains - String does not contain
greaterThan - Numeric greater than
lessThan - Numeric less than
isNull - Value is null
isNotNull - Value is not null

### Example

```yaml
- expression: response.status
  operator: equals
  value: '200'
  disabled: false
  description: Response status should be 200
- expression: response.body.users.length
  operator: greaterThan
  value: '0'
  description: Should return at least one user
```

---

## 10. Scripts & Lifecycle

*Source: [OpenCollection Spec](https://spec.opencollection.com/#scripts-lifecycle)*

Scripts & Lifecycle

Scripts for collection execution lifecycle

Script Object Properties
PROPERTY	TYPE	REQUIRED	DESCRIPTION
type	enum: before-request | after-response | tests | hooks	Required	The lifecycle stage when this script executes
code	string	Required	The script code
Script Types
before-request - Executed before the request is sent. Use for setting up authentication, generating dynamic values, etc.
after-response - Executed after receiving the response. Use for extracting values, setting variables, etc.
tests - Run test assertions against the response
hooks - Custom lifecycle hooks
Execution Lifecycle
Before-Request - Executed before the request is sent
Request Sent - The actual HTTP request is made
After-Response - Executed after receiving the response
Tests - Run test assertions against the response

### Example

```yaml
- type: before-request
  code: |-
    // Set timestamp
    bru.setVar('timestamp', new Date().getTime());
- type: after-response
    // Extract auth token
    const token = res.body.token;
    bru.setVar('authToken', token);
- type: tests
    // Test response
    test('Status is 200', () => {
        expect(res.status).to.equal(200);
    });
- type: hooks
  code: // Custom lifecycle hooks
```

---

*Auto-generated from https://spec.opencollection.com/*
