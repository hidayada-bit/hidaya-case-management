// ============================================================
// ROLES & PERMISSIONS — single source of truth for the UI.
// To change what a team can do, edit ROLE_PERMISSIONS below.
// NOTE: this only controls what the UI shows. Real enforcement is
// done by the database (see supabase/migrations/002_roles_payments.sql),
// so keep both in sync when you change a role.
// ============================================================

export const ROLES = {
  admin:               { label: 'Administrator',       desc: 'Full access, approves staff, manages roles' },
  director:            { label: 'Director',            desc: 'Views everything, reports and payments (read-only)' },
  finance:             { label: 'Finance',             desc: 'Manages payments and bank lists; views beneficiaries' },
  project_coordinator: { label: 'Project Coordinator', desc: 'Manages beneficiaries, academics and messaging' },
  data_collector:      { label: 'Data Collector',      desc: 'Registers and updates beneficiaries and documents' },
}

export const ASSIGNABLE_ROLES = Object.keys(ROLES)

// Permission keys used across the app
//  view_families, edit_families, delete_families, view_payments, manage_payments,
//  view_bank_list, send_messages, view_stats, manage_users
const ALL = ['view_families', 'edit_families', 'delete_families', 'view_payments', 'manage_payments', 'view_bank_list', 'send_messages', 'view_stats', 'manage_users']

export const ROLE_PERMISSIONS = {
  admin: ALL,
  director: ['view_families', 'view_payments', 'view_bank_list', 'view_stats'],
  finance: ['view_families', 'view_payments', 'manage_payments', 'view_bank_list', 'view_stats'],
  project_coordinator: ['view_families', 'edit_families', 'view_payments', 'send_messages', 'view_stats'],
  data_collector: ['view_families', 'edit_families'],
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
  settings: null, // everyone
}

export const canOpenPage = (role, page) => {
  const perm = PAGE_PERMISSION[page]
  return perm === undefined || perm === null ? true : can(role, perm)
}

export const roleLabel = r => ROLES[r]?.label || r || '—'
