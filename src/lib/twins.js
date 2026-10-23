// Regional twins: a UK post and a US post on the same topic, written separately for each region and
// linked with `counterpart` in their frontmatter (each names the other). Twins are paired in hreflang,
// the sitemap, the old-address doorways and llms.txt, so Google shows UK searchers the UK post and
// US searchers the US one.
//
// Rules (checked on every build; a broken pair stops the build with a clear message):
// - a post with `counterpart` has exactly one region;
// - the counterpart exists, has exactly the other region, and names this post back.
// A counterpart that is still `draft: true` is not an error: the pair is skipped (with a warning)
// until both are published, so no page ever points at a URL that doesn't exist.
import { getCollection } from 'astro:content';

let cache;

/** Map of post id -> { region, other: { id, region } } for every published, valid twin pair. */
export async function getTwins() {
  if (cache) return cache;
  const all = await getCollection('blog');
  const byId = new Map(all.map((p) => [p.id, p]));
  const twins = new Map();
  for (const post of all) {
    const cp = post.data.counterpart;
    if (!cp) continue;
    const where = `src/content/blog/${post.id}.md`;
    const regions = post.data.regions;
    if (regions.length !== 1) {
      throw new Error(`[twins] ${where}: a post with "counterpart" must have exactly one region (has ${JSON.stringify(regions)}).`);
    }
    const other = byId.get(cp);
    if (!other) throw new Error(`[twins] ${where}: counterpart "${cp}" does not exist in src/content/blog/.`);
    const otherRegions = other.data.regions;
    if (otherRegions.length !== 1 || otherRegions[0] === regions[0]) {
      throw new Error(`[twins] ${where}: counterpart "${cp}" must be in the other region only (this post is ${JSON.stringify(regions)}, "${cp}" is ${JSON.stringify(otherRegions)}).`);
    }
    if (other.data.counterpart !== post.id) {
      throw new Error(`[twins] Twin mismatch: ${post.id} -> ${cp}, but ${cp} -> ${other.data.counterpart ?? '(no counterpart)'}. Both posts must name each other.`);
    }
    if (post.data.draft || other.data.draft) {
      if (!post.data.draft) console.warn(`[twins] ${post.id}: counterpart "${cp}" is a draft, so the pair is not linked yet.`);
      continue;
    }
    twins.set(post.id, { region: regions[0], other: { id: other.id, region: otherRegions[0] } });
  }
  cache = twins;
  return twins;
}

/** hreflang pairs for a post, UK first, or undefined if it has no published twin. */
export function twinHreflang(post, twins) {
  const t = twins.get(post.id);
  if (!t) return undefined;
  return [
    { region: t.region, path: `/insights/${post.id}/` },
    { region: t.other.region, path: `/insights/${t.other.id}/` },
  ].sort((a, b) => (a.region === 'uk' ? -1 : 1) - (b.region === 'uk' ? -1 : 1));
}
