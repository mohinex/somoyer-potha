# সময়ের পথ — সংবাদ ও সাইট অ্যাডমিন

লাইভ সাইটে `/admin` থেকে সংবাদ তৈরি, সম্পাদনা, প্রকাশ/খসড়া, ছবি upload ও delete করা যায়। **সাইট সেটিংস** থেকে সাইটের নাম, স্লোগান, breaking ticker, ক্যাটাগরি, footer পরিচিতি এবং যোগাযোগের ইমেইল বদলানো যায়। ডেটাবেস যুক্ত হলে আগের ২১টি সংবাদও অ্যাডমিন থেকে import করা যাবে।

## একবারের backend সংযোগ

সাইটের অ্যাডমিন চালাতে Supabase project লাগবে। Project-এর owner নিজে সংযোগটি সম্পন্ন করবেন:

1. Supabase project তৈরি করুন। **SQL Editor**-এ `supabase/schema.sql`-এর সম্পূর্ণ SQL চালান। এটি সংবাদ, সাইট সেটিংস, editor access policy এবং ছবির storage তৈরি করে।
2. Supabase **Authentication → Providers/Settings**-এ public sign-up বন্ধ রাখুন। **Authentication → Users** থেকে শুধু আপনার admin user তৈরি করুন।
3. ওই user-এর UUID নিয়ে SQL Editor-এ চালান:

   ```sql
   insert into public.admins (user_id) values ('YOUR_AUTH_USER_UUID');
   ```

4. Supabase **Project Settings → API** থেকে Project URL ও anon/public key নিন। Vercel Project → **Settings → Environment Variables**-এ `Production` এবং `Preview`-এর জন্য যোগ করুন:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

   `service_role` key কখনো browser-এ বা `NEXT_PUBLIC_` variable-এ দেবেন না।
5. Vercel-এ নতুন deployment হওয়ার পর `https://somoyerpotha.com/admin` খুলে admin account দিয়ে login করুন। **আগের সাইটের সংবাদ আনুন** চাপলে ২১টি পুরনো সংবাদ ডেটাবেসে যাবে।

এরপর পোস্ট ও সাইট সেটিংস database-এ সংরক্ষিত হবে। Public visitor শুধু প্রকাশিত পোস্ট পড়তে পারবে; পরিবর্তন করতে পারবে শুধু `admins` তালিকার user।

## লোকালি চালানো

`.env.local` ফাইলে উপরের দুই environment variable দিন, তারপর:

```sh
npm install
npm run dev
```

Backend variables না থাকলে সাইট migrated content দেখায়, আর `/admin` backend connection-এর নির্দেশনা দেখায়।
