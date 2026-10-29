export interface SeedBlog {
  title: string;
  url: string;
  siteUrl: string;
  blurb: string | null;
  tag: string;
}

/** Descriptions below are each blog's own feed/site tagline; null means it publishes none. */
export const SEED_BLOGS: SeedBlog[] = [
  { title: "Simon Willison", url: "https://simonwillison.net/atom/everything", siteUrl: "https://simonwillison.net", blurb: null, tag: "code" },
  { title: "Julia Evans", url: "https://jvns.ca/atom.xml", siteUrl: "https://jvns.ca", blurb: null, tag: "code" },
  { title: "Dan Luu", url: "https://danluu.com/atom.xml", siteUrl: "https://danluu.com", blurb: null, tag: "code" },
  { title: "Maggie Appleton", url: "https://maggieappleton.com/rss.xml", siteUrl: "https://maggieappleton.com", blurb: "Essays on programming, design, and anthropology", tag: "design" },
  { title: "Robin Sloan", url: "https://www.robinsloan.com/feed.xml", siteUrl: "https://www.robinsloan.com", blurb: "The home page of Robin Sloan, author of the novels Moonbound, Sourdough, and Mr. Penumbra's 24-Hour Bookstore.", tag: "writing" },
  { title: "Austin Kleon", url: "https://austinkleon.com/feed", siteUrl: "https://austinkleon.com", blurb: null, tag: "writing" },
  { title: "kottke.org", url: "https://feeds.kottke.org/main", siteUrl: "https://kottke.org", blurb: "Jason Kottke's weblog, home of fine hypertext products since 1998", tag: "links" },
  { title: "Daring Fireball", url: "https://daringfireball.net/feeds/main", siteUrl: "https://daringfireball.net", blurb: "By John Gruber", tag: "links" },
  { title: "Low-tech Magazine", url: "https://solar.lowtechmagazine.com/posts/index.xml", siteUrl: "https://solar.lowtechmagazine.com", blurb: "This is a solar-powered website, which means it sometimes goes offline", tag: "planet" },
  { title: "Craig Mod", url: "https://craigmod.com/index.xml", siteUrl: "https://craigmod.com", blurb: "Essays and updates from craigmod.com", tag: "writing" },
  { title: "Tom MacWright", url: "https://macwright.com/rss.xml", siteUrl: "https://macwright.com", blurb: "JavaScript, math, maps, etc", tag: "code" },
  { title: "rachelbythebay", url: "https://rachelbythebay.com/w/atom.xml", siteUrl: "https://rachelbythebay.com", blurb: null, tag: "code" },
];
