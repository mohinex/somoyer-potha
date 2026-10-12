import { getSupabase } from "@/lib/supabase";
import migratedPostsData from "@/data/migrated-posts.json";

export type Post = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  image_alt: string | null;
  author: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at?: string;
  source_url?: string;
};

export const migratedPosts = migratedPostsData as Post[];

export async function getPublishedPosts(): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase) return migratedPosts;
  const { data, error } = await supabase.from("posts").select("id,title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at,updated_at").eq("is_published", true).order("published_at", { ascending:false }).limit(100);
  if (error || !data) return migratedPosts;
  return data as Post[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  let normalizedSlug = slug;
  try {
    normalizedSlug = decodeURIComponent(slug);
  } catch {
    // Keep the original value if the route parameter is not URI-encoded.
  }
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("posts").select("id,title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at,updated_at").eq("slug", normalizedSlug).eq("is_published", true).maybeSingle();
    if (!error && data) return data as Post;
  }
  return migratedPosts.find(post => post.slug === normalizedSlug || encodeURIComponent(post.slug) === slug) || null;
}
