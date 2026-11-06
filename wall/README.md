# Shared graffiti wall

The public UI stays on GitHub Pages. A Supabase Free project supplies PostgreSQL, anonymous visitor authentication, and the `graffiti-wall` Edge Function. No server secret is stored in the Pages repository or browser. `config.js` contains only the project URL and public/publishable API key.

## Deployment

1. Use a Free Supabase organization and project named `koalawallaland-graffiti`. Do not upgrade billing.
2. Apply `supabase/migrations/202611060001_shared_wall.sql` through the project's SQL editor or migrations tool. It adds new wall-only tables and functions.
3. In Authentication → Sign In / Providers, enable Anonymous Sign-Ins. Supabase rate-limits new anonymous identities by IP. Visitors enter no email or password.
4. Deploy `supabase/functions/graffiti-wall/index.ts` and `handler.mjs` as function `graffiti-wall`. Disable the gateway JWT check for this function (`verify_jwt=false` in the included config). Reads are public; every write still validates its user token with Supabase Auth inside the function. The function uses Supabase's injected server keys, never client-provided admin credentials.
5. Put the project URL and publishable API key into `wall/config.js`. Never copy a secret or service-role key there. Publish these files to GitHub Pages.
6. Publish a test drawing in one browser, open the public wall in a different browser/session, and confirm it appears without copying local storage. Verify anonymous direct table inserts are denied, posting limits return 429, and reported/hidden drawings disappear on refresh.

## Moderation

Drawings publish immediately. Each drawing has a Report button with a reason. Three distinct authenticated visitor identities hide it as `review`. A reporter cannot multiply reports by retrying. The wall owner reviews drawings in Supabase Table Editor → `wall_posts`; filter `status = review` or sort by `report_count`.

- Remove a drawing: change its `status` to `hidden`. It stays stored for the owner but is excluded from public reads.
- Restore after review: in SQL Editor run a bounded update using the selected drawing's exact UUID:

```sql
update public.wall_posts
set status = 'public', reviewed_at = now(), report_count = 0
where id = 'THE-DRAWING-UUID';
```

The report history remains intact. Only reports made after review count toward a new automatic hide. To ban a visitor, copy that post's `author_id` into `wall_bans.user_id`. Do not expose the author IDs, report identities, or admin credentials in the public UI.

This is report-based moderation, not automated recognition of offensive artwork. No existing drawings are silently removed to make space.

## Limits and storage

- 3 drawings per visitor per rolling 10 minutes; 10 per rolling day.
- 200 drawings per rolling day for the whole wall; 5,000 stored drawings total. Reaching either cap stops new posts without deleting old ones.
- Up to 100 strokes / 2,000 sampled points and a bounded request body per drawing. Only five known colors and three drawing tools are accepted; no HTML, executable SVG, remote media, or arbitrary uploads.
- 5 reports per visitor per rolling hour; 10 per day.
- Quota checks and inserts use one database transaction lock, including concurrent retries. A drawing's client ID makes publish retries idempotent.
- Table access and RPC execution are denied to public/visitor roles. Only the verified Edge Function uses server credentials.
- Public feeds are paginated. Conditional refreshes run at most once per minute while the latest page is visible. Older pages remain readable through Older drawings and explicit refresh.

Anonymous identity survives browser reloads when local storage is available. Clearing storage creates a new identity; Supabase's IP-based anonymous-sign-in limit and the global daily cap provide additional basic abuse controls. Larger public traffic may need CAPTCHA and stronger abuse controls. Free Supabase projects can pause after a week without activity; the owner can resume them in Supabase. Do not upgrade to a paid plan without Katie's approval.

## Tests

With Node 22+:

```sh
npm install
npm test
```

The tests use PGlite (PostgreSQL) to apply the actual migration, then exercise the HTTP handler and database quotas, idempotency, authentication, row privileges, pagination, hiding, bans, and safe backend failures. They do not need a live Supabase account. Browser-only drawing drafts from the previous wall remain available in the expandable old-drawing section and are never uploaded automatically.
