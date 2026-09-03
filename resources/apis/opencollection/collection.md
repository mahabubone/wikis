## 2. Collection


*Source: [OpenCollection Spec](https://spec.opencollection.com/#collection)*

Collection

The root object of an OpenCollection specification. This contains all the information about the API collection.


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| opencollection | string | Optional | The version of the opencollection |
| info | Info | Optional |  |
| config | CollectionConfig | Optional |  |
| items | array | Optional | Array of items in the collection |
| request | RequestDefaults | Optional |  |
| docs | Documentation | Optional |  |
| bundled | boolean | Optional | True if the opencollection is a standalone file, false if stored on the filesystem with nested structure of folders and files |
| extensions | Extensions | Optional |  |


### Example

```yaml
opencollection: "1.0.0"

info:
  name: My API Collection
  summary: A collection of API requests
  version: "1.0.0"
config:
  environments: []
items: []
request: {}
docs: Documentation for this collection
```

---

