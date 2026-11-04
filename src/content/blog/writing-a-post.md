---
title: "How to write a post here"
date: 2026-07-08
description: "The 30-second workflow."
tags: ["meta", "howto"]
---

1. Create `src/content/blog/your-post-name.md`
2. Add frontmatter:

```yaml
---
title: "Your title"
date: 2026-07-08
description: "One line for RSS and previews."
tags: ["whatever"]
draft: true   # keeps it hidden until you're ready
---
```

3. Write markdown below it. Images go in `public/` and are referenced
   as `/image-name.png`.
4. Flip `draft: true` off (or delete the line) to publish.

That's the whole workflow. Commit, push, and the deploy runs itself.
