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

