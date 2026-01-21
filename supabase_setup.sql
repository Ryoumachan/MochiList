-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Songs Table
create table public.songs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  artist text not null,
  album text,
  artwork_url text,
  lyrics_snippet text,
  
  original_key text,
  highest_note text,
  highest_chest_note text,
  lowest_note text,
  
  my_key_shift int default 0,
  memo text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (Security)
alter table public.songs enable row level security;

-- Policies (Only allow users to see/edit their own data)
create policy "Users can view their own songs" 
on public.songs for select 
using (auth.uid() = user_id);

create policy "Users can insert their own songs" 
on public.songs for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own songs" 
on public.songs for update 
using (auth.uid() = user_id);

create policy "Users can delete their own songs" 
on public.songs for delete 
using (auth.uid() = user_id);
