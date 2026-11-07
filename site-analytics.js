/* Koalawallaland optional, privacy-conscious site analytics.
 * Paste the site token from Cloudflare Web Analytics below.
 * Until configured, this script sends NO analytics requests.
 * Cloudflare docs: https://developers.cloudflare.com/web-analytics/get-started/
 */
(() => {
  const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "";
  if (!/^[a-f0-9]{32}$/i.test(CLOUDFLARE_WEB_ANALYTICS_TOKEN)) return;
  if (document.querySelector('script[data-cf-beacon]')) return;
  const beacon = document.createElement("script");
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN }));
  document.head.appendChild(beacon);
})();
