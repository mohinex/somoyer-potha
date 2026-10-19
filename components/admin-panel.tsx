"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/posts";
import { migratedPosts } from "@/lib/posts";
import { defaultSiteSettings, normalizeSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getSupabase } from "@/lib/supabase";

const blank = { title:"", slug:"", category:"বাংলাদেশ", author:"", excerpt:"", content:"", cover_image:"", image_alt:"", is_published:false };
const slugify = (value:string) => value.normalize("NFKC").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,100) || `news-${Date.now()}`;
const bnDate = (date:string) => new Intl.DateTimeFormat("bn-BD", { dateStyle:"medium" }).format(new Date(date));

export default function AdminPanel() {
  const supabase = getSupabase();
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [categoriesText, setCategoriesText] = useState(defaultSiteSettings.categories.join("\n"));
  const [tab, setTab] = useState<"posts"|"site">("posts");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState(blank);
  const [postId, setPostId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from("posts").select("id,title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at,updated_at").order("updated_at", { ascending:false }).limit(200);
    if (loadError) setError(`সংবাদ লোড করা যায়নি: ${loadError.message}`);
    else setPosts((data || []) as Post[]);
  }, [supabase]);

  const loadSettings = useCallback(async () => {
    if (!supabase) return;
    const { data, error: settingsError } = await supabase.from("site_settings").select("value").eq("key", "public").maybeSingle();
    if (settingsError) { setError(`সাইট সেটিংস লোড করা যায়নি: ${settingsError.message}`); return; }
    const next = normalizeSiteSettings(data?.value);
    setSettings(next);
    setCategoriesText(next.categories.join("\n"));
  }, [supabase]);

  const verifySession = useCallback(async (nextSession:any) => {
    setSession(nextSession);
    if (!supabase || !nextSession?.user) { setIsAdmin(false); return; }
    const { data } = await supabase.from("admins").select("user_id").eq("user_id", nextSession.user.id).maybeSingle();
    if (!data) {
      await supabase.auth.signOut();
      setIsAdmin(false);
      setError("এই account-এ editor permission নেই।");
      return;
    }
    setError(""); setIsAdmin(true); await Promise.all([loadPosts(), loadSettings()]);
  }, [loadPosts, loadSettings, supabase]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data})=>verifySession(data.session));
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_event,nextSession)=>{
      window.setTimeout(()=>verifySession(nextSession),0);
    });
    return ()=>subscription.unsubscribe();
  }, [supabase, verifySession]);

  const update = (key:keyof typeof blank, value:string|boolean) => setForm(current=>({...current,[key]:value}));
  const clearEditor = () => { setEditing(false); setPostId(null); setForm(blank); if(fileRef.current) fileRef.current.value=""; };
  const beginEdit = (post:Post) => {
    setEditing(true); setPostId(post.id || null);
    setForm({title:post.title,slug:post.slug,category:post.category,author:post.author||"",excerpt:post.excerpt||"",content:post.content||"",cover_image:post.cover_image||"",image_alt:post.image_alt||"",is_published:post.is_published});
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const login = async (event:FormEvent) => {
    event.preventDefault(); setError("");
    const { error:loginError } = await supabase!.auth.signInWithPassword({email:email.trim(),password});
    if (loginError) setError(`লগইন হয়নি: ${loginError.message}`);
  };
  const removePost = async (post:Post) => {
    if (!post.id || !window.confirm(`“${post.title}” মুছে ফেলবেন?`)) return;
    const {error:deleteError}=await supabase!.from("posts").delete().eq("id",post.id);
    if(deleteError) setError(`মুছতে পারিনি: ${deleteError.message}`);
    else { setPosts(current=>current.filter(item=>item.id!==post.id)); setMessage("সংবাদটি মুছে ফেলা হয়েছে।"); }
  };
  const savePost = async (event:FormEvent) => {
    event.preventDefault(); setError(""); setMessage("সংরক্ষণ হচ্ছে…"); setWorking(true);
    try {
      let imageUrl=form.cover_image.trim() || null;
      const file=fileRef.current?.files?.[0];
      if(file) {
        if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024) throw new Error("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৫ MB)।");
        const extension=file.type.split("/")[1].replace("jpeg","jpg");
        const path=`${crypto.randomUUID()}.${extension}`;
        const {error:uploadError}=await supabase!.storage.from("post-images").upload(path,file,{upsert:false,contentType:file.type});
        if(uploadError) throw uploadError;
        imageUrl=supabase!.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
      const current=posts.find(post=>post.id===postId);
      const payload={title:form.title.trim(),slug:slugify(form.slug||form.title),category:form.category,excerpt:form.excerpt.trim(),content:form.content.trim(),author:form.author.trim()||null,cover_image:imageUrl||current?.cover_image||null,image_alt:form.image_alt.trim()||null,is_published:form.is_published,published_at:form.is_published?(current?.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
      const result=postId?await supabase!.from("posts").update(payload).eq("id",postId):await supabase!.from("posts").insert(payload);
      if(result.error) throw result.error;
      clearEditor(); await loadPosts(); setMessage("সংবাদ সংরক্ষণ হয়েছে।");
    } catch (cause) { setError(`সংরক্ষণ হয়নি: ${cause instanceof Error?cause.message:"অজানা সমস্যা"}`); setMessage(""); }
    finally { setWorking(false); }
  };
  const saveSettings = async (event:FormEvent) => {
    event.preventDefault(); setError(""); setMessage("সাইট সেটিংস সংরক্ষণ হচ্ছে…"); setWorking(true);
    const categories = categoriesText.split(/[\n,]+/).map(item=>item.trim()).filter(Boolean);
    const next = normalizeSiteSettings({...settings,categories});
    try {
      const {error:saveError}=await supabase!.from("site_settings").upsert({key:"public",value:next,updated_at:new Date().toISOString()});
      if(saveError) throw saveError;
      setSettings(next); setCategoriesText(next.categories.join("\n")); setMessage("সাইটের সেটিংস সংরক্ষণ হয়েছে।");
    } catch(cause) { setError(`সেটিংস সংরক্ষণ হয়নি: ${cause instanceof Error?cause.message:"অজানা সমস্যা"}`); setMessage(""); }
    finally { setWorking(false); }
  };
  const importCurrentPosts = async () => {
    if(!supabase || !window.confirm(`আগের সাইটের ${migratedPosts.length}টি সংবাদ ডেটাবেসে যোগ/আপডেট করবেন? একই slug-এর সংবাদ আপডেট হবে।`)) return;
    setWorking(true); setError(""); setMessage("পুরনো সংবাদ আনা হচ্ছে…");
    const records=migratedPosts.map(({title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at})=>({title,slug,category,excerpt,content,cover_image,image_alt,author,is_published,published_at,updated_at:new Date().toISOString()}));
    const {error:importError}=await supabase.from("posts").upsert(records,{onConflict:"slug"});
    if(importError) { setError(`পুরনো সংবাদ আনা যায়নি: ${importError.message}`); setMessage(""); }
    else { await loadPosts(); setMessage(`${migratedPosts.length}টি আগের সংবাদ ডেটাবেসে যোগ হয়েছে।`); }
    setWorking(false);
  };

  return <>
    <header className="top"><div className="wrap head"><Link className="brand" href="/">সময়ের পথে<small>সময়ের সঙ্গে, সত্যের পথে</small></Link><nav className="head-links"><Link href="/">সাইট দেখুন ↗</Link>{session?.user?.email&&<><span>{session.user.email}</span><button className="btn" onClick={()=>supabase!.auth.signOut()}>লগ আউট</button></>}</nav></div></header>
    <main className="wrap">
      {!supabase&&<section className="panel login-panel"><h2>Backend সেটআপ বাকি</h2><p className="muted">লাইভ অ্যাডমিন চালু করতে ডেটাবেস, নিরাপদ লগইন এবং ছবি রাখার storage যুক্ত করতে হবে। ধাপগুলো repository-র SETUP.md-এ আছে। শুধু public anon key ব্যবহার করুন; service_role key কখনো browser-এ দেবেন না।</p></section>}
      {supabase&&!session&&<section className="panel login-panel"><h2>অ্যাডমিন লগইন</h2><p className="muted">অনুমোদিত account দিয়ে প্রবেশ করুন।</p>{error&&<div className="error">{error}</div>}<form onSubmit={login}><label className="field"><span>ইমেইল</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field"><span>পাসওয়ার্ড</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn primary">লগইন করুন</button></form></section>}
      {session&&isAdmin&&<>
        <div className="page-title"><div><h1>সাইট অ্যাডমিন</h1><p>সংবাদ ও সাইটের দৃশ্যমান বিষয়বস্তু এখান থেকে নিয়ন্ত্রণ করুন।</p></div></div>
        <div className="admin-tabs"><button className={`btn ${tab==="posts"?"primary":""}`} onClick={()=>setTab("posts")}>সংবাদ</button><button className={`btn ${tab==="site"?"primary":""}`} onClick={()=>setTab("site")}>সাইট সেটিংস</button></div>
        {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
        {tab==="site"&&<section className="panel"><h2 className="editor-heading">সাইট ও ক্যাটাগরি</h2><p className="muted">এই তথ্য হোমপেজ, সংবাদ বিভাগ এবং ফুটারে দেখা যাবে।</p><form onSubmit={saveSettings}><div className="form-grid">
          <label className="field"><span>সাইটের নাম</span><input maxLength={80} required value={settings.siteName} onChange={e=>setSettings({...settings,siteName:e.target.value})}/></label>
          <label className="field"><span>স্লোগান</span><input maxLength={140} value={settings.tagline} onChange={e=>setSettings({...settings,tagline:e.target.value})}/></label>
          <label className="field full"><span>সর্বশেষ খবরের টিকার</span><input maxLength={220} value={settings.breakingText} onChange={e=>setSettings({...settings,breakingText:e.target.value})}/></label>
          <label className="field full"><span>ক্যাটাগরি (প্রতি লাইনে একটি)</span><textarea value={categoriesText} onChange={e=>setCategoriesText(e.target.value)} placeholder="বাংলাদেশ&#10;রাজনীতি&#10;বিশ্ব"/></label>
          <label className="field full"><span>ফুটারের পরিচিতি</span><textarea maxLength={500} value={settings.aboutText} onChange={e=>setSettings({...settings,aboutText:e.target.value})}/></label>
          <label className="field"><span>যোগাযোগের ইমেইল</span><input type="email" value={settings.contactEmail} onChange={e=>setSettings({...settings,contactEmail:e.target.value})}/></label>
        </div><div className="form-actions"><button className="btn primary" disabled={working}>{working?"সংরক্ষণ হচ্ছে…":"সাইট সেটিংস সংরক্ষণ"}</button></div></form></section>}
        {tab==="posts"&&<>
          <div className="admin-actions"><button className="btn" disabled={working} onClick={importCurrentPosts}>আগের সাইটের সংবাদ আনুন ({migratedPosts.length})</button><button className="btn primary" onClick={()=>{clearEditor();setEditing(true);}}>＋ নতুন সংবাদ</button></div>
          {editing&&<section className="panel"><h2 className="editor-heading">{postId?"সংবাদ সম্পাদনা":"নতুন সংবাদ"}</h2><form onSubmit={savePost}><div className="form-grid">
            <label className="field full"><span>শিরোনাম *</span><input required maxLength={180} value={form.title} onChange={e=>update("title",e.target.value)} placeholder="সংবাদের শিরোনাম লিখুন"/></label>
            <label className="field full"><span>লিংক slug</span><input maxLength={100} value={form.slug} onChange={e=>update("slug",e.target.value)} placeholder="খালি রাখলে শিরোনাম থেকে তৈরি হবে"/><div className="upload-hint">এই slug থেকেই সংবাদ লিংক তৈরি হবে।</div></label>
            <label className="field"><span>বিভাগ *</span><select required value={form.category} onChange={e=>update("category",e.target.value)}>{Array.from(new Set([...settings.categories,form.category])).map(category=><option key={category}>{category}</option>)}</select></label>
            <label className="field"><span>লেখক</span><input value={form.author} onChange={e=>update("author",e.target.value)} placeholder="প্রতিবেদকের নাম"/></label>
            <label className="field full"><span>সংক্ষিপ্ত পরিচিতি</span><textarea maxLength={400} value={form.excerpt} onChange={e=>update("excerpt",e.target.value)} placeholder="হোমপেজে শিরোনামের নিচে দেখা যাবে"/></label>
            <label className="field full"><span>বিস্তারিত লেখা *</span><textarea className="content" required value={form.content} onChange={e=>update("content",e.target.value)} placeholder="প্রতিটি অনুচ্ছেদের মাঝে একটি ফাঁকা লাইন রাখুন"/></label>
            <label className="field"><span>ছবির লিংক</span><input type="url" value={form.cover_image} onChange={e=>update("cover_image",e.target.value)} placeholder="https://..."/><div className="upload-hint">অথবা ছবি upload করুন।</div></label>
            <label className="field"><span>ছবি upload</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"/><div className="upload-hint">JPG, PNG বা WebP · সর্বোচ্চ ৫ MB</div></label>
            <label className="field full"><span>ছবির বর্ণনা</span><input maxLength={180} value={form.image_alt} onChange={e=>update("image_alt",e.target.value)} placeholder="ছবিতে কী আছে"/></label>
          </div><label className="switchline"><input type="checkbox" checked={form.is_published} onChange={e=>update("is_published",e.target.checked)}/><span>এখনই প্রকাশ করুন</span></label><div className="form-actions"><button className="btn primary" disabled={working}>{working?"সংরক্ষণ হচ্ছে…":postId?"পরিবর্তন সংরক্ষণ":"সংরক্ষণ করুন"}</button><button className="btn" type="button" onClick={clearEditor}>বাতিল</button></div></form></section>}
          <section className="panel post-list"><div className="list-head"><h2>সব সংবাদ</h2><span className="status">{posts.length}টি সংবাদ</span></div>{posts.length?posts.map(post=><article className="post-row" key={post.id}><img src={post.cover_image||"https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=220&q=75"} alt=""/><div><h3>{post.title}<span className={`badge ${post.is_published?"live":""}`}>{post.is_published?"প্রকাশিত":"খসড়া"}</span></h3><small>{post.category} · /{post.slug} · {post.updated_at?bnDate(post.updated_at):""}</small></div><div className="row-actions"><button className="btn" onClick={()=>beginEdit(post)}>সম্পাদনা</button><button className="btn danger" onClick={()=>removePost(post)}>মুছুন</button></div></article>):<div className="empty">এখনও backend-এ সংবাদ নেই। “আগের সাইটের সংবাদ আনুন” দিয়ে আগের ২১টি সংবাদ যোগ করুন।</div>}</section>
        </>}
      </>}
      {session&&!isAdmin&&!error&&<section className="panel login-panel"><h2>অনুমতি যাচাই হচ্ছে…</h2></section>}
    </main><footer className="footer"><div className="wrap">© ২০২৬ সময়ের পথে · কেবল অনুমোদিত সম্পাদকরা এই প্যানেল ব্যবহার করতে পারবেন।</div></footer>
  </>;
}
