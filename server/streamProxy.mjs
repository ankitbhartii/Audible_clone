import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = process.env.PROXY_PORT || 3001;

// Allowed streaming domains for security and anti-abuse
const ALLOWED_STREAM_DOMAINS = [
  'samples.audible.com',
  'samples.audible.co.uk',
  'samples.audible.de',
  'm.media-amazon.com',
  'archive.org',
  'ia800000.us.archive.org',
  'ia600000.us.archive.org',
  'ia900000.us.archive.org',
  'librivox.org',
  'media.librivox.org'
];

function isDomainAllowed(host) {
  if (!host) return false;
  return ALLOWED_STREAM_DOMAINS.some(allowed => host === allowed || host.endsWith('.' + allowed));
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', engine: 'rea-stream-relay', version: '1.0.0' }));
    return;
  }

  // Stream Relay: /api/stream?url=<encoded_url>
  if (pathname === '/api/stream') {
    const targetUrlStr = reqUrl.searchParams.get('url');
    if (!targetUrlStr) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing target URL query parameter (?url=...)' }));
      return;
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrlStr);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL provided' }));
      return;
    }

    if (!isDomainAllowed(parsedTarget.hostname)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Domain not in allowed stream list',
        domain: parsedTarget.hostname,
        allowed: ALLOWED_STREAM_DOMAINS
      }));
      return;
    }

    // Forward HTTP Range headers for scrubbing/seeking
    const clientRange = req.headers['range'];
    const headersToForward = {
      'User-Agent': 'AudibleWebClone/1.0 (REA Analysis Proxy)',
      'Accept': '*/*'
    };
    if (clientRange) {
      headersToForward['Range'] = clientRange;
    }

    function streamWithRedirects(urlToFetch, redirectCount = 0) {
      if (redirectCount > 5) {
        res.writeHead(508, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too many redirects' }));
        return;
      }

      let currentUrl;
      try {
        currentUrl = new URL(urlToFetch);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid redirect target' }));
        return;
      }

      if (!isDomainAllowed(currentUrl.hostname)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Redirected to disallowed domain', domain: currentUrl.hostname }));
        return;
      }

      const clientProtocol = currentUrl.protocol === 'https:' ? https : http;
      const proxyReq = clientProtocol.request(
        currentUrl,
        {
          method: req.method,
          headers: headersToForward
        },
        (proxyRes) => {
          const statusCode = proxyRes.statusCode || 200;

          // Follow redirect if 3xx and Location header is present
          if ([301, 302, 303, 307, 308].includes(statusCode) && proxyRes.headers.location) {
            const nextUrl = new URL(proxyRes.headers.location, currentUrl).toString();
            proxyRes.resume(); // consume response data to free memory
            return streamWithRedirects(nextUrl, redirectCount + 1);
          }

          const forwardHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes'
          };

          if (proxyRes.headers['content-type']) {
            forwardHeaders['Content-Type'] = proxyRes.headers['content-type'];
          }
          if (proxyRes.headers['content-length']) {
            forwardHeaders['Content-Length'] = proxyRes.headers['content-length'];
          }
          if (proxyRes.headers['content-range']) {
            forwardHeaders['Content-Range'] = proxyRes.headers['content-range'];
          }

          res.writeHead(statusCode, forwardHeaders);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Upstream gateway error', message: err.message }));
        }
      });

      proxyReq.end();
    }

    streamWithRedirects(targetUrlStr);
    return;
  }

  // Live Audible Public Catalog Search Endpoint
  if (pathname === '/api/audible/search') {
    const query = reqUrl.searchParams.get('query') || reqUrl.searchParams.get('keywords') || '';
    const numResults = reqUrl.searchParams.get('num_results') || '20';
    const category = reqUrl.searchParams.get('category') || '';

    let audibleApiUrl = `https://api.audible.com/1.0/catalog/products?num_results=${numResults}&products_sort_by=Relevance&response_groups=contributors,media,price,rating,sample,product_desc`;
    if (query) {
      audibleApiUrl += `&keywords=${encodeURIComponent(query)}`;
    }
    if (category) {
      audibleApiUrl += `&category_id=${encodeURIComponent(category)}`;
    }

    https.get(audibleApiUrl, {
      headers: {
        'User-Agent': 'AudibleWebClone/1.0 (REA Discovery)',
        'Accept': 'application/json'
      }
    }, (apiRes) => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const rawProducts = parsed.products || [];
          const normalized = rawProducts.map(p => {
            const rawSample = p.sample_url || '';
            const proxiedSample = rawSample
              ? `http://localhost:3001/api/stream?url=${encodeURIComponent(rawSample)}`
              : '';

            const image500 = p.product_images?.['500'] || p.product_images?.['1024'] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';
            const avgRating = p.rating?.overall_distribution?.average_rating || 4.5;
            const totalRatings = p.rating?.overall_distribution?.total_ratings || 1200;

            return {
              asin: p.asin,
              title: p.title || 'Untitled Audiobook',
              subtitle: p.subtitle || undefined,
              authors: p.authors || [{ name: 'Unknown Author' }],
              narrators: p.narrators || [{ name: 'Audible Narrator' }],
              publisher_name: p.publisher_name || 'Audible Studios',
              release_date: p.release_date || p.issue_date || '2024-01-01',
              issue_date: p.issue_date || '2024-01-01',
              runtime_length_min: p.runtime_length_min || 360,
              format_type: p.format_type || 'unabridged',
              language: p.language || 'english',
              publisher_summary: p.publisher_summary || p.merchandising_summary || '',
              product_images: {
                '500': image500,
                '1024': image500
              },
              rating: {
                overall_distribution: {
                  average_rating: avgRating,
                  display_average_rating: avgRating.toFixed(1),
                  total_ratings: totalRatings
                }
              },
              sample_url: proxiedSample || rawSample || 'https://samples.audible.com/bk/adbl/000620/bk_adbl_000620_sample.mp3',
              raw_sample_url: rawSample || 'https://samples.audible.com/bk/adbl/000620/bk_adbl_000620_sample.mp3',
              price: p.price || {
                list_price: { amount: 19.95, currency_code: 'USD' },
                lowest_price: { amount: 14.95, currency_code: 'USD' }
              },
              category_id: p.category_id || 'general',
              category_name: p.category_name || 'Audiobooks',
              chapters: [
                { id: 'ch-1', title: 'Prologue & Introduction', start_offset_sec: 0, duration_sec: 120 },
                { id: 'ch-2', title: 'Chapter 1: The Core Foundation', start_offset_sec: 120, duration_sec: 240 }
              ]
            };
          });

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            total_results: parsed.total_results || normalized.length,
            products: normalized
          }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse upstream response', details: e.message }));
        }
      });
    }).on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream Audible API error', message: err.message }));
    });
    return;
  }

  // Live Official Audible Audio Sample Resolver Endpoint
  if (pathname === '/api/audible/resolve-sample') {
    const title = reqUrl.searchParams.get('title') || '';
    const author = reqUrl.searchParams.get('author') || '';
    const asin = reqUrl.searchParams.get('asin') || '';

    const cleanTitle = title.replace(/[:\-].*$/, '').trim();
    const query = (cleanTitle + (author ? ' ' + author : '')).trim();

    const audibleApiUrl = `https://api.audible.com/1.0/catalog/products?num_results=3&keywords=${encodeURIComponent(query)}&response_groups=sample,media,contributors`;

    https.get(audibleApiUrl, {
      headers: {
        'User-Agent': 'AudibleWebClone/1.0 (REA Audio Resolver)',
        'Accept': 'application/json'
      }
    }, (apiRes) => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const products = parsed.products || [];
          const match = products.find(p => p.sample_url && p.sample_url.startsWith('http'));

          if (match && match.sample_url) {
            const proxied = `http://localhost:3001/api/stream?url=${encodeURIComponent(match.sample_url)}`;
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              found: true,
              sample_url: proxied,
              raw_sample_url: match.sample_url,
              title: match.title,
              narrator: match.narrators?.[0]?.name
            }));
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ found: false }));
        } catch (e) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ found: false, error: e.message }));
        }
      });
    }).on('error', (err) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ found: false, error: err.message }));
    });
    return;
  }

  // Curated Public-Domain Classics with Full Unabridged Stream Links
  if (pathname === '/api/catalog/open-classics') {
    const classics = [
      {
        asin: 'B0LIBRI001',
        title: 'The Adventures of Sherlock Holmes',
        subtitle: 'Unabridged Public Audio Edition',
        authors: [{ asin: 'B0AUTH001', name: 'Arthur Conan Doyle' }],
        narrators: [{ name: 'David Clarke' }],
        runtime_length_min: 642,
        publisher_name: 'LibriVox / Open Audio',
        release_date: '2024-01-01',
        category_id: 'mystery-thriller',
        category_name: 'Mystery, Thriller & Suspense',
        product_images: {
          '500': 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
          '1024': 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80'
        },
        rating: {
          overall_distribution: { average_rating: 4.8, display_average_rating: '4.8', total_ratings: 4820 }
        },
        // Direct public streaming URL via archive.org / LibriVox
        sample_url: 'http://localhost:3001/api/stream?url=' + encodeURIComponent('https://archive.org/download/adventures_sherlock_holmes_1107_librivox/adventuresholmes_01_doyle.mp3'),
        stream_type: 'full_unabridged'
      },
      {
        asin: 'B0LIBRI002',
        title: 'The Art of War',
        subtitle: 'The Timeless Military Classic',
        authors: [{ asin: 'B0AUTH002', name: 'Sun Tzu' }],
        narrators: [{ name: 'Moira Fogarty' }],
        runtime_length_min: 74,
        publisher_name: 'LibriVox / Open Audio',
        release_date: '2024-01-01',
        category_id: 'business-money',
        category_name: 'Business & Personal Finance',
        product_images: {
          '500': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
          '1024': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80'
        },
        rating: {
          overall_distribution: { average_rating: 4.7, display_average_rating: '4.7', total_ratings: 9150 }
        },
        sample_url: 'http://localhost:3001/api/stream?url=' + encodeURIComponent('https://archive.org/download/art_of_war_librivox/art_of_war_01-02_suntzu.mp3'),
        stream_type: 'full_unabridged'
      },
      {
        asin: 'B0LIBRI003',
        title: 'Frankenstein',
        subtitle: 'The Modern Prometheus',
        authors: [{ asin: 'B0AUTH003', name: 'Mary Shelley' }],
        narrators: [{ name: 'Cori Samuel' }],
        runtime_length_min: 512,
        publisher_name: 'LibriVox / Open Audio',
        release_date: '2024-01-01',
        category_id: 'fiction',
        category_name: 'Literature & Fiction Classics',
        product_images: {
          '500': 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=600&q=80',
          '1024': 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=600&q=80'
        },
        rating: {
          overall_distribution: { average_rating: 4.6, display_average_rating: '4.6', total_ratings: 6300 }
        },
        sample_url: 'http://localhost:3001/api/stream?url=' + encodeURIComponent('https://archive.org/download/frankenstein_1104_librivox/frankenstein_01_shelley.mp3'),
        stream_type: 'full_unabridged'
      }
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ products: classics, total: classics.length }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`REA Stream & Catalog Relay running on http://localhost:${PORT}`);
});
