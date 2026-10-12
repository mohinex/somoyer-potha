"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { demoPosts, type Post } from "@/lib/posts";
import { getSupabase } from "@/lib/supabase";

const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("bn-BD", { dateStyle:"medium", timeStyle:"short" }).format(new Date(date)) : "এখনই প্রকাশিত";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>(demoPosts);
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("posts").select("id,title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at,updated_at").eq("is_published", true).order("published_at", { ascending:false }).limit(30).then(({ data, error }) => {
      if (!error && data) setPosts(data as Post[]);
    });
  }, []);

  const [lead, ...rest] = posts;
  const byCategory = (category: string) => posts.filter(post => post.category === category).slice(0, 3);
  const storyLink = (post: Post) => `/article/${encodeURIComponent(post.slug)}`;
  const storyTitle = (post: Post) => <Link href={storyLink(post)}>{post.title}</Link>;
  const categories = ["বাংলাদেশ", "বিশ্ব"];

  return <>
    <div className="topline"><div className="wrap"><div className="top-left"><span>{new Intl.DateTimeFormat("bn-BD", { weekday:"long", day:"numeric", month:"long", year:"numeric", timeZone:"Asia/Dhaka" }).format(new Date())}</span><span className="weather">ঢাকা ☀ ৩১°</span></div><div className="top-right"><a href="#">ই-পেপার</a><a href="#">English</a><button onClick={() => setDark(value => !value)} aria-label="থিম বদলান">{dark ? "☀️" : "🌙"}</button></div></div></div>
    <div>
      <header><div className="wrap masthead"><Link href="/" className="brand">সময়ের পথ<small>সময়ের সঙ্গে, সত্যের পথে</small></Link><div className="mast-actions"><button className="icon-btn" onClick={() => setSearchOpen(value => !value)} aria-label="খুঁজুন"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button><button className="icon-btn mobile-menu" aria-label="মেনু">☰</button></div></div>
        <div className="nav-wrap"><nav className="wrap nav">{["সর্বশেষ","বাংলাদেশ","রাজনীতি","বিশ্ব","বাণিজ্য","মতামত","খেলা","বিনোদন","চাকরি","জীবনযাপন","ভিডিও"].map((item,i)=><a key={item} className={i===0?"active":""} href={i===1?"#bangladesh":"#latest"}>{item}</a>)}</nav></div><div className="subnav"><div className="wrap"><div className="sub-links">{["রাজধানী","জেলা","পরিবেশ","শিক্ষা","প্রযুক্তি"].map(item=><a key={item} href="#latest">{item}</a>)}</div><span>আজকের বিশেষ প্রতিবেদন</span></div></div>
      </header>
      {searchOpen && <form className="search-panel open" onSubmit={event=>{event.preventDefault(); if(query.trim()) alert(`“${query.trim()}” খুঁজে দেখা হচ্ছে`);}}><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="যা খুঁজতে চান লিখুন" aria-label="খুঁজুন"/><button>খুঁজুন</button></form>}
      <main className="wrap"><div className="breaking"><b>সর্বশেষ</b><i className="pulse"/><span>দেশজুড়ে নানা উদ্যোগে বদলে যাচ্ছে মানুষের জীবনযাত্রা • আজকের সব খবর পড়ুন এখানে</span></div>
        {lead ? <section className="lead-grid"><article className="hero"><Link href={storyLink(lead)} className="hero-link"><img className="hero-img" src={lead.cover_image || demoPosts[0].cover_image!} alt={lead.image_alt || lead.title}/><div className="section-label">{lead.category}</div><h1>{lead.title}</h1><p>{lead.excerpt}</p><div className="meta">{formatDate(lead.published_at)}{lead.author ? ` · ${lead.author}` : ""}</div></Link></article>
          <div className="side-leads">{rest.slice(0,3).map((post,index)=><article className={`story ${index===1 && post.cover_image?"photo-story":""}`} key={post.slug}>{index===1 && post.cover_image?<><div><div className="section-label">{post.category}</div><h2>{storyTitle(post)}</h2><div className="meta">{formatDate(post.published_at)}</div></div><img src={post.cover_image} alt={post.image_alt || post.title}/></>:<><div className="section-label">{post.category}</div><h2>{storyTitle(post)}</h2><p>{post.excerpt}</p><div className="meta">{formatDate(post.published_at)}</div></>}</article>)}</div>
          <aside className="most-read"><h3>পাঠকপ্রিয়</h3>{posts.slice(0,5).map((post,index)=><div className="ranked" key={post.slug}><b>{index+1}</b><p>{storyTitle(post)}</p></div>)}</aside>
        </section> : <section className="lead-grid backend-empty"><article className="hero"/></section>}
        <div className="ad-slot">বিজ্ঞাপন</div>
        <section id="bangladesh"><div className="section-head"><h2>সর্বশেষ সংবাদ</h2><a href="#latest">সব খবর →</a></div><div id="latest" className="latest-grid">{posts.slice(0,8).map(post=><article className="card" key={post.slug}><Link href={storyLink(post)}><img src={post.cover_image || demoPosts[0].cover_image!} alt={post.image_alt || post.title}/><div className="tag">{post.category}</div><h3>{post.title}</h3></Link><p>{post.excerpt}</p><div className="meta">{formatDate(post.published_at)}</div></article>)}</div></section>
        <div className="below">{categories.map(category=><section key={category}><div className="section-head"><h2>{category}</h2><a href="#latest">আরও খবর →</a></div>{byCategory(category).map(post=><article className="brief" key={post.slug}><Link href={storyLink(post)}><img src={post.cover_image || demoPosts[0].cover_image!} alt={post.image_alt || post.title}/></Link><div><h3>{storyTitle(post)}</h3><small>{post.category} · {formatDate(post.published_at)}</small></div></article>)}</section>)}</div>
        <div className="topic-box"><h3>বিষয়</h3><div className="chips">{["বাংলাদেশ","রাজনীতি","অর্থনীতি","ক্রিকেট","শিক্ষা","প্রযুক্তি","চাকরি"].map(topic=><a key={topic} href="#latest">{topic}</a>)}</div></div>
      </main>
      <footer><div className="wrap"><div className="foot-top"><Link href="/" className="foot-brand">সময়ের পথ</Link><div className="foot-links"><a href="#">আমাদের সম্পর্কে</a><a href="#">যোগাযোগ</a><a href="#">গোপনীয়তা নীতি</a><a href="#">বিজ্ঞাপন</a><Link href="/admin">সম্পাদক লগইন</Link></div></div><div className="copyright"><span>© ২০২৬ সময়ের পথ | সর্বস্বত্ব সংরক্ষিত</span><span>ঢাকা, বাংলাদেশ</span></div></div></footer>
    </div>
  </>;
}
