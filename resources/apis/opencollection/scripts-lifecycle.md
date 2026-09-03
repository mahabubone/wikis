## 10. Scripts & Lifecycle


*Source: [OpenCollection Spec](https://spec.opencollection.com/#scripts-lifecycle)*

Scripts & Lifecycle

Scripts for collection execution lifecycle

Script Object Properties
PROPERTY	TYPE	REQUIRED	DESCRIPTION
type	enum: before-request | after-response | tests | hooks	Required	The lifecycle stage when this script executes
code	string	Required	The script code
Script Types
before-request - Executed before the request is sent. Use for setting up authentication, generating dynamic values, etc.
after-response - Executed after receiving the response. Use for extracting values, setting variables, etc.
tests - Run test assertions against the response
hooks - Custom lifecycle hooks
Execution Lifecycle
Before-Request - Executed before the request is sent
Request Sent - The actual HTTP request is made
After-Response - Executed after receiving the response
Tests - Run test assertions against the response

### Example

```yaml
- type: before-request
  code: |-
    // Set timestamp
    bru.setVar('timestamp', new Date().getTime());
- type: after-response
    // Extract auth token
    const token = res.body.token;
    bru.setVar('authToken', token);
- type: tests
    // Test response
    test('Status is 200', () => {
        expect(res.status).to.equal(200);
    });
- type: hooks
  code: // Custom lifecycle hooks
```

---

*Auto-generated from https://spec.opencollection.com/*
