import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

let cachedInstances = [];
let lastCacheTime = 0;

async function getSearxngInstances() {
  const now = Date.now();
  // Cache the public instances list for 15 minutes to reduce load
  if (cachedInstances.length > 0 && (now - lastCacheTime) < 15 * 60 * 1000) {
    return cachedInstances;
  }

  try {
    const res = await fetch('https://searx.space/data/instances.json', {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      const urls = Object.keys(data.instances).filter(url => {
        const inst = data.instances[url];
        return inst.html?.grade === 'V';
      });
      if (urls.length > 0) {
        cachedInstances = urls;
        lastCacheTime = now;
        return cachedInstances;
      }
    }
  } catch (err) {
    console.warn('Could not fetch public SearXNG instances list:', err.message);
  }

  // Robust default list of verified fallbacks
  return [
    'https://search.wdpserver.com/',
    'https://searxng.gr/',
    'https://search.mdosch.de/',
    'https://searx.tuxcloud.net/',
    'https://baresearch.org/',
  ];
}

export async function webSearch(query, count = 5) {
  const instances = await getSearxngInstances();
  // Shuffle the active instances to distribute load and bypass individual rate limits
  const shuffled = [...instances].sort(() => 0.5 - Math.random());
  
  const results = [];
  
  // Try up to 10 instances sequentially with a 3.5-second timeout each
  const maxAttempts = Math.min(shuffled.length, 10);
  
  for (let i = 0; i < maxAttempts; i++) {
    const baseUrl = shuffled[i];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      
      const searchUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/' }search?q=${encodeURIComponent(query)}&format=json`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        continue;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        continue;
      }
      
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        continue;
      }
      
      console.log(`SearXNG instance ${baseUrl} successfully returned ${data.results.length} results.`);
      
      let position = 1;
      for (const item of data.results) {
        if (results.length >= count) break;
        if (item.title && item.url) {
          results.push({
            title: item.title.trim(),
            url: item.url,
            snippet: (item.content || item.snippet || '').trim(),
            position: position++,
          });
        }
      }
      
      if (results.length > 0) {
        return results;
      }
    } catch (err) {
      // Fail silently for individual instances to avoid polluting logs
    }
  }
  
  return results;
}

export async function fetchPageContent(url, maxChars = 8000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { url, content: '' };
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, nav, footer, iframe').remove();
    const content = $('body').text().replace(/\s+/g, ' ').trim().slice(0, maxChars);
    return { url, content };
  } catch (err) {
    return { url, content: '' };
  }
}

export async function multiSearch(queries, countPerQuery = 3) {
  const allResults = [];
  const seenUrls = new Set();
  
  for (const query of queries) {
    const results = await webSearch(query, countPerQuery);
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allResults.push(r);
      }
    }
  }
  return allResults.slice(0, 5);
}

export async function fetchAllContent(searchResults) {
  const promises = searchResults.map(r => fetchPageContent(r.url));
  const results = await Promise.all(promises);
  const contentMap = {};
  for (const r of results) {
    contentMap[r.url] = r;
  }
  return contentMap;
}
