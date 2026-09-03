## 6.1. AWS V4


*Source: [OpenCollection Spec](https://spec.opencollection.com/#auth-awsv4)*

AWS V4 Authentication

AWS V4 authentication


| PROPERTY | TYPE | REQUIRED | DESCRIPTION |
|---|---|---|---|
| type | string | Required |  |
| accessKeyId | string | Optional | AWS access key ID |
| secretAccessKey | string | Optional | AWS secret access key |
| sessionToken | string | Optional | AWS session token |
| service | string | Optional | AWS service name |
| region | string | Optional | AWS region |
| profileName | string | Optional | AWS profile name |


### Example

```yaml
type: awsv4
accessKeyId: AKIAIOSFODNN7EXAMPLE
secretAccessKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region: us-east-1
service: execute-api

```

---

