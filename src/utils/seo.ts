// src/utils/seo.ts — SEO helpers for full static export
export interface SeoProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noindex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  tags?: string[];
}

export function absoluteUrl(site: string | URL, path: string): string {
  const s = site.toString().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${s}${p}`;
}

export function jsonLdArticle(props: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: props.title,
    description: props.description,
    url: props.url,
    image: props.image,
    datePublished: props.datePublished,
    author: props.author ? { "@type": "Person", name: props.author } : undefined,
    publisher: {
      "@type": "Organization",
      name: "Wikis for devs",
      logo: { "@type": "ImageObject", url: `${props.url}/favicon.svg` },
    },
  };
}

export function jsonLdBreadcrumb(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}
