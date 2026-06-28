-- Ejecutar en Supabase SQL Editor.
-- Optimiza el Dashboard: una sola llamada RPC devuelve KPIs, graficas, ranking y ventas recientes.

create index if not exists idx_ventas_company_created_at
  on public.ventas (company_id, created_at desc);

create index if not exists idx_ventas_company_user
  on public.ventas (company_id, user_id);

create index if not exists idx_venta_items_venta_id
  on public.venta_items (venta_id);

create index if not exists idx_venta_items_producto_id
  on public.venta_items (producto_id);

create index if not exists idx_productos_company_stock
  on public.productos (company_id, stock);

create index if not exists idx_company_members_company_user
  on public.company_members (company_id, user_id);

create or replace function public.get_dashboard_summary(p_company_id uuid)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  v_today date := current_date;
  v_since timestamptz := date_trunc('day', now()) - interval '6 days';
  v_result jsonb;
begin
  with recent_ventas as (
    select
      v.id,
      v.total,
      v.created_at,
      v.user_id,
      v.cliente_id,
      v.manual_name,
      c.nombre as cliente_nombre
    from public.ventas v
    left join public.clientes c on c.id = v.cliente_id
    where v.company_id = p_company_id
      and v.created_at >= v_since
  ),
  today_stats as (
    select
      coalesce(sum(total), 0) as revenue,
      count(*)::int as transactions
    from public.ventas
    where company_id = p_company_id
      and created_at >= v_today::timestamptz
      and created_at < (v_today + 1)::timestamptz
  ),
  profit_stats as (
    select
      coalesce(sum(vi.precio_unitario * vi.cantidad), 0) as revenue,
      coalesce(sum(coalesce(p.costo, vi.precio_unitario * 0.4) * vi.cantidad), 0) as cost
    from public.venta_items vi
    join public.ventas v on v.id = vi.venta_id
    left join public.productos p on p.id = vi.producto_id
    where v.company_id = p_company_id
  ),
  low_stock as (
    select coalesce(jsonb_agg(item order by (item->>'stock')::numeric asc), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'stock', p.stock,
        'stock_minimo', coalesce(p.stock_minimo, 10)
      ) as item
      from public.productos p
      where p.company_id = p_company_id
        and p.stock <= coalesce(p.stock_minimo, 10)
      order by p.stock asc, p.nombre asc
      limit 20
    ) s
  ),
  sales_history as (
    select coalesce(jsonb_agg(jsonb_build_object('date', to_char(d.day, 'DD/MM'), 'Ventas', coalesce(v.total, 0)) order by d.day), '[]'::jsonb) as items
    from generate_series(v_today - 6, v_today, interval '1 day') as d(day)
    left join (
      select created_at::date as sale_day, round(sum(total)::numeric, 2) as total
      from recent_ventas
      group by created_at::date
    ) v on v.sale_day = d.day::date
  ),
  top_products as (
    select coalesce(jsonb_agg(item order by (item->>'Cantidad')::int desc), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'id', p.id,
        'name', case when length(coalesce(p.nombre, 'Desconocido')) > 15 then substring(coalesce(p.nombre, 'Desconocido') from 1 for 15) || '...' else coalesce(p.nombre, 'Desconocido') end,
        'Cantidad', sum(vi.cantidad)::int,
        'Ingresos', round(sum(vi.precio_unitario * vi.cantidad)::numeric, 2)
      ) as item
      from public.venta_items vi
      join recent_ventas rv on rv.id = vi.venta_id
      left join public.productos p on p.id = vi.producto_id
      group by p.id, p.nombre
      order by sum(vi.cantidad) desc
      limit 5
    ) s
  ),
  seller_leaderboard as (
    select coalesce(jsonb_agg(item order by (item->>'amount')::numeric desc), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'name', coalesce(pr.full_name, pr.email, 'Admin'),
        'amount', coalesce(sum(v.total), 0),
        'count', count(v.id)::int,
        'role', cm.role
      ) as item
      from public.company_members cm
      left join public.profiles pr on pr.id = cm.user_id
      left join public.ventas v on v.company_id = cm.company_id and v.user_id = cm.user_id
      where cm.company_id = p_company_id
      group by cm.user_id, cm.role, pr.full_name, pr.email
    ) s
  ),
  recent_sales as (
    select coalesce(jsonb_agg(item order by (item->>'created_at') desc), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'id', rv.id,
        'total', rv.total,
        'created_at', rv.created_at,
        'user_id', rv.user_id,
        'cliente_id', rv.cliente_id,
        'manual_name', rv.manual_name,
        'cliente', case when rv.cliente_nombre is null then null else jsonb_build_object('nombre', rv.cliente_nombre) end,
        'vendedor', case when pr.id is null then null else jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'email', pr.email) end
      ) as item
      from recent_ventas rv
      left join public.profiles pr on pr.id = rv.user_id
      order by rv.created_at desc
      limit 4
    ) s
  )
  select jsonb_build_object(
    'todayRevenue', ts.revenue,
    'todayTransactions', ts.transactions,
    'netProfit', ps.revenue - ps.cost,
    'profitMarginPercent', case when ps.revenue > 0 then round(((ps.revenue - ps.cost) / ps.revenue) * 100)::int else 0 end,
    'lowStockItems', ls.items,
    'salesHistoryData', sh.items,
    'topProductsData', tp.items,
    'sellerLeaderboard', sl.items,
    'recentSales', rs.items
  )
  into v_result
  from today_stats ts
  cross join profit_stats ps
  cross join low_stock ls
  cross join sales_history sh
  cross join top_products tp
  cross join seller_leaderboard sl
  cross join recent_sales rs;

  return v_result;
end;
$$;

notify pgrst, 'reload schema';