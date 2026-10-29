import { Link } from "@tanstack/react-router";
import type { Feed, Post } from "@/lib/db";
import { stripHtml } from "@/lib/feeds";
import { fmtDate } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Favicon, Sticker } from "./brut";

export function PostCard({ post, feed, isNew }: { post: Post; feed?: Feed | undefined; isNew?: boolean }) {
  const text = stripHtml(post.summary);
  const snippet = text.length > 520 ? `${text.slice(0, 520).replace(/\s+\S*$/, "")}…` : text;
  return (
    <Link
      to="/read/$postId"
      params={{ postId: post.id }}
      className={cn("brut-press block border-[3px] border-ink p-4", post.read ? "bg-sage-light shadow-brut-sm" : "bg-cream shadow-brut-lg")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("h-3.5 w-3.5 shrink-0 border-[3px] border-ink", post.read ? "bg-transparent" : "bg-ink")} aria-label={post.read ? "Read" : "Unread"} />
        {feed?.siteUrl && <Favicon siteUrl={feed.siteUrl} className="h-4 w-4 border-2 border-ink" />}
        <span className="min-w-0 flex-1 truncate font-display uppercase">{feed?.title ?? "Unknown feed"}</span>
        <span className="ml-auto shrink-0">{fmtDate(post.date)}</span>
        {isNew && !post.read && <Sticker tone="pink">NEW</Sticker>}
      </div>
      <h3 className="break-words font-display text-lg normal-case leading-tight md:text-xl">{post.title}</h3>
      {snippet && <p className="mt-3 line-clamp-4 break-words text-sm leading-relaxed">{snippet}</p>}
    </Link>
  );
}
