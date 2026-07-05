alter table public.requests
  add column if not exists cancelled_by text
    check (cancelled_by in ('owner', 'sitter')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_credit_outcome text
    check (cancellation_credit_outcome in ('owner_refunded', 'sitter_paid'));

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (
    notification_type in (
      'direct_request_received',
      'application_received',
      'application_accepted',
      'message_received',
      'review_received',
      'request_completed',
      'request_cancelled'
    )
  );
