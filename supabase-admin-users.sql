-- BoiledStream: définir les comptes qui doivent afficher le badge [admin].
-- 1. Exécuter supabase-schema.sql avant ce fichier.
-- 2. Remplacer les emails ci-dessous par ton email et celui de ton ami.

select id, email
from auth.users
order by created_at desc;

insert into public.admin_users (user_id)
select profiles.id
from public.profiles
join auth.users on auth.users.id = profiles.id
where auth.users.email in (
  'ton-email@example.com',
  'email-de-ton-ami@example.com'
)
on conflict (user_id) do nothing;

select auth.users.email, public.admin_users.user_id
from public.admin_users
join auth.users on auth.users.id = public.admin_users.user_id
order by auth.users.email;
