import { defineConfig } from 'astro/config';

export default defineConfig({
  // Update this to your custom domain when you add one,
  // e.g. site: 'https://koalawallaland.com'
  site: 'https://koalawallaland.github.io',
  // Keep punctuation exactly as written; no automatic curly quotes in posts.
  markdown: { smartypants: false },
  // If deploying to a project repo (github.io/site) instead of the
  // user root repo, uncomment and set base:
  // base: '/site',
});
