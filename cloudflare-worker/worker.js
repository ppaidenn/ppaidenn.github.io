export default {
  async fetch(request) {
    // Username route rewriter for paiden.com
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return fetch(request);
    }

    const host = url.hostname.toLowerCase();
    if (host !== "paiden.com" && host !== "www.paiden.com") {
      return fetch(request);
    }

    const path = url.pathname;
    const trimmed = path.replace(/^\/+|\/+$/g, "");

    if (!trimmed || trimmed.includes("/")) {
      return fetch(request);
    }

    // Skip obvious file requests such as favicon.ico, .png, .js, etc.
    if (/\.[a-z0-9]+$/i.test(trimmed)) {
      return fetch(request);
    }

    const reserved = new Set([
      "resume",
      "photos",
      "blog",
      "contactme",
      "contact_me",
      "profile",
      "profile-view",
      "accounts",
      "signin",
      "create-account",
      "forgot-password",
      "reset-password",
      "tomi-p-shrine",
      "notifications",
      "news",
      "images",
      "backend",
      "cdn-cgi",
      "manifest.webmanifest",
      "favicon.ico",
      "robots.txt",
      "sitemap.xml",
    ]);

    if (reserved.has(trimmed.toLowerCase())) {
      return fetch(request);
    }

    const rewritten = new URL(url.toString());
    rewritten.pathname = "/profile-view";
    rewritten.search = "";
    rewritten.searchParams.set("username", trimmed);

    return fetch(new Request(rewritten.toString(), request));
  },
};
