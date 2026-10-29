CREATE TABLE public.discovery_feeds (
  url text PRIMARY KEY,
  title text,
  description text,
  site_url text,
  latest_post text,
  subscriber_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discovery_feeds TO service_role;
ALTER TABLE public.discovery_feeds ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.co_subscriptions (
  feed_a text NOT NULL,
  feed_b text NOT NULL,
  weight integer NOT NULL DEFAULT 0,
  PRIMARY KEY (feed_a, feed_b)
);
GRANT ALL ON public.co_subscriptions TO service_role;
ALTER TABLE public.co_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submission_rate_limits (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.submission_rate_limits (ip_hash, created_at);
GRANT ALL ON public.submission_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.submission_rate_limits_id_seq TO service_role;
ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.submit_feed_batch(urls text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u text; v text;
BEGIN
  FOREACH u IN ARRAY urls LOOP
    INSERT INTO discovery_feeds(url, subscriber_count) VALUES (u, 1)
    ON CONFLICT (url) DO UPDATE SET subscriber_count = discovery_feeds.subscriber_count + 1, updated_at = now();
  END LOOP;
  FOREACH u IN ARRAY urls LOOP
    FOREACH v IN ARRAY urls LOOP
      IF u < v THEN
        INSERT INTO co_subscriptions(feed_a, feed_b, weight) VALUES (u, v, 1)
        ON CONFLICT (feed_a, feed_b) DO UPDATE SET weight = co_subscriptions.weight + 1;
      END IF;
    END LOOP;
  END LOOP;
  DELETE FROM submission_rate_limits WHERE created_at < now() - interval '1 day';
END $$;
REVOKE ALL ON FUNCTION public.submit_feed_batch(text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_feed_batch(text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.recommend_feeds(followed text[], lim integer DEFAULT 12)
RETURNS TABLE(url text, title text, description text, site_url text, latest_post text, subscriber_count integer, score numeric, because text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pairs AS (
    SELECT CASE WHEN feed_a = ANY(followed) THEN feed_b ELSE feed_a END AS cand,
           CASE WHEN feed_a = ANY(followed) THEN feed_a ELSE feed_b END AS src,
           weight
    FROM co_subscriptions
    WHERE (feed_a = ANY(followed)) <> (feed_b = ANY(followed))
  ), agg AS (
    SELECT cand, sum(weight) AS w,
      (array_agg(src ORDER BY weight DESC))[1] AS top_src
    FROM pairs GROUP BY cand
  )
  SELECT f.url, f.title, f.description, f.site_url, f.latest_post, f.subscriber_count,
    (a.w * 3 + ln(1 + f.subscriber_count))::numeric AS score,
    coalesce(s.title, a.top_src) AS because
  FROM agg a JOIN discovery_feeds f ON f.url = a.cand
  LEFT JOIN discovery_feeds s ON s.url = a.top_src
  WHERE NOT (f.url = ANY(followed))
  ORDER BY score DESC LIMIT lim;
$$;
REVOKE ALL ON FUNCTION public.recommend_feeds(text[], integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_feeds(text[], integer) TO service_role;

INSERT INTO public.discovery_feeds (url, title, description, site_url, latest_post, subscriber_count) VALUES
('https://simonwillison.net/atom/everything','Simon Willison''s Weblog','Notes on LLMs, Datasette and the open web.','https://simonwillison.net','Things I learned building with LLMs this week',412),
('https://jvns.ca/atom.xml','Julia Evans','Zines and blog posts about how computers work.','https://jvns.ca','A few things I learned about terminal colours',388),
('https://danluu.com/atom.xml','Dan Luu','Long-form essays on software, hardware and work.','https://danluu.com','Why is it so hard to buy things that work well?',301),
('https://maggieappleton.com/rss.xml','Maggie Appleton','Visual essays on programming, design and anthropology.','https://maggieappleton.com','The expanding dark forest and generative AI',276),
('https://www.robinsloan.com/feed.xml','Robin Sloan','Fiction, media and the future of reading.','https://www.robinsloan.com','Is it okay?',198),
('https://austinkleon.com/feed','Austin Kleon','A writer who draws. Notes on creativity.','https://austinkleon.com','The ordinary day',245),
('https://feeds.kottke.org/main','kottke.org','Home of fine hypertext products since 1998.','https://kottke.org','The best links of the week',333),
('https://daringfireball.net/feeds/main','Daring Fireball','John Gruber on Apple, tech and design.','https://daringfireball.net','Linked list: on the new hardware',290),
('https://solar.lowtechmagazine.com/posts/index.xml','Low-tech Magazine','Doubts on progress and technology, solar-powered.','https://solar.lowtechmagazine.com','How to build a low-tech website',211),
('https://craigmod.com/index.xml','Craig Mod','Walking, books, and the craft of publishing.','https://craigmod.com','Notes from a long walk',187),
('https://macwright.com/rss.xml','Tom MacWright','Maps, code and recreational programming.','https://macwright.com','Recently: things I read and liked',154),
('https://rachelbythebay.com/w/atom.xml','rachelbythebay','Stories from production systems and ops.','https://rachelbythebay.com','The time the clocks went wrong',172),
('https://xeiaso.net/blog.rss','Xe Iaso','Infrastructure, Nix, and philosophy.','https://xeiaso.net','Writing a tiny language for fun',143),
('https://drewdevault.com/blog/index.xml','Drew DeVault','Free software, operating systems, and opinions.','https://drewdevault.com','The case for small tools',131),
('https://brr.fyi/feed.xml','brr','Dispatches from Antarctica.','https://brr.fyi','Life at the South Pole in winter',122),
('https://ploum.net/atom_en.xml','Ploum','Writer and engineer on the offline life.','https://ploum.net','Disconnecting is a feature',96),
('https://interconnected.org/home/feed','Interconnected','Matt Webb on technology, design and ideas.','https://interconnected.org/home','Filtered for interesting things',118),
('https://benhoyt.com/writings/rss.xml','Ben Hoyt','Thoughtful writing on Go, Python and software.','https://benhoyt.com','The simple joys of scaling down',89),
('https://eli.thegreenplace.net/feeds/all.atom.xml','Eli Bendersky','Deep dives into compilers and programming.','https://eli.thegreenplace.net','Notes on structured concurrency',104),
('https://www.themarginalian.org/feed','The Marginalian','Maria Popova on art, science and meaning.','https://www.themarginalian.org','On the art of noticing',260);

INSERT INTO public.co_subscriptions (feed_a, feed_b, weight)
SELECT least(a,b), greatest(a,b), w FROM (VALUES
('https://simonwillison.net/atom/everything','https://jvns.ca/atom.xml',120),
('https://simonwillison.net/atom/everything','https://xeiaso.net/blog.rss',80),
('https://simonwillison.net/atom/everything','https://macwright.com/rss.xml',60),
('https://jvns.ca/atom.xml','https://danluu.com/atom.xml',95),
('https://jvns.ca/atom.xml','https://rachelbythebay.com/w/atom.xml',70),
('https://jvns.ca/atom.xml','https://eli.thegreenplace.net/feeds/all.atom.xml',45),
('https://danluu.com/atom.xml','https://rachelbythebay.com/w/atom.xml',88),
('https://danluu.com/atom.xml','https://benhoyt.com/writings/rss.xml',50),
('https://danluu.com/atom.xml','https://drewdevault.com/blog/index.xml',40),
('https://maggieappleton.com/rss.xml','https://www.robinsloan.com/feed.xml',75),
('https://maggieappleton.com/rss.xml','https://interconnected.org/home/feed',66),
('https://maggieappleton.com/rss.xml','https://craigmod.com/index.xml',52),
('https://www.robinsloan.com/feed.xml','https://craigmod.com/index.xml',70),
('https://austinkleon.com/feed','https://www.themarginalian.org/feed',90),
('https://austinkleon.com/feed','https://feeds.kottke.org/main',72),
('https://feeds.kottke.org/main','https://daringfireball.net/feeds/main',85),
('https://feeds.kottke.org/main','https://www.themarginalian.org/feed',64),
('https://solar.lowtechmagazine.com/posts/index.xml','https://ploum.net/atom_en.xml',58),
('https://solar.lowtechmagazine.com/posts/index.xml','https://brr.fyi/feed.xml',40),
('https://craigmod.com/index.xml','https://brr.fyi/feed.xml',35),
('https://macwright.com/rss.xml','https://interconnected.org/home/feed',38),
('https://xeiaso.net/blog.rss','https://drewdevault.com/blog/index.xml',61)
) AS t(a,b,w);