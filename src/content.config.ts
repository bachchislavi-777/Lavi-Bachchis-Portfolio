// Blog posts live in src/content/blog/ as Markdown files. The file name becomes the URL:
// src/content/blog/my-post.md → /insights/my-post/
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(), // the H1 on the page
    seoTitle: z.string().max(65), // <title> tag, keep under ~60 characters
    description: z.string().max(165), // meta description
    excerpt: z.string(), // card text on the blog page
    keyword: z.string(), // main search phrase the post targets (for your reference)
    // Which regional sites publish the post. UK-only posts (UK prices, UK law, NHS signposting) use ["uk"].
    regions: z.array(z.enum(['uk', 'us'])).default(['uk', 'us']),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // Short Q&As shown at the end of the post and marked up as FAQPage for search and AI answers.
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    // Optional: the case study (an id from src/data/brands.js) that shows this advice in practice. Links both ways.
    caseStudy: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
