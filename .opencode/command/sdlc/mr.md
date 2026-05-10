---
description: Create a comprehensive merge request / pull request with full context and traceability
---

# /mr — Create Merge Request

Delegates to **MergeRequestCreator** to generate a comprehensive, well-structured MR/PR.

## Usage

```
/mr [base-branch]
```

If no base branch is specified, defaults to `main`.

## Workflow

1. **Invoke MergeRequestCreator**:
   ```
   task(subagent_type="MergeRequestCreator", description="Create merge request", prompt="Create a comprehensive MR/PR for current branch against $ARGUMENTS (default: main). Aggregate all agent outputs, implementation reports, test results, and review findings.")
   ```

2. **MergeRequestCreator will**:
   - Analyze git log and diff against base branch
   - Collect implementation reports from story docs
   - Aggregate test results and coverage metrics
   - Include code review findings and resolutions
   - Create MR/PR via `gh pr create` or `glab mr create`

## Output

A merge request created on the remote with:
- Summary of changes
- Linked story/issue references
- Implementation details
- Test coverage metrics
- Review findings summary
- Screenshots (if UI changes)
- Checklist for reviewers
