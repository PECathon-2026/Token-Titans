import { describe, expect, it } from "vitest";
import { parseFeed, stripHtml } from "./feeds";

describe("article links and summaries", () => {
  it("uses the valid Atom alternate link, not a missing href or self link", () => {
    const feed = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><title>Blog</title><entry><id>tag:blog,1</id><link/><link rel="self" href="/feed/1"/><link rel="alternate" href="/posts/1"/><title>Post</title><summary>Short summary</summary><content>Full article body text</content></entry></feed>`, "https://example.com/feed");
    expect(feed.items[0]?.link).toBe("https://example.com/posts/1");
    expect(feed.items[0]?.summary).toBe("Full article body text");
  });
  it("prefers the full-text body over a short RSS description", () => {
    const feed = parseFeed(`<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><item><link>https://e.com/p</link><description>Teaser</description><content:encoded><![CDATA[<p>The complete article body with much more text.</p>]]></content:encoded></item></channel></rss>`, "https://e.com/feed");
    expect(feed.items[0]?.summary).toBe("<p>The complete article body with much more text.</p>");
  });
  it("reads Yandex-style full-text and adds the enclosure image", () => {
    const feed = parseFeed(`<rss><channel><item><link>https://e.com/p</link><enclosure url="https://cdn.e.com/a.webp" type="image/webp"/><description>Teaser</description><full-text><![CDATA[<p>Whole story here, far longer.</p>]]></full-text></item></channel></rss>`, "https://e.com/feed");
    expect(feed.items[0]?.summary).toBe('<p><img src="https://cdn.e.com/a.webp" alt=""></p><p>Whole story here, far longer.</p>');
  });
  it("does not turn a missing article link into the feed address", () => {
    const feed = parseFeed(`<rss><channel><title>Blog</title><item><guid isPermaLink="false">123</guid><title>Post</title></item></channel></rss>`, "https://example.com/feed");
    expect(feed.items[0]?.link).toBe("");
  });
  it("uses RSS permalink GUIDs when the link is absent", () => {
    const feed = parseFeed(`<rss><channel><item><guid>https://example.com/post</guid></item></channel></rss>`, "https://example.com/feed");
    expect(feed.items[0]?.link).toBe("https://example.com/post");
  });
  it("preserves Atom XHTML summary markup", () => {
    const feed = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><summary type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Hello <strong>world</strong></p><p>Next paragraph</p></div></summary></entry></feed>`, "https://example.com/feed");
    expect(feed.items[0]?.summary).toContain("<strong>world</strong>");
    expect(stripHtml(feed.items[0]?.summary ?? "")).toBe("Hello world Next paragraph");
  });
  it("decodes entities and separates paragraphs in snippets", () => {
    expect(stripHtml("<p>Read &mdash; it&#8217;s good.</p><p>Next &copy; &amp; last.</p>")).toBe("Read — it’s good. Next © & last.");
  });
});