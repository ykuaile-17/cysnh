// 链接解析：用公开代理抓取网页，提取标题/封面/平台
// 适用于 B站 / 微博 / 淘宝 / 闲鱼 等（成败取决于对方是否开放抓取）

function detectPlatform(host: string): string {
  if (host.includes('bilibili')) return 'B站';
  if (host.includes('weibo')) return '微博';
  if (host.includes('taobao') || host.includes('tb.cn')) return '淘宝';
  if (host.includes('goofish') || host.includes('xianyu') || host.includes('2.taobao')) return '闲鱼';
  if (host.includes('douyin') || host.includes('tiktok')) return '抖音';
  if (host.includes('xiaohongshu')) return '小红书';
  return '网页';
}

function meta(html: string, key: string): string {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i'));
  return (a || b)?.[1] || '';
}

export async function parseLink(url: string): Promise<{ title: string; image: string; platform: string }> {
  let host = '';
  try { host = new URL(url).hostname; } catch { /* ignore */ }
  const platform = detectPlatform(host);
  let title = '';
  let image = '';
  try {
    const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const res = await fetch(proxy);
    const html = await res.text();
    title = meta(html, 'og:title');
    if (!title) {
      const t = html.match(/<title>([^<]*)<\/title>/i);
      title = t ? t[1].replace(/[|_\-–].*$/, '').trim() : '';
    }
    image = meta(html, 'og:image');
    if (image && !/^https?:/i.test(image)) image = `https://${host}${image.startsWith('/') ? '' : '/'}${image}`;
  } catch {
    // 解析失败不影响主流程
  }
  return { title: title.trim(), image: image.trim(), platform };
}
