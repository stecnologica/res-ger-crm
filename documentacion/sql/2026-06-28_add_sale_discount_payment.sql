-- Ejecutar en Supabase SQL Editor.
-- Agrega los datos comerciales que el POS envia al registrar una venta.

alter table public.ventas
  add column if not exists descuento numeric(12, 2) not null default 0,
  add column if not exists metodo_pago text not null default 'efectivo';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_metodo_pago_check'
      and conrelid = 'public.ventas'::regclass
  ) then
    alter table public.ventas
      add constraint ventas_metodo_pago_check
      check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia'));
  end if;
end $$;

comment on column public.ventas.descuento is 'Monto descontado en la venta, calculado por el POS.';
comment on column public.ventas.metodo_pago is 'Metodo de pago usado en la venta: efectivo, tarjeta o transferencia.';

-- Refresca el cache de esquema de PostgREST/Supabase para que el frontend vea las nuevas columnas.
notify pgrst, 'reload schema';