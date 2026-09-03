## 5. Environments


*Source: [OpenCollection Spec](https://spec.opencollection.com/#environments)*

Environments

Environments allow you to define different sets of variables for different contexts (development, staging, production, etc.).

Environment Properties
PROPERTY	TYPE	REQUIRED	DESCRIPTION
name	string	Required	The name of the environment
color	string	Optional	The color of the environment
description	Description	Optional	
variables	array	Optional	Array of environment variables
clientCertificates	array	Optional	Array of client certificates for mutual TLS authentication
extends	string	Optional	The name of the environment to extend from
dotEnvFilePath	string	Optional	Path to a .env file to load variables from

### Example

```yaml
name: Production
description: Production environment configuration
variables:
  - name: baseUrl
    value: https://api.production.com
  - name: apiKey
    value: prod-key-123
    transient: true

```

---

