import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { humanizeSlug, extractDescription } from "../utils/content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const wikis = await getCollection("wikis");
  const site = context.site?.toString() ?? "https://example.com";
  // Sort by id for deterministic feed; if date frontmatter added later, sort by date
  const items = await Promise.all(
    wikis.map(async (entry) => {
      const { body } = entry;
      // render not needed for description — use helper
      const title = (entry.data as any)?.title ?? humanizeSlug(entry.id);
      const description = (entry.data as any)?.description ?? extractDescription(body, 200);
      return {
        title,
        description,
        link: `/${entry.id}/`,
        pubDate: new Date(), // no date in source; could parse from file mtime if needed
      };
    }),
  );

  return rss({
    title: "Wikis for devs — RSS",
    description: "SEO-first wikis for developers by @mahabubone",
    site,
    items: items.sort((a, b) => a.title.localeCompare(b.title)),
    customData: `<language>en-us</language>`,
  });
}
