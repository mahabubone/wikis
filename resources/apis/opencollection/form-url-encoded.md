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

