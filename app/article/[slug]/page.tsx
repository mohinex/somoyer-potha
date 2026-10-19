import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

type PageProps = { params: Promise<{ slug:string }> };

export async function generateMetadata({params}:PageProps) {
  const {slug}=await params;
  const post=await getPostBySlug(slug);
  return post
    ? { title:`${post.title} | সময়ের পথে`, description:post.excerpt, alternates:{ canonical:`/article/${encodeURIComponent(post.slug)}` } }
    : { title:"সংবাদ | সময়ের পথে" };
}

export default async function ArticlePage({params}:PageProps) {
  const {slug}=await params;
  const post=await getPostBySlug(slug);
  if(!post) notFound();
  const date=post.published_at?new Intl.DateTimeFormat("bn-BD",{dateStyle:"long",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(post.published_at)):"";
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(post.content);
  return <><header className="article-head"><div className="article-wrap"><Link href="/" className="article-brand">সময়ের পথে<small>সময়ের সঙ্গে, সত্যের পথে</small></Link><Link href="/" className="back-link">← হোমপেজে ফিরুন</Link></div></header><main className="article-wrap article-page"><article><div className="section-label">{post.category}</div><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><div className="meta">{date}{post.author?` · ${post.author}`:""}</div>{post.cover_image&&<img className="article-cover" src={post.cover_image} alt={post.image_alt||post.title}/>}<div className="article-body">{isHtml?<div dangerouslySetInnerHTML={{__html:post.content}}/>:post.content.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div></article></main><footer className="article-footer"><div className="article-wrap">© ২০২৬ সময়ের পথে · সর্বস্বত্ব সংরক্ষিত</div></footer></>;
}
