---
description: Create strategic product vision, personas, epics, roadmap (ProductOwner)
---

# /epic — Create Product Strategy and Epics

Delegates to **ProductOwner** to create strategic product documentation: vision, personas, OKRs, epics, roadmap, and non-functional requirements.

## Usage

```
/epic <description of product or feature request>
```

Or with an existing input file:

```
/epic analyze @PO-epicos.md
```

## Workflow

1. **Invoke ProductOwner**:
   ```
   task(subagent_type="ProductOwner", description="Create product strategy", prompt="Analyze and create strategic product artifacts for: $ARGUMENTS. Produce vision, personas, epics with KPIs, roadmap, and PM handoff.")
   ```

2. **ProductOwner will**:
   - Load business/technical context via ContextScout
   - Define product vision and strategy (`docs/product/VISION.md`)
   - Define personas with JTBD (`docs/product/PERSONAS.md`)
   - Set OKRs (`docs/product/OKRS.md`)
   - Create enriched epics (`docs/epics/EPIC-XXX.md`)
   - Build release roadmap (`docs/product/ROADMAP.md`)
   - Document non-functional requirements (`docs/product/NFRS.md`)
   - Produce glossary (`docs/product/GLOSSARY.md`)
   - Generate PM handoff (`docs/product/PM-HANDOFF.md`)

3. **Return** the full product artifact summary with next steps for ProductManager.

## Output

Complete strategic documentation:

- **Vision & Strategy** — why this product exists
- **Personas** — who uses it and their JTBD
- **Epics** — prioritized (MoSCoW) with KPIs and dependencies
- **Roadmap** — MVP → V1.1 → V2.0 timeline
- **NFRs** — performance, security, compliance
- **PM Handoff** — instructions for ProductManager to decompose epics into stories

## Next Step

After approval, run `/story <epic-id>` to have ProductManager decompose an approved epic into implementable user stories.
