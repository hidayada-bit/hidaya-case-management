-- Allow "Death Certificate" as a document type.
-- Run in Supabase -> SQL Editor -> New query.
alter table public.documents drop constraint if exists documents_document_type_check;

alter table public.documents add constraint documents_document_type_check
  check (document_type in (
    'Birth Certificate',
    'Death Certificate',
    'School Certificate',
    'Mother ID',
    'Bank Book',
    'Family Photo',
    'Medical Record',
    'Other'
  ));
