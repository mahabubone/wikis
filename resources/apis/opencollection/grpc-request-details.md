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

