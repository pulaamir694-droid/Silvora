# SQL إضافي — شغّله في SQL Editor

## 1. جدول نقاط العملاء
```sql
create table if not exists customer_points (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  email text,
  points integer default 0,
  updated_at timestamp default now()
);

alter table customer_points enable row level security;

create policy "Users read own points"
on customer_points for select
using (auth.uid() = user_id);

create policy "Users upsert own points"
on customer_points for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Service role all"
on customer_points for all
using (true)
with check (true);
```

## 2. جدول إعدادات الموقع
```sql
create table if not exists site_settings (
  id integer primary key default 1,
  settings jsonb default '{}',
  updated_at timestamp default now()
);

alter table site_settings enable row level security;

create policy "Public read settings"
on site_settings for select
using (true);

create policy "Auth write settings"
on site_settings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
```

## 3. تحديث جدول الأوردرات
```sql
alter table orders
  add column if not exists payment_method text default 'cod',
  add column if not exists receipt_url text,
  add column if not exists user_id uuid,
  add column if not exists customization_fee numeric default 0,
  add column if not exists free_shipping_reason text,
  add column if not exists subtotal numeric,
  add column if not exists deposit_amount numeric default 0;

-- Policy للأوردرات
alter table orders enable row level security;

create policy "Anyone insert orders"
on orders for insert with check (true);

create policy "Auth manage orders"
on orders for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "User read own orders"
on orders for select
using (auth.uid() = user_id);
```

## 4. Storage policy للإيصالات
```sql
create policy "Auth upload receipts"
on storage.objects for insert
with check (bucket_id = 'images' AND auth.role() = 'authenticated');
```
