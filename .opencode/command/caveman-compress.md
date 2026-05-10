---
description: Compress a markdown file into caveman-speak to save input tokens
---

Load skill "compress" and compress the file: $ARGUMENTS

Rules:
- Compress ONLY: prose, descriptions, comments, principles, heuristics
- Preserve INTACT: code blocks, YAML frontmatter, URLs, file paths, commands, numbers, headings, rule blocks, workflow steps
- Save original as $ARGUMENTS.original.md before overwriting
- Target: ~46% fewer input tokens per session
