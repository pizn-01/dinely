alter table public.organizations
  add column if not exists booking_pause jsonb not null default
  '{"guestEnabled":false,"loggedInEnabled":false,"dates":[]}'::jsonb;

comment on column public.organizations.booking_pause is
  'Customer booking pause settings for selected dates and audience types.';
