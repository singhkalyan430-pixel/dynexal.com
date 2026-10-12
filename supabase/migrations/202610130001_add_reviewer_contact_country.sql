-- Add private reviewer contact and country metadata.
-- Apply this migration before deploying the updated review API.
alter table public.interview_reviews
  add column if not exists reviewer_country text,
  add column if not exists reviewer_contact text;

comment on column public.interview_reviews.reviewer_country is
  'Country voluntarily supplied by the reviewer; private admin metadata, never included in public review responses.';
comment on column public.interview_reviews.reviewer_contact is
  'Optional email or WhatsApp/contact detail voluntarily supplied by the reviewer; private admin metadata, never included in public review responses.';
