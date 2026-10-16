// ============================================================
// ROLES & PERMISSIONS — single source of truth for the UI.
// To change what a team can do, edit ROLE_PERMISSIONS below.
// NOTE: this only controls what the UI shows. Real enforcement is
// done by the database (see supabase/migrations/002_roles_payments.sql),
// so keep both in sync when you change a role.
// ============================================================

export const ROLES = {
  admin:               { label: 'Administrator',       desc: 'Full access, approves staff and data collector submissions, manages roles' },
  director:            { label: 'Director',            desc: 'Views everything, reports, payments and submissions; can register families, send messages, put families on hold and upload agreements' },
  finance:             { label: 'Finance',             desc: 'Manages payments and bank lists; views approved beneficiaries' },
  project_coordinator: { label: 'Project Coordinator', desc: 'Manages beneficiaries, academics and messaging; sees data collector submissions' },
  data_collector:      { label: 'Data Collector',      desc: 'Registers new families for approval; cannot see stored data. Can edit a submission only until it is approved' },
}

export const ASSIGNABLE_ROLES = Object.keys(ROLES)

// Permission keys used across the app
//  view_families, edit_families, delete_families, view_payments, manage_payments,
//  view_bank_list, send_messages, view_stats, manage_users,
//  view_case_status (see hold/transfer info + Transferred page), manage_holds (put on hold / release),
//  view_approvals (see data collector submissions), approve_submissions (approve / return them — admin only),
//  submit_data (data collector: register families for approval + "My Submissions")
//  add_families (director: register a new family directly), view_agreements / manage_agreements (scanned agreements page: view / upload)
const ALL = ['view_families', 'edit_families', 'delete_families', 'view_payments', 'manage_payments', 'view_bank_list', 'send_messages', 'view_stats', 'manage_users', 'view_case_status', 'manage_holds', 'view_approvals', 'approve_submissions', 'add_families', 'view_agreements', 'manage_agreements']

export const ROLE_PERMISSIONS = {
  admin: ALL,
  director: ['view_families', 'add_families', 'view_payments', 'view_bank_list', 'send_messages', 'view_stats', 'view_case_status', 'manage_holds', 'view_approvals', 'view_agreements', 'manage_agreements'],
  finance: ['view_families', 'view_payments', 'manage_payments', 'view_bank_list', 'view_stats', 'view_case_status', 'view_agreements'],
  project_coordinator: ['view_families', 'edit_families', 'view_payments', 'send_messages', 'view_stats', 'view_case_status', 'view_approvals', 'view_agreements'],
  // Data collectors never see stored data: they only register families and follow their own submissions.
  data_collector: ['submit_data'],
}

export const can = (role, perm) => (ROLE_PERMISSIONS[role] || []).includes(perm)

// Which sidebar pages each permission unlocks
export const PAGE_PERMISSION = {
  dashboard: 'view_families',
  families: 'view_families',
  projects: 'view_families',
  messaging: 'send_messages',
  analytics: 'view_stats',
  academics: 'view_stats',
  banklist: 'view_bank_list',
  payments: 'view_payments',
  users: 'manage_users',
  archive: 'view_case_status', // everyone except data collector
  agreements: 'view_agreements', // admin, director, finance, project coordinator (only admin + director upload)
  approvals: 'view_approvals', // admin, director, project coordinator (only admin can approve)
  register: 'submit_data',     // data collector
  mysubs: 'submit_data',       // data collector
  settings: null, // everyone
}

export const canOpenPage = (role, page) => {
  const perm = PAGE_PERMISSION[page]
  return perm === undefined || perm === null ? true : can(role, perm)
}

// Page a user lands on after signing in
export const homePage = role => (role === 'data_collector' ? 'mysubs' : 'dashboard')

export const roleLabel = r => ROLES[r]?.label || r || '—'
