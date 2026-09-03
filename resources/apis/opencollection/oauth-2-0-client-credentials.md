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

