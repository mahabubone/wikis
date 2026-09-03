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

