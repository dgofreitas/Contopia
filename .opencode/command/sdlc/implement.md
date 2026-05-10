---
description: Execute a planned story through the full SDLC pipeline (TechLead coordination)
---

# /implement — Execute Story Implementation

Delegates to **TechLead** to coordinate the full implementation of a story, managing specialized agents across the pipeline.

## Usage

```
/implement <story-file-path>
```

## Workflow

1. **Invoke TechLead**:
   ```
   task(subagent_type="TechLead", description="Implement story", prompt="Execute full implementation for story: $ARGUMENTS")
   ```

2. **TechLead will**:
   - Read the PM story and technical analysis
   - Detect project stack and route to language-specific agents
   - Execute implementation batches:
     - Delegate to BackendDeveloper variants for implementation
     - Delegate to FrontendDeveloper variants for UI work
     - Delegate to TestEngineer variants for test creation
     - Delegate to CodeReviewer variants for quality review
   - Validate each batch before proceeding to next
   - Ensure Definition of Done is met

3. **Return** implementation summary with all agent outputs.

## Prerequisites

- A story file should exist (run `/story` first)
- A technical analysis should exist (run `/plan` first)
- Both are recommended but not strictly required

## Output

- Implementation complete with tests passing
- Implementation reports from each agent
- Ready for QA validation
