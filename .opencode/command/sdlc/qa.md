---
description: Run QA validation against acceptance criteria for a story
---

# /qa — Quality Assurance Validation

Delegates to **QAAnalyst** to validate that an implementation meets all acceptance criteria from the story.

## Usage

```
/qa <story-file-path>
```

## Workflow

1. **Invoke QAAnalyst**:
   ```
   task(subagent_type="QAAnalyst", description="QA validation", prompt="Validate implementation against acceptance criteria for: $ARGUMENTS")
   ```

2. **QAAnalyst will**:
   - Read the PM story and extract acceptance criteria
   - Execute automated tests (if available)
   - Validate each GIVEN-WHEN-THEN criterion
   - Check Definition of Done checklist
   - Produce a QA report with pass/fail per criterion

## Output

A QA validation report containing:
- Pass/Fail status per acceptance criterion
- Test execution results
- Definition of Done checklist status
- Blocking issues (if any)
- Recommendation: APPROVE or REJECT with reasons
