import { describe, expect, it } from "vitest";
import { sanitizeContent, webUrl } from "./content";

describe("safe reading content", () => {
  it("resolves relative original URLs and rejects non-web URLs", () => {
    expect(webUrl("/post", "https://example.com/feed")).toBe("https://example.com/post");
    expect(webUrl("", "https://example.com/feed")).toBe("");
    expect(webUrl("javascript:alert(1)", "https://example.com")).toBe("");
  });
  it("keeps formatted summaries and resolves their links safely", async () => {
    const html = await sanitizeContent('<p>Hello <strong>world</strong></p><a href="/post">Read</a><img src="/photo.jpg">', "https://example.com/feed");
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain('href="https://example.com/post"');
    expect(html).toContain('src="https://example.com/photo.jpg"');
  });
  it("opens article links in a new tab without leaking the reader", async () => {
    const html = await sanitizeContent('<a href="https://other.site/x">Out</a>', "https://example.com");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("loads images without sending a referrer and drops images with no source", async () => {
    const html = await sanitizeContent('<img src="/a.jpg"><img data-src="/lazy.jpg"><img>', "https://example.com");
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('src="https://example.com/lazy.jpg"');
    expect(html.match(/<img/g)?.length).toBe(2);
  });
  it("removes unsafe links and active content", async () => {
    const html = await sanitizeContent('<a href="javascript:alert(1)">Bad</a><script>alert(1)</script><img src="/a" onerror="alert(1)">', "https://example.com");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
  it("pins an unsized arrow icon to text size so it can't fill the page", async () => {
    const html = await sanitizeContent(
      '<a href="https://example.com/full-story"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="9 6 15 12 9 18"/></svg></a>',
      "https://example.com",
    );
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
  });
  it("keeps an icon's own proportions when pinning it", async () => {
    const html = await sanitizeContent('<svg viewBox="0 0 100 50"><path d="M0 0h100v50z"/></svg>', "https://example.com");
    expect(html).toContain('width="20"');
    expect(html).toContain('height="10"');
  });
  it("leaves icons and diagrams that already declare a size alone", async () => {
    const html = await sanitizeContent('<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 2h12v12z"/></svg>', "https://example.com");
    expect(html).toContain('width="16"');
    expect(html).toContain('height="16"');
  });
  it("drops plugin content", async () => {
    const html = await sanitizeContent('<object data="/x.swf"></object><embed src="/y"><applet code="A"></applet>', "https://example.com");
    expect(html).not.toContain("<object");
    expect(html).not.toContain("<embed");
    expect(html).not.toContain("<applet");
  });
});