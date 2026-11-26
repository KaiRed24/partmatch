-- PartMatch schema. Run in the Supabase SQL editor (or `supabase db push`).
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  name text not null,
  category text not null check (category in (
    'ceramic_disc_cartridge','mixer_cartridge','thermostatic_cartridge',
    'flush_valve','fill_valve','seat_hinge')),
  brand text,
  compatible_with text[] default '{}',
  attributes jsonb not null default '{}',
  returnable boolean default true,
  restocking_fee boolean default false,
  description text,
  price_gbp numeric(8,2),             -- fictional
  embedding vector(1536)
);

create table if not exists stock (
  product_id uuid primary key references products(id) on delete cascade,
  qty_on_hand int not null default 0,
  supplier_lead_days int,             -- null + qty 0 = discontinued
  replacement_product_id uuid references products(id),
  updated_at timestamptz default now()
);

create table if not exists identifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  fitting_type text,
  image_paths text[],
  extracted jsonb,
  answers jsonb,
  candidates jsonb,
  chosen_product_id uuid references products(id),
  confidence numeric,
  rounds int default 0,
  handed_off boolean default false
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  identification_id uuid references identifications(id),
  customer_name text,
  customer_email text,
  notes text,
  status text default 'open' check (status in ('open','resolved')),
  resolved_product_id uuid references products(id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique,
  customer_name text,
  customer_email text,
  product_id uuid references products(id),
  status text default 'processing' check (status in
    ('processing','delayed','dispatched','part_shipped','refunded')),
  promised_date date,
  revised_date date,
  customer_choice text check (customer_choice in ('wait','part_ship','refund')),
  choice_token text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  type text,
  sent_at timestamptz default now(),
  payload jsonb
);

-- All access goes through server routes using the service role key.
-- RLS on with no policies = the anon key can read/write nothing.
alter table products enable row level security;
alter table stock enable row level security;
alter table identifications enable row level security;
alter table tickets enable row level security;
alter table orders enable row level security;
alter table notifications enable row level security;

-- Vector search with an optional category filter.
create or replace function match_products(
  query_embedding vector(1536),
  filter_category text default null,
  match_count int default 8
)
returns table (
  id uuid, product_code text, name text, category text, brand text,
  attributes jsonb, similarity float
)
language sql stable as $$
  select p.id, p.product_code, p.name, p.category, p.brand, p.attributes,
         1 - (p.embedding <=> query_embedding) as similarity
  from products p
  where p.embedding is not null
    and (filter_category is null or p.category = filter_category)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Private bucket for customer photos (served via signed URLs).
insert into storage.buckets (id, name, public)
values ('part-photos', 'part-photos', false)
on conflict (id) do nothing;
