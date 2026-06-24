# Validation

Validation scripts are lightweight checks that agents can run before archiving a change.

## Commands

```powershell
.\validation\validate-hardness.cmd
```

The check is intentionally small. It verifies the Hardness constitution exists and active OpenSpec changes include the required `## Hardness Check` block.
