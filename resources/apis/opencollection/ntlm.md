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

