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

