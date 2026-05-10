---
description: Diagnose and fix a bug using language-specific bug fixer agents
---

# /bugfix — Bug Diagnosis and Fix

Routes to the appropriate **BugFixer** agent based on project language to diagnose and fix a bug with root-cause analysis.

## Usage

```
/bugfix <bug description or error message>
```

## Workflow

1. **Detect language** from project files

2. **Route to appropriate bug fixer**:
   - Node.js/TypeScript → `BugFixerNodejs`
   - Python → `BugFixerPython`
   - C → `BugFixerC`

3. **Invoke bug fixer**:
   ```
   task(subagent_type="BugFixer[Variant]", description="Diagnose and fix bug", prompt="Diagnose and fix the following bug: $ARGUMENTS")
   ```

4. **Bug fixer will**:
   - Call ContextScout for project context
   - Reproduce the bug (if possible)
   - Perform root-cause analysis
   - Propose a minimal, non-breaking fix
   - Write regression tests
   - Validate the fix

## Output

A bug fix report containing:
- Root cause analysis
- Fix description (minimal, non-breaking)
- Files modified
- Regression tests added
- Validation results
