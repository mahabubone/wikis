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

