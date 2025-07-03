-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Function to generate random token
create or replace function public.generate_token()
returns text as $$
begin
  return encode(gen_random_bytes(32), 'hex');
end;
$$ language plpgsql; 