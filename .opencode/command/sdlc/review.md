---
description: Run a comprehensive code review on recent changes using language-specific reviewers
---

# /review — Code Review

Delegates to the appropriate **CodeReviewer** variant to perform a thorough, security-aware code review.

## Usage

```
/review [files-or-scope]
```

## Workflow

1. **Detect language** from project files (package.json, pyproject.toml, CMakeLists.txt)

2. **Route to appropriate reviewer**:
   - Node.js/TypeScript → `CodeReviewer`
   - Python → `CodeReviewerPython`
   - C → `CodeReviewerC`

3. **Invoke reviewer**:
   ```
   task(subagent_type="CodeReviewer[Variant]", description="Review code changes", prompt="Review the following changes: $ARGUMENTS. If no specific files given, review all uncommitted changes (git diff).")
   ```

4. **Reviewer will**:
   - Call ContextScout for project standards
   - Analyze changes for security, correctness, performance, maintainability
   - Produce a severity-tagged report (critical/high/medium/low)
   - Suggest specific fixes for each finding

## Output

A structured review report with:
- Security findings (always first)
- Correctness issues
- Performance concerns
- Maintainability suggestions
- Suggested fixes for each finding
