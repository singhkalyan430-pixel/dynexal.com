-- Dynexal Certification V1
-- Apply through Supabase SQL editor after review.
-- Correct answers must remain server-side and should not be selected by public exam endpoints.

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  question_count integer not null default 50,
  passing_percentage numeric(5,2) not null default 70,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.certification_questions (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  explanation text,
  topic text,
  difficulty text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id),
  candidate_name text not null,
  candidate_email text not null,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score_percentage numeric(5,2),
  passed boolean,
  status text not null default 'started',
  created_at timestamptz not null default now()
);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.certification_questions(id),
  selected_option text,
  is_correct boolean,
  created_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique not null references public.exam_attempts(id),
  certificate_number text unique not null,
  candidate_name text not null,
  certification_name text not null,
  issued_at timestamptz not null default now(),
  status text not null default 'VALID',
  verification_hash text unique
);

create index if not exists idx_cert_questions_certification
  on public.certification_questions(certification_id);

create index if not exists idx_exam_attempts_email
  on public.exam_attempts(lower(candidate_email));

create index if not exists idx_certificates_number
  on public.certificates(certificate_number);
