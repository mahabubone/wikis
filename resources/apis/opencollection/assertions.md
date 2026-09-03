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

