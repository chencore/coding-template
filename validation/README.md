# Validation

Validation scripts are lightweight checks that agents can run before archiving a change.

## Commands

```powershell
.\validation\validate-hardness.cmd
.\validation\validate-ui.cmd
.\validation\validate-template.cmd
```

The checks are intentionally small:

- `validate-hardness.cmd` verifies the Hardness constitution exists and active OpenSpec changes include the required `## Hardness Check` block.
- `validate-ui.cmd` verifies `frontend/design.md` exists and active UI changes include the required `## UI Check` block.
- `validate-template.cmd` runs both.
