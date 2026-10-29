// Shared, browser- and worker-safe URL helpers.

export function normalizeUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = "https://" + raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
  // drop tracking params
  [...u.searchParams.keys()].forEach((k) => {
    if (/^utm_|^fbclid$|^gclid$/i.test(k)) u.searchParams.delete(k);
  });
  let s = u.protocol + "//" + u.host + u.pathname.replace(/\/+$/, "") + (u.search || "");
  if (u.pathname === "/" && !u.search) s = u.protocol + "//" + u.host;
  return s.replace(/^http:\/\//, "https://");
}

/** Key used for dedupe: protocol-insensitive. */
export function feedKey(url: string): string {
  return (normalizeUrl(url) ?? url).replace(/^https?:\/\//, "");
}

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v6.includes(":")) {
    if (v6 === "::" || v6 === "::1") return true;
    if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true;
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateIp(mapped[1]);
    return false;
  }
  return false;
}

export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d+$/.test(h)) return true; // decimal-encoded IPs
  return isPrivateIp(h);
}
