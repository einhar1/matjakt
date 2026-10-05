-- Preserve production catalog NULLs without inventing product information or coordinates.
-- Both schemas keep catalog RLS/grants; only nullable app-facing fields change.
alter table public.products
  alter column product_information drop not null,
  alter column ingredients drop not null,
  alter column is_alcohol drop not null;
alter table coop.products
  alter column product_information drop not null,
  alter column ingredients drop not null,
  alter column is_alcohol drop not null;
alter table public.stores alter column lat drop not null, alter column lon drop not null;
alter table coop.stores alter column lat drop not null, alter column lon drop not null;
