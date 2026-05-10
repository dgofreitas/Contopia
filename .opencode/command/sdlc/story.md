---
description: Create a structured user story from a feature request, bug report, or spike
---

# /story — Create User Story

Delegates to **ProductManager** to transform a feature request, bug report, or spike into a structured, actionable user story.

## Usage

```
/story <description of what needs to be done>
```

## Workflow

1. **Invoke ProductManager**:
   ```
   task(subagent_type="ProductManager", description="Create user stories", prompt="Analyze and create structured user stories for: $ARGUMENTS. If the input contains MULTIPLE epics or features, create ONE separate story per epic/feature.")
   ```

2. **ProductManager will**:
   - Analyze input scope (single feature vs. multiple epics/features)
   - If multi-epic input: decompose into separate stories (STORY-001, STORY-002, etc.)
   - Write each story with title, description, acceptance criteria (GIVEN-WHEN-THEN)
   - Define Definition of Done per story
   - Map cross-story dependencies
   - Output each story to `docs/stories/STORY-XXX.md`
   - Output backlog summary to `docs/stories/BACKLOG-SUMMARY.md` (if multiple stories)

3. **Return** the story file paths and a summary to the user.

## Output

One or more markdown story files at `docs/stories/STORY-XXX.md`, each containing:
- Story type and title
- User story (As a / I want / So that)
- Acceptance criteria (GIVEN-WHEN-THEN format, 3-8 per story)
- Technical notes and constraints
- Dependencies (within and across stories)
- Definition of Done

When multiple stories are created, a `docs/stories/BACKLOG-SUMMARY.md` is also generated with:
- Full story list with IDs, priorities, and estimates
- Dependency graph
- Suggested implementation order
