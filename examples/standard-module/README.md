# Standard Module Shape

Use this shape when a project has enough code to need module boundaries.

```text
modules/<module-name>/
  interface/       # DTOs, commands, queries, public errors
  application/     # use cases and orchestration
  domain/          # rules with no framework or IO dependency
  infrastructure/  # database, external systems, filesystem adapters
  delivery/        # HTTP, RPC, queue, CLI entry points
```

## Contract

Each module should document:

- What callers may use
- What callers must not import
- Main errors
- Permission or ownership rules
- Observability fields that matter during debugging

Keep the contract small. A module is useful when callers get a lot of behavior through a small interface.
