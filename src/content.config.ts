import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Single wikis collection reading every markdown under resources/
// - id = relative path without .md (e.g., "apis/bruno-api-contract-testing")
// - category = first segment of id (apis, databases, etc.)
// Markdowns have no frontmatter (title is first H1, source is *Source: ...* line)
// We allow optional frontmatter if present and passthrough any extra fields.
const wikis = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./resources" }),
  schema: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      date: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { wikis };
