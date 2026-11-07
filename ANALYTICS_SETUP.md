# Website analytics — setup and limitations

Status: **Prepared but NOT enabled**. No visitor data will be sent until you provide your own Cloudflare Web Analytics site token.

## Enable

1. Sign in to https://dash.cloudflare.com/ and open **Analytics & Logs → Web Analytics**.
2. Add the site for `koalawallaland.github.io`. Choose **manual JavaScript snippet** rather than Cloudflare proxy/automatic injection (the site is hosted on GitHub Pages).
3. Copy the 32-character site token from the Cloudflare beacon code.
4. Edit `site-analytics.js`: replace the empty string in `CLOUDFLARE_WEB_ANALYTICS_TOKEN = ""` with that token.
5. Merge/deploy this branch. Confirm the beacon loads in your browser's developer tools and verify visits in the Cloudflare dashboard.

The loader is wired into `index.html` and `home.html`, covering both the front door and primary page. Other standalone HTML entrypoints need their own script include if you want pageview coverage. Review the provider's location reporting options and privacy guidance before enabling.

## Limits

- Approximate visitor **city** may be shown where the analytics provider supplies it, but accuracy varies, especially with VPNs, cell networks, and privacy relays.
- Do not assume a San Diego visit belongs to a particular person. Do not attempt to identify visitors individually.
- This setup does **not** backfill historical visits. GitHub Pages does not give repository owners raw web-server access logs.
- GitHub repository Insights → Traffic shows visits to the **GitHub repo**, not the GitHub Pages site, and retains only the last 14 days. It does not provide visitor cities.
- For historical estimates, look for an existing analytics account, historical dashboards/screenshots, or older third-party tracking attached to previous versions of the website. None were found in the two current HTML entrypoints inspected.
- Avoid adding visitor fingerprinting, IP storage, or named-user tracking.

Official docs: https://developers.cloudflare.com/web-analytics/
