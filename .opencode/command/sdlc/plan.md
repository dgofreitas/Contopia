---
description: Generate a technical architecture plan and execution strategy for a user story
---

# /plan — Architecture Planning

Delegates to **Architect** to analyze a user story and produce a technical execution plan with agent delegation strategy.

## Usage

```
/plan <story-file-or-description>
```

## Workflow

1. **Invoke Architect**:
   ```
   task(subagent_type="Architect", description="Plan architecture for story", prompt="Analyze and create a technical plan for: $ARGUMENTS")
   ```

2. **Architect will**:
   - Read the story file (if path provided) or parse the description
   - Detect project stack (language, framework, build system)
   - Invoke CodeAnalyzer for codebase pattern analysis
   - Design the architecture and component plan
   - Create execution batches with agent assignments
   - Output technical analysis to `docs/stories/STORY-XXX-technical-analysis.md`

3. **Return** the technical analysis path, execution plan summary, and agent routing.

## Output

A technical analysis file containing:
- Stack detection results
- Architecture decisions
- Component breakdown
- Execution batches with parallel/sequential ordering
- Agent assignments per batch (language-specific routing)
- Risk assessment

## Prerequisites

- A story file should exist (run `/story` or `/epic` first)
- For greenfield projects: `docs/architecture/TECH-STACK.md` must exist (run `/scaffold` first)
