# hub-mason-portal

The hub-mason-portal repository serves as the public-facing ingestion interface for the hub-mason GitOps automation factory. It is engineered to provide a self-service experience for developers while enforcing a strict Zero-Trust security posture via architectural decoupling.

## Core Responsibilities

- User Interface Deployment: Renders structured Markdown Issue Forms to collect standardized repository specifications.

- Input Isolation & Validation: Performs regex-based string extraction from raw markdown issue bodies.

- Asynchronous Handoff Routing: Authenticates via the core GitHub App and securely dispatches payload parameters to the isolated execution engine (hub-mason-engine).
