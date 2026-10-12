# সময়ের পথ (Somoyer Potha) — Next.js ও admin panel

সাইটটি Next.js App Router-এ চলে। হোমপেজের বর্তমান সংবাদপত্রের ডিজাইন রাখা হয়েছে। `/admin`-এ অনুমোদিত সম্পাদক খবর যোগ, সম্পাদনা, খসড়া/প্রকাশ, ছবি upload ও delete করতে পারবেন। `/article/[slug]`-এ প্রকাশিত খবরের বিস্তারিত দেখা যায়।

## Supabase একবার সংযুক্ত করুন

1. Supabase-এ একটি project তৈরি করুন।
2. Dashboard-এর **SQL Editor**-এ `supabase/schema.sql`-এর সব SQL চালান। এতে posts table, admin-only RLS policies, public image bucket ও নমুনা খবর তৈরি হবে।
3. Supabase **Project Settings → API** থেকে project URL এবং anon/public key নিন। Vercel Project → **Settings → Environment Variables**-এ এগুলো যোগ করুন:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon/public key

   `service_role` key কখনো environment-এর `NEXT_PUBLIC_` value হিসেবে বা browser-এ দেবেন না।
4. Supabase **Authentication → Users → Add user** থেকে নিজের email/password দিয়ে admin account তৈরি করুন। Supabase confirmation চাইলে email থেকে confirm করুন।
5. ওই user-এর UUID নিয়ে SQL Editor-এ চালান:

   ```sql
   insert into public.admins (user_id) values ('YOUR_AUTH_USER_UUID');
   ```

6. Vercel-এ নতুন deploy করুন। তারপর `https://ajker-alo.vercel.app/admin` থেকে প্রবেশ করুন।

## লোকালি চালানো

`.env.local` ফাইলে উপরের দুই environment variable দিন, তারপর:

```sh
npm install
npm run dev
```

Database key না থাকলে homepage নমুনা খবর দেখায় এবং admin panel setup নির্দেশনা দেখায়। Database যুক্ত হলে homepage প্রকাশিত খবরগুলো database থেকে load করে। Public visitor শুধু published খবর পড়তে পারে; admin তালিকায় অনুমোদিত user-রাই লেখা তৈরি বা পরিবর্তন করতে পারেন।
