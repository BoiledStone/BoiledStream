-- BoiledStream: définir les comptes qui doivent afficher le badge [admin].
-- Remplacer les emails ci-dessous par ton email et celui de ton ami.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  drop constraint if exists admin_users_user_id_fkey;

alter table public.admin_users
  add constraint admin_users_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.admin_users enable row level security;

grant select on public.admin_users to anon, authenticated;
revoke insert, update, delete on public.admin_users from anon, authenticated;

drop policy if exists "Admin markers are readable by everyone" on public.admin_users;
create policy "Admin markers are readable by everyone"
on public.admin_users for select
to anon, authenticated
using (true);

select id, email
from auth.users
order by created_at desc;

insert into public.admin_users (user_id)
select auth.users.id
from auth.users
where auth.users.email in (
  'ton-email@example.com',
  'email-de-ton-ami@example.com'
)
on conflict (user_id) do nothing;

select auth.users.email, public.admin_users.user_id
from public.admin_users
join auth.users on auth.users.id = public.admin_users.user_id
order by auth.users.email;

notify pgrst, 'reload schema';
