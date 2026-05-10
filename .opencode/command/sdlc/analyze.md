---
description: Analyze codebase architecture, patterns, and technical debt using language-specific analyzers
---

# /analyze — Codebase Analysis

Routes to the appropriate **CodeAnalyzer** agent to perform pre-planning analysis of the codebase.

## Usage

```
/analyze [scope or specific area to analyze]
```

## Workflow

1. **Detect language** from project files

2. **Route to appropriate analyzer**:
   - Node.js/TypeScript → `CodeAnalyzer`
   - Python → `CodeAnalyzerPython`
   - C → `CodeAnalyzerC`

3. **Invoke analyzer**:
   ```
   task(subagent_type="CodeAnalyzer[Variant]", description="Analyze codebase", prompt="Analyze the codebase: $ARGUMENTS. If no specific scope, perform a full architecture analysis.")
   ```

4. **Analyzer will**:
   - Call ContextScout for project context
   - Map architecture patterns and conventions
   - Identify technical debt and risks
   - Document component relationships
   - Output analysis to `docs/stories/STORY-XXX-code-analysis.md` (if story context) or display directly

## Output

A codebase analysis report containing:
- Architecture overview and patterns
- Key components and their relationships
- Technical debt items
- Risk areas
- Recommendations for improvement
