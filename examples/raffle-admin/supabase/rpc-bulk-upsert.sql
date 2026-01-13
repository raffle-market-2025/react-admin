-- Bulk upsert country roles for a user (superadmin only)
-- items format: [{"country2":"UA","role":"admin"},{"country2":"US","role":"viewer"}]
-- _replace=true  => удалит у пользователя все country-roles, которых нет в payload

create or replace function public.set_user_country_roles_bulk(
  _user_id uuid,
  _items jsonb,
  _replace boolean default false
)
returns table(country2 text, role public.app_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super boolean;
  v_keep text[] := '{}'::text[];
  v_bad jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- superadmin check (под вашу схему; оставляю как было)
  select exists (
    select 1
    from public.user_global_roles ugr
    join public.app_users au on au.id = ugr.user_id
    where au.auth_user_id = auth.uid()
      and ugr.role = 'superadmin'
  ) into v_is_super;

  if not v_is_super then
    raise exception 'forbidden';
  end if;

  if _user_id is null then
    raise exception 'user_id_required';
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' then
    raise exception 'items_must_be_array';
  end if;

  /*
    1) Валидация payload:
       - country2 обязателен и должен быть в countries.alpha2
       - role ∈ viewer|operator|admin
       - если есть дубликаты country2 — "последний в массиве выигрывает"
       При наличии ошибок — бросаем exception с json-списком проблемных элементов.
  */
  with inp as (
    select
      upper(nullif(trim(e->>'country2'), '')) as country2,
      nullif(trim(e->>'role'), '') as role_txt,
      ord::int as ord
    from jsonb_array_elements(_items) with ordinality t(e, ord)
  ),
  norm as (
    select
      country2,
      role_txt,
      case role_txt
        when 'viewer' then 'viewer'::public.app_role
        when 'operator' then 'operator'::public.app_role
        when 'admin' then 'admin'::public.app_role
        else null
      end as role,
      ord
    from inp
  ),
  joined as (
    select n.*, (c.alpha2 is not null) as country_ok
    from norm n
    left join public.countries c on c.alpha2 = n.country2
  ),
  bad as (
    select jsonb_agg(
      jsonb_build_object(
        'country2', country2,
        'role', role_txt,
        'ord', ord,
        'reason',
          case
            when country2 is null then 'missing_country2'
            when role is null then 'invalid_role'
            when not country_ok then 'unknown_country2'
            else 'unknown'
          end
      )
    ) as j
    from joined
    where country2 is null or role is null or not country_ok
  )
  select bad.j into v_bad from bad;

  if v_bad is not null then
    raise exception 'invalid_items: %', v_bad;
  end if;

  /*
    2) Список стран, которые должны остаться при _replace=true
  */
  with inp as (
    select
      upper(nullif(trim(e->>'country2'), '')) as country2,
      nullif(trim(e->>'role'), '') as role_txt,
      ord::int as ord
    from jsonb_array_elements(_items) with ordinality t(e, ord)
  ),
  norm as (
    select
      country2,
      case role_txt
        when 'viewer' then 'viewer'::public.app_role
        when 'operator' then 'operator'::public.app_role
        when 'admin' then 'admin'::public.app_role
        else null
      end as role,
      ord
    from inp
  ),
  valid_last as (
    select distinct on (n.country2)
      n.country2,
      n.role
    from norm n
    join public.countries c on c.alpha2 = n.country2
    order by n.country2, n.ord desc
  )
  select coalesce(array_agg(v.country2), '{}'::text[]) into v_keep
  from valid_last v;

  /*
    3) Replace-mode: удалить все роли по странам, которых нет в payload
  */
  if _replace then
    delete from public.user_country_roles ucr
    where ucr.user_id = _user_id
      and not (ucr.country2 = any(v_keep));
  end if;

  /*
    4) Upsert и return
  */
  return query
  with inp as (
    select
      upper(nullif(trim(e->>'country2'), '')) as country2,
      nullif(trim(e->>'role'), '') as role_txt,
      ord::int as ord
    from jsonb_array_elements(_items) with ordinality t(e, ord)
  ),
  norm as (
    select
      country2,
      case role_txt
        when 'viewer' then 'viewer'::public.app_role
        when 'operator' then 'operator'::public.app_role
        when 'admin' then 'admin'::public.app_role
        else null
      end as role,
      ord
    from inp
  ),
  valid_last as (
    select distinct on (n.country2)
      n.country2,
      n.role
    from norm n
    join public.countries c on c.alpha2 = n.country2
    order by n.country2, n.ord desc
  )
  insert into public.user_country_roles(user_id, country2, role)
  select _user_id, v.country2, v.role
  from valid_last v
  on conflict (user_id, country2)
  do update set role = excluded.role, updated_at = now()
  returning user_country_roles.country2, user_country_roles.role;

end $$;

revoke all on function public.set_user_country_roles_bulk(uuid, jsonb, boolean) from public;
grant execute on function public.set_user_country_roles_bulk(uuid, jsonb, boolean) to authenticated;