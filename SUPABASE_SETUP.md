# Supabase Setup — Silvora

## ✅ الجداول المطلوبة

شغّل الـ SQL ده كله دفعة واحدة في **SQL Editor**:

```sql
-- 1. المنتجات
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  old_price numeric,
  description text,
  category text,
  customization_type text default 'none',
  images text[],
  created_at timestamp default now()
);
alter table products enable row level security;
create policy "Public read products" on products for select using (true);
create policy "Auth manage products" on products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2. الأوردرات
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  customer jsonb,
  items jsonb,
  total numeric,
  subtotal numeric,
  status text default 'new',
  governorate text,
  shipping_fee numeric,
  customization_fee numeric default 0,
  payment_method text default 'cod',
  deposit_amount numeric default 0,
  receipt_url text,
  user_id uuid,
  free_shipping_reason text,
  created_at timestamp default now()
);
alter table orders enable row level security;
create policy "Anyone insert orders" on orders for insert with check (true);
create policy "Auth manage orders" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "User read own orders" on orders for select using (auth.uid() = user_id);

-- 3. الشحن
create table if not exists shipping (
  id serial primary key,
  name text,
  fee numeric
);
alter table shipping enable row level security;
create policy "Public read shipping" on shipping for select using (true);
create policy "Auth manage shipping" on shipping for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4. نقاط العملاء
create table if not exists customer_points (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  email text,
  points integer default 0,
  updated_at timestamp default now()
);
alter table customer_points enable row level security;
create policy "Anyone read points" on customer_points for select using (true);
create policy "Anyone insert points" on customer_points for insert with check (true);
create policy "Anyone update points" on customer_points for update using (true);

-- 5. إعدادات الموقع
create table if not exists site_settings (
  id integer primary key default 1,
  settings jsonb default '{}',
  updated_at timestamp default now()
);
alter table site_settings enable row level security;
create policy "Public read settings" on site_settings for select using (true);
create policy "Auth write settings" on site_settings for insert with check (true);
create policy "Auth update settings" on site_settings for update using (true);
```

## ✅ Storage

- روح **Storage → New bucket**
- اسمه: `images`
- فعّل **Public bucket**

```sql
create policy "Public read images" on storage.objects for select using (bucket_id = 'images');
create policy "Auth upload images" on storage.objects for insert with check (bucket_id = 'images');
```

## ✅ ملف .env

الملف موجود جاهز في المشروع باسم `.env` — لو رفعت على Netlify/Vercel ضيف المتغيرات هناك:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

## ✅ إصلاح رفع الصور للضيف

شغّل ده في SQL Editor:
```sql
-- السماح لأي حد برفع صور (ضيف أو مسجّل)
drop policy if exists "Auth upload images" on storage.objects;
create policy "Anyone upload images"
on storage.objects for insert
with check (bucket_id = 'images');
```

## ✅ إضافة أسعار الفضي والدهبي

```sql
alter table products
  add column if not exists silver_price numeric,
  add column if not exists gold_price numeric;
```
