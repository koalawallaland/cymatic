const banner = document.querySelector('[data-news-banner]');
const panel = document.querySelector('#desk-news');
const status = panel.querySelector('[data-news-status]');
const list = panel.querySelector('[data-news-items]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const stories = [
  {
    label: 'Aviation',
    short: 'FAA ground stop updates',
    match: /nationwide ground stop|air traffic control communications/i,
  },
  {
    label: 'New Orleans',
    short: 'Tanker collision updates',
    match: /tanker.{0,90}(riverboat|cruise ship)|(?:riverboat|cruise ship).{0,90}tanker/i,
  },
  {
    label: 'Cybersecurity',
    short: 'Cybersecurity updates',
    match: /cyber.?attack|ransomware|cybersecurity|data breach|government portal|cryptocurrency stolen|stolen.{0,35}cryptocurrency/i,
  },
];
const feeds = [
  'https://abcnews.com/abcnews/topstories',
  'https://abcnews.com/abcnews/usheadlines',
  'https://abcnews.com/abcnews/technologyheadlines',
];
const freshFor = 48 * 60 * 60 * 1000;
let headlines = ['FAA ground stop', 'New Orleans tanker collision', 'Cybersecurity'];
let current = 0;
let timer;
let lastSuccess = 0;

function showHeadline() {
  banner.textContent = headlines[current];
}

function updateRotation() {
  clearInterval(timer);
  current = 0;
  showHeadline();
  if (!motion.matches && !document.hidden && headlines.length > 1) {
    timer = setInterval(() => {
      current = (current + 1) % headlines.length;
      showHeadline();
    }, 10000);
  }
}

async function readFeed(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-cache' });
  if (!response.ok) throw new Error('News feed unavailable');
  const xml = new DOMParser().parseFromString(await response.text(), 'text/xml');
  if (!xml.querySelector('rss channel')) throw new Error('Invalid news feed');
  return Array.from(xml.querySelectorAll('item'), item => ({
    title: item.querySelector('title')?.textContent.trim(),
    url: item.querySelector('link')?.textContent.trim(),
    date: Date.parse(item.querySelector('pubDate')?.textContent),
  })).filter(item => item.title && /^https:\/\/(?:www\.)?abcnews\.com\//i.test(item.url) &&
    item.date > Date.now() - freshFor);
}

async function refresh() {
  if (document.hidden) return;
  const results = await Promise.allSettled(feeds.map(readFeed));
  const working = results.filter(result => result.status === 'fulfilled');
  if (!working.length) {
    status.textContent = lastSuccess ? 'Refresh unavailable. Showing the last retrieved headlines.' :
      'Automatic refresh unavailable. Open a source below for the latest coverage.';
    if (!lastSuccess || Date.now() - lastSuccess > freshFor) {
      headlines = ['Open news for updates'];
      updateRotation();
    }
    return;
  }

  const items = working.flatMap(result => result.value).sort((a, b) => b.date - a.date);
  const matches = stories.map(story => ({
    ...story,
    item: items.find(item => story.match.test(item.title) &&
      (story.label !== 'Cybersecurity' || !stories[0].match.test(item.title))),
  })).filter(story => story.item);
  const rows = matches.map(({ label, item }) => {
    const row = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = item.url;
    anchor.textContent = item.title;
    const date = document.createElement('time');
    date.dateTime = new Date(item.date).toISOString();
    date.textContent = new Date(item.date).toLocaleString([], {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    row.append(`${label} · `, anchor, ' — ', date);
    return row;
  });
  list.replaceChildren(...rows);
  lastSuccess = Date.now();
  const time = new Date(lastSuccess).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  status.textContent = matches.length
    ? `ABC News feeds checked at ${time}. ${working.length < feeds.length ? 'Some feeds unavailable.' : 'Refreshes every 2 minutes.'}`
    : `No matching recent headlines at ${time}. Source links are below.`;
  headlines = matches.length ? matches.map(story => story.short) : ['Open news for updates'];
  updateRotation();
}

motion.addEventListener('change', updateRotation);
document.addEventListener('visibilitychange', () => {
  updateRotation();
  if (!document.hidden) refresh();
});
updateRotation();
refresh();
setInterval(refresh, 120000);
