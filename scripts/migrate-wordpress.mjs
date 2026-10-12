import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = "https://www.somoyerpotha.com";
const outputFile = path.resolve("data/migrated-posts.json");
const mediaDir = path.resolve("public/migrated-media");
const mediaPrefix = "/migrated-media/";

await mkdir(path.dirname(outputFile), { recursive: true });
await mkdir(mediaDir, { recursive: true });

const first = await fetch(`${origin}/wp-json/wp/v2/posts?per_page=100&page=1&_embed=1`);
if (!first.ok) throw new Error(`WordPress API returned ${first.status}`);
const pageCount = Number(first.headers.get("x-wp-totalpages") || 1);
const posts = await first.json();
for (let page = 2; page <= pageCount; page++) {
  const response = await fetch(`${origin}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=1`);
  if (!response.ok) throw new Error(`WordPress API page ${page} returned ${response.status}`);
  posts.push(...await response.json());
}

const mediaMap = new Map();
function addMediaUrl(raw) {
  if (!raw) return;
  const decoded = raw.replaceAll("&amp;", "&").trim();
  try {
    const url = new URL(decoded, origin);
    if (!/^(www\.)?somoyerpotha\.com$/i.test(url.hostname) || !url.pathname.includes("/wp-content/uploads/")) return;
    url.search = "";
    const clean = `${origin}${url.pathname}`;
    if (mediaMap.has(clean)) return;
    const ext = path.extname(url.pathname).toLowerCase() || ".jpg";
    const filename = `${createHash("sha256").update(clean).digest("hex").slice(0, 20)}${ext}`;
    mediaMap.set(clean, `${mediaPrefix}${filename}`);
  } catch {}
}

for (const post of posts) {
  addMediaUrl(post._embedded?.["wp:featuredmedia"]?.[0]?.source_url);
  for (const match of post.content?.rendered?.matchAll(/(?:src|data-src)=["']([^"']+)["']/gi) || []) addMediaUrl(match[1]);
}

const failures = [];
for (const [url, publicPath] of mediaMap) {
  const filepath = path.join(mediaDir, path.basename(publicPath));
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get("content-type") || "";
    if (!type.startsWith("image/")) throw new Error(`Not an image (${type})`);
    await writeFile(filepath, bytes);
  } catch (error) {
    failures.push({ url, error: String(error) });
    mediaMap.delete(url);
  }
}

const stripHtml = (html = "") => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#0*39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&hellip;/gi, "…").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
  .replace(/&lsquo;|&rsquo;/gi, "’").replace(/&ldquo;/gi, "“").replace(/&rdquo;/gi, "”")
  .replace(/\s+/g, " ").trim();

function localizeContent(html = "") {
  let content = html.replace(/<!--[\s\S]*?-->/g, "");
  content = content.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  content = content.replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, "");
  content = content.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  content = content.replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  content = content.replace(/\s+sizes\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  content = content.replace(/\b(src|data-src)\s*=\s*(["'])([^"']+)\2/gi, (attribute, name, quote, rawUrl) => {
    try {
      const parsed = new URL(rawUrl.replaceAll("&amp;", "&"), origin);
      const key = `${origin}${parsed.pathname}`;
      const local = mediaMap.get(key);
      return local ? `${name}=${quote}${local}${quote}` : attribute;
    } catch { return attribute; }
  });
  const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "figure", "figcaption", "img", "a", "hr", "span"]);
  return content.replace(/<\/?([a-z][\w-]*)(\s[^<>]*?)?\s*\/?>/gi, (tag, rawName, rawAttributes = "") => {
    const name = rawName.toLowerCase();
    if (!allowedTags.has(name)) return "";
    const closing = /^<\//.test(tag);
    if (closing) return ["br", "img", "hr"].includes(name) ? "" : `</${name}>`;
    const attributes = [];
    for (const match of rawAttributes.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) {
      const key = match[1].toLowerCase();
      const value = match[3].trim();
      if (name === "a" && key === "href" && !/^javascript:|^data:/i.test(value)) attributes.push(`href="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`);
      if (name === "img" && key === "src" && value.startsWith(mediaPrefix)) attributes.push(`src="${value}"`);
      if (name === "img" && key === "alt") attributes.push(`alt="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`);
      if ((name === "a" || name === "img") && key === "title") attributes.push(`title="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`);
    }
    return `<${name}${attributes.length ? ` ${attributes.join(" ")}` : ""}${["br", "img", "hr"].includes(name) ? " /" : ""}>`;
  });
}

const migrated = posts.map((post) => {
  const terms = post._embedded?.["wp:term"]?.[0] || [];
  const category = terms.find((term) => term.taxonomy === "category")?.name || "সংবাদ";
  const featured = post._embedded?.["wp:featuredmedia"]?.[0];
  const featuredUrl = featured?.source_url ? `${origin}${new URL(featured.source_url).pathname}` : null;
  const decodedSlug = decodeURIComponent(post.slug);
  return {
    id: String(post.id),
    title: stripHtml(post.title?.rendered),
    slug: decodedSlug,
    category,
    excerpt: stripHtml(post.excerpt?.rendered),
    content: localizeContent(post.content?.rendered || ""),
    cover_image: featuredUrl ? mediaMap.get(featuredUrl) || null : null,
    image_alt: featured?.alt_text || stripHtml(post.title?.rendered),
    author: post._embedded?.author?.[0]?.name || "নিজস্ব প্রতিবেদক",
    is_published: post.status === "publish",
    published_at: post.date_gmt ? `${post.date_gmt}+00:00` : post.date,
    updated_at: post.modified_gmt ? `${post.modified_gmt}+00:00` : post.modified,
    source_url: post.link,
  };
});

await writeFile(outputFile, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
await writeFile(path.resolve("data/migration-report.json"), `${JSON.stringify({
  source: origin,
  migratedPosts: migrated.length,
  downloadedImages: mediaMap.size,
  imageFailures: failures,
}, null, 2)}\n`, "utf8");
console.log(`Migrated ${migrated.length} posts and ${mediaMap.size} images.`);
if (failures.length) console.warn(`${failures.length} image downloads failed; details in data/migration-report.json.`);
