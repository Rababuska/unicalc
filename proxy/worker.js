// Cloudflare Worker: прокси для каталогов сувенирки (страницы товаров и фото).
// Каталоги (Oasis, Happy Gifts) режут запросы с IP Cloudflare: соединение зависает, а не отвечает ошибкой.
// Поэтому у каждой попытки есть таймаут, а резервные источники запускаются со сдвигом, и побеждает первый подходящий ответ.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
};

const BLOCKED_IMAGE_HOSTS = /(^|\.)s\.a-5\.ru$/i;
const IMAGE_PATH = /\.(jpe?g|png|webp|gif|avif)$|\/catalog-images\/|\/images\/products\//i;

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}

// Таймаут действует до полного чтения тела: каталоги нередко отдают заголовки и зависают на теле.
async function fetchBytes(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ms);
  try {
    const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return { response: response, body: await response.arrayBuffer() };
  } finally {
    clearTimeout(timer);
  }
}

// Запускает попытки со сдвигом и возвращает первый успешный результат; остальные игнорируются.
function firstValid(attempts) {
  return new Promise(function (resolve, reject) {
    let pending = attempts.length;
    let done = false;
    const failures = [];
    function fail(message) {
      failures.push(message);
      pending -= 1;
      if (pending === 0 && !done) reject(new Error(failures.join('; ')));
    }
    attempts.forEach(function (attempt) {
      setTimeout(function () {
        if (done) return;
        attempt.run().then(function (result) {
          if (done) return;
          done = true;
          resolve(result);
        }).catch(function (error) {
          fail(attempt.name + ': ' + (error && error.message || error));
        });
      }, attempt.delay);
    });
  });
}

function imageAttempt(name, url, delay, timeout) {
  return {
    name: name,
    delay: delay,
    run: async function () {
      const result = await fetchBytes(url, { headers: BROWSER_HEADERS, redirect: 'follow' }, timeout);
      const type = result.response.headers.get('content-type') || '';
      if (!/^image\//i.test(type)) throw new Error('не картинка');
      const body = result.body;
      if (body.byteLength < 400) throw new Error('слишком маленький файл');
      return new Response(body, {
        status: 200,
        headers: Object.assign({ 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' }, CORS)
      });
    }
  };
}

function pageAttempt(name, url, delay, timeout, extraHeaders, originUrl) {
  return {
    name: name,
    delay: delay,
    run: async function () {
      const result = await fetchBytes(url, {
        headers: Object.assign({ Referer: new URL(originUrl).origin + '/' }, BROWSER_HEADERS, extraHeaders || {}),
        redirect: 'follow'
      }, timeout);
      if (result.body.byteLength < 2000) throw new Error('слишком короткий ответ');
      return new Response(result.body, {
        status: 200,
        headers: Object.assign({ 'Content-Type': result.response.headers.get('content-type') || 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, CORS)
      });
    }
  };
}

function fetchImage(targetUrl) {
  const bare = targetUrl.replace(/^https?:\/\//i, '');
  const wp = 'https://i0.wp.com/' + bare;
  const weserv = 'https://images.weserv.nl/?url=' + encodeURIComponent(targetUrl);
  // Oasis блокирует Cloudflare целиком, поэтому прямой запрос для него только запасной.
  if (BLOCKED_IMAGE_HOSTS.test(new URL(targetUrl).hostname)) {
    return firstValid([imageAttempt('wp', wp, 0, 6000), imageAttempt('weserv', weserv, 1500, 8000), imageAttempt('direct', targetUrl, 3000, 6000)]);
  }
  return firstValid([imageAttempt('direct', targetUrl, 0, 5000), imageAttempt('wp', wp, 1500, 6000), imageAttempt('weserv', weserv, 3000, 8000)]);
}

function fetchPage(targetUrl) {
  // Jina Reader в режиме html отдаёт ту же страницу со своей сети, куда каталоги пускают.
  return firstValid([
    pageAttempt('direct', targetUrl, 0, 6000, null, targetUrl),
    pageAttempt('jina', 'https://r.jina.ai/' + targetUrl, 2000, 20000, { 'X-Return-Format': 'html' }, targetUrl)
  ]);
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const targetUrl = new URL(request.url).searchParams.get('url');
    if (!targetUrl) return jsonError('URL missing', 400);

    let target;
    try {
      target = new URL(targetUrl);
    } catch (error) {
      return jsonError('Некорректный URL', 400);
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return jsonError('Нужна ссылка http(s)', 400);

    const isImage = BLOCKED_IMAGE_HOSTS.test(target.hostname) || IMAGE_PATH.test(target.pathname);
    try {
      return await (isImage ? fetchImage(targetUrl) : fetchPage(targetUrl));
    } catch (error) {
      return jsonError(error.message, 502);
    }
  }
};
