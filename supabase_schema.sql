-- ============================================================================
-- Estim' — schéma pour comptes payants, quotas et pubs récompensées
-- À exécuter dans Supabase > SQL Editor
-- ============================================================================

-- Table "profiles": une ligne par utilisateur inscrit, en complément de
-- auth.users. Stocke tout ce qui concerne l'abonnement et les quotas.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Stripe
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'gratuit' check (plan in ('gratuit', 'debutant', 'pro', 'premium')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'past_due', 'canceled')),

  -- Quota de l'abonnement en cours (rempli depuis les metadata du prix Stripe)
  quota_mensuel integer not null default 0,
  periode_debut timestamptz,
  periode_fin timestamptz,

  -- Compteurs d'utilisation du mois en cours (remis à zéro à chaque renouvellement)
  estimations_utilisees integer not null default 0,

  -- Pubs récompensées pour les abonnés: 1 estimation bonus toutes les
  -- ESTIMATIONS_PAR_PUB (voir worker.js) vraies estimations consommées.
  estimations_depuis_derniere_pub integer not null default 0,
  bonus_pub_disponible boolean not null default false,

  -- Free tier: 3 offertes + jusqu'à 3 en regardant une pub (max 6/mois),
  -- remis à zéro chaque mois calendaire pour les comptes sans abonnement payant.
  gratuit_utilisees integer not null default 0,
  gratuit_pubs_vues integer not null default 0,
  gratuit_periode_debut timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Chaque utilisateur ne voit / modifie que sa propre ligne.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Pas de policy INSERT/UPDATE/DELETE pour les utilisateurs: toutes les
-- écritures sensibles (quotas, abonnement) passent par le Worker via la
-- clé service_role, qui contourne RLS. Ça empêche un utilisateur de se
-- donner lui-même des crédits illimités en modifiant sa ligne.

-- Création automatique d'une ligne "profiles" à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pour les comptes déjà existants (créés avant cette migration).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Index utiles pour le Worker (recherche par client/abonnement Stripe).
create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription on public.profiles(stripe_subscription_id);

-- ============================================================================
-- Fonction consume_estimation(): appelée par le front (supabase.rpc) à
-- chaque tentative d'estimation pour un utilisateur CONNECTÉ. Vérifie et
-- décrémente le quota de façon atomique côté serveur (impossible à
-- tricher depuis le navigateur, contrairement à un compteur en local).
--
-- Règles:
-- - Abonné actif (debutant/pro/premium): quota_mensuel prioritaire, puis
--   1 estimation bonus toutes les 4 vraies estimations si une pub a été
--   regardée (p_watched_ad = true) ET qu'un bonus est disponible.
-- - Compte gratuit (connecté, sans abonnement): 3 offertes + jusqu'à 3 via
--   pub, remis à zéro chaque mois calendaire.
--
-- Retourne un JSON: {allowed, source, remaining, reason}
-- ============================================================================
create or replace function public.consume_estimation(p_watched_ad boolean default false)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  prof public.profiles%rowtype;
  result jsonb;
begin
  select * into prof from public.profiles where id = auth.uid() for update;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profil_introuvable');
  end if;

  -- Abonné avec un abonnement actif
  if prof.plan <> 'gratuit' and prof.subscription_status = 'active' then
    if prof.estimations_utilisees < prof.quota_mensuel then
      update public.profiles set
        estimations_utilisees = estimations_utilisees + 1,
        estimations_depuis_derniere_pub = estimations_depuis_derniere_pub + 1,
        bonus_pub_disponible = (estimations_depuis_derniere_pub + 1) >= 4,
        updated_at = now()
      where id = auth.uid();
      return jsonb_build_object(
        'allowed', true, 'source', 'quota',
        'remaining', prof.quota_mensuel - prof.estimations_utilisees - 1
      );
    elsif prof.bonus_pub_disponible and p_watched_ad then
      update public.profiles set
        estimations_depuis_derniere_pub = 0,
        bonus_pub_disponible = false,
        updated_at = now()
      where id = auth.uid();
      return jsonb_build_object('allowed', true, 'source', 'bonus_pub', 'remaining', 0);
    else
      return jsonb_build_object(
        'allowed', false, 'reason', 'quota_epuise',
        'bonus_pub_disponible', prof.bonus_pub_disponible
      );
    end if;
  end if;

  -- Compte gratuit: reset mensuel calendaire
  if prof.gratuit_periode_debut < date_trunc('month', now()) then
    update public.profiles set
      gratuit_utilisees = 0,
      gratuit_pubs_vues = 0,
      gratuit_periode_debut = now(),
      updated_at = now()
    where id = auth.uid();
    prof.gratuit_utilisees := 0;
    prof.gratuit_pubs_vues := 0;
  end if;

  if prof.gratuit_utilisees < 3 then
    update public.profiles set
      gratuit_utilisees = gratuit_utilisees + 1,
      updated_at = now()
    where id = auth.uid();
    return jsonb_build_object('allowed', true, 'source', 'gratuit', 'remaining', 3 - prof.gratuit_utilisees - 1);
  elsif prof.gratuit_pubs_vues < 3 and p_watched_ad then
    update public.profiles set
      gratuit_pubs_vues = gratuit_pubs_vues + 1,
      updated_at = now()
    where id = auth.uid();
    return jsonb_build_object('allowed', true, 'source', 'gratuit_pub', 'remaining', 3 - prof.gratuit_pubs_vues - 1);
  else
    return jsonb_build_object(
      'allowed', false, 'reason', 'gratuit_epuise',
      'pubs_restantes', greatest(0, 3 - prof.gratuit_pubs_vues)
    );
  end if;
end;
$$;

grant execute on function public.consume_estimation(boolean) to authenticated;
