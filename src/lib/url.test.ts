import { describe, expect, it } from "vitest";
import { feedKey, isBlockedHost, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("treats www, trailing slash, http and utm params as the same feed", () => {
    expect(feedKey("http://www.Example.com/feed/?utm_source=x")).toBe(feedKey("https://example.com/feed"));
  });
  it("rejects non-http schemes", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("isBlockedHost", () => {
  it("blocks private and local addresses", () => {
    for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.1", "172.16.5.5", "169.254.169.254", "[::1]", "2130706433"]) {
      expect(isBlockedHost(h)).toBe(true);
    }
  });
  it("allows public hosts", () => {
    expect(isBlockedHost("jvns.ca")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
  });
});
