import { describe, expect, it } from "vitest";
import { cleanEnrichment, cleanSubmission, isRedundantDescription, submissionLabel } from "./discovery-rules";

describe("cleanSubmission", () => {
  it("accepts up to 50 URLs and rejects 51", () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `https://blog${i}.example.com/feed`);
    expect(cleanSubmission(fifty)?.length).toBe(50);
    expect(cleanSubmission([...fifty, "https://one-more.example.com/feed"])).toBeNull();
  });
  it("rejects private IPs and non-http URLs", () => {
    expect(cleanSubmission(["http://192.168.1.1/feed"])).toBeNull();
    expect(cleanSubmission(["file:///etc/passwd"])).toBeNull();
  });
  it("dedupes after normalization", () => {
    expect(cleanSubmission(["https://www.jvns.ca/atom.xml", "http://jvns.ca/atom.xml/"])).toEqual(["https://jvns.ca/atom.xml"]);
  });
});

describe("submissionLabel", () => {
  it("shows no number at all until a feed has really been submitted", () => {
    expect(submissionLabel(0)).toBeNull();
    expect(submissionLabel(-3)).toBeNull();
    expect(submissionLabel(NaN)).toBeNull();
  });
  it("counts submissions, not readers", () => {
    expect(submissionLabel(1)).toBe("SUBMITTED ONCE");
    expect(submissionLabel(7)).toBe("SUBMITTED 7 TIMES");
  });
});

describe("cleanEnrichment", () => {
  it("requires a real feed URL and at least one detail", () => {
    expect(cleanEnrichment({ url: "https://jvns.ca/atom.xml" })).toBeNull();
    expect(cleanEnrichment({ url: "file:///etc/passwd", title: "x" })).toBeNull();
    expect(cleanEnrichment({ url: "http://192.168.0.1/feed", title: "x" })).toBeNull();
    expect(cleanEnrichment(null)).toBeNull();
  });
  it("normalizes the feed URL and caps every text field", () => {
    const out = cleanEnrichment({
      url: "http://www.jvns.ca/atom.xml?utm_source=x",
      title: "  Julia\nEvans  ",
      description: "z".repeat(500),
      site_url: "http://jvns.ca/",
      latest_post: "Notes",
    });
    expect(out).not.toBeNull();
    expect(out!.url).toBe("https://jvns.ca/atom.xml");
    expect(out!.title).toBe("Julia Evans");
    expect(out!.site_url).toBe("https://jvns.ca");
    expect(out!.latest_post).toBe("Notes");
    expect(out!.description!.length).toBeLessThanOrEqual(400);
  });
  it("drops control characters and fields that are not text", () => {
    const out = cleanEnrichment({ url: "https://jvns.ca/atom.xml", title: "a\u0000b", description: 42, latest_post: "   " });
    expect(out!.title).toBe("a b");
    expect(out!.description).toBeNull();
    expect(out!.latest_post).toBeNull();
  });
});

describe("isRedundantDescription", () => {
  it("drops taglines that only repeat the blog's own name", () => {
    expect(isRedundantDescription("Julia Evans", "Julia Evans")).toBe(true);
    expect(isRedundantDescription("Drew DeVault's blog - Blog", "Drew DeVault's blog")).toBe(true);
    expect(isRedundantDescription("Maggie Appleton.", "Maggie Appleton")).toBe(true);
  });
  it("keeps taglines that say something new", () => {
    expect(isRedundantDescription("Essays on programming, design, and anthropology", "Maggie Appleton")).toBe(false);
    expect(isRedundantDescription("By John Gruber", "Daring Fireball")).toBe(false);
    expect(isRedundantDescription("", "kottke.org")).toBe(false);
  });
  it("never rejects a patch for losing a repeated tagline", () => {
    const out = cleanEnrichment({ url: "https://jvns.ca/atom.xml", title: "Julia Evans", description: "Julia Evans", latest_post: "Notes" });
    expect(out!.description).toBeNull();
    expect(out!.latest_post).toBe("Notes");
  });
});
