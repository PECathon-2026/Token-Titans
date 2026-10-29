import { toast } from "sonner";
import { Button, Card, Favicon, Sticker } from "./brut";
import { isRedundantDescription, submissionLabel, type DiscoveryFeed } from "@/lib/discovery";
import { useStore } from "@/lib/store";

export function DiscoveryCard({ feed, compact }: { feed: DiscoveryFeed; compact?: boolean }) {
  const { subscribe } = useStore();
  const title = feed.title ?? new URL(feed.url).hostname;
  const label = submissionLabel(feed.subscriber_count);
  const showDesc = !!feed.description && !isRedundantDescription(feed.description, title);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        {feed.site_url && <Favicon siteUrl={feed.site_url} className="mt-1 h-6 w-6 shrink-0 border-2 border-ink" />}
        <h3 className="min-w-0 flex-1 text-lg leading-tight">{title}</h3>
      </div>
      {label && (
        <div className="-mt-1">
          <Sticker tone="light" rotate={2}>{label}</Sticker>
        </div>
      )}
      {!compact && showDesc && <p className="text-sm">{feed.description}</p>}
      {!compact && feed.latest_post && (
        <p className="border-l-[6px] border-ink bg-pink px-3 py-2 text-xs">
          <b>Latest:</b> {feed.latest_post}
        </p>
      )}
      {!compact && !showDesc && !feed.latest_post && <p className="truncate text-xs">{feed.url}</p>}
      {feed.because && <p className="text-xs italic">Often submitted alongside {feed.because}</p>}
      <Button
        size={compact ? "sm" : "lg"}
        className="mt-auto w-full"
        onClick={async () => {
          const r = await subscribe(feed.url, { title });
          if (r === "duplicate") toast("Already subscribed");
        }}
      >
        + Subscribe
      </Button>
    </Card>
  );
}
