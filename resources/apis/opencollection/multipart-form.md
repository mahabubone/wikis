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

