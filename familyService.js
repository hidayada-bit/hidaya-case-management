// ============================================================
// FAMILY SERVICE — All Supabase database operations
// Currently uses mock data. To switch to live Supabase:
//   1. Fill in your .env credentials
//   2. Replace each mock function with the Supabase version below it
// ============================================================

import { supabase, BUCKETS } from './supabase'
import { uploadFile, deleteFile } from './imageUtils'

// ── FAMILIES ─────────────────────────────────────────────────

/**
 * Fetch all families, ordered by most recently created.
 * Includes children count via subquery.
 */
export async function fetchFamilies() {
  const { data, error } = await supabase
    .from('families')
    .select(`
      *,
      children_count: children(count)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Flatten the count
  return data.map(f => ({
    ...f,
    children_count: f.children_count?.[0]?.count ?? 0,
  }))
}

/**
 * Fetch a single family by ID.
 */
export async function fetchFamily(id) {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Create a new family.
 * If photoFile is provided, it uploads to storage first.
 */
export async function createFamily({ formData, photoFile, userId }) {
  let mother_photo_url = null

  if (photoFile) {
    const path = `${formData.family_code}/mother.jpg`
    mother_photo_url = await uploadFile({
      supabase,
      file: photoFile,
      bucket: BUCKETS.MOTHER_PHOTOS,
      path,
      type: 'photo',
    })
  }

  const { data, error } = await supabase
    .from('families')
    .insert([{
      family_code:      formData.code,
      roll_number:      formData.roll,
      mother_name:      formData.mother_name,
      mother_id_number: formData.mother_id,
      phone_number:     formData.phone,
      alternate_phone:  formData.alt_phone,
      address:          formData.address,
      city:             formData.city,
      district:         formData.district,
      notes:            formData.notes,
      status:           formData.status,
      mother_photo_url,
      created_by:       userId,
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Update an existing family.
 */
export async function updateFamily({ id, formData, photoFile, familyCode }) {
  let updates = {
    family_code:      formData.code,
    roll_number:      formData.roll,
    mother_name:      formData.mother_name,
    mother_id_number: formData.mother_id,
    phone_number:     formData.phone,
    alternate_phone:  formData.alt_phone,
    address:          formData.address,
    city:             formData.city,
    district:         formData.district,
    notes:            formData.notes,
    status:           formData.status,
  }

  if (photoFile) {
    const path = `${familyCode}/mother.jpg`
    updates.mother_photo_url = await uploadFile({
      supabase,
      file: photoFile,
      bucket: BUCKETS.MOTHER_PHOTOS,
      path,
      type: 'photo',
    })
  }

  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Delete a family and all related storage files.
 */
export async function deleteFamily(id) {
  const { error } = await supabase
    .from('families')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── CHILDREN ─────────────────────────────────────────────────

/**
 * Fetch all children for a family.
 */
export async function fetchChildren(familyId) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', familyId)
    .order('date_of_birth', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Create a child with optional photo, birth cert, school cert.
 */
export async function createChild({ formData, familyCode, photoFile, birthCertFile, schoolCertFile, userId }) {
  let child_photo_url = null

  if (photoFile) {
    const path = `${familyCode}/${formData.name.replace(/\s+/g, '-')}-photo.jpg`
    child_photo_url = await uploadFile({
      supabase,
      file: photoFile,
      bucket: BUCKETS.CHILD_PHOTOS,
      path,
      type: 'photo',
    })
  }

  const { data: child, error } = await supabase
    .from('children')
    .insert([{
      family_id:      formData.family_id,
      child_name:     formData.name,
      gender:         formData.gender,
      date_of_birth:  formData.dob,
      grade:          formData.grade,
      school_name:    formData.school,
      medical_notes:  formData.medical_notes,
      child_photo_url,
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Upload documents if provided
  const docUploads = []

  if (birthCertFile) {
    docUploads.push(uploadDocument({
      supabase, file: birthCertFile,
      familyId: formData.family_id, childId: child.id,
      documentType: 'Birth Certificate',
      familyCode, userId,
    }))
  }

  if (schoolCertFile) {
    docUploads.push(uploadDocument({
      supabase, file: schoolCertFile,
      familyId: formData.family_id, childId: child.id,
      documentType: 'School Certificate',
      familyCode, userId,
    }))
  }

  if (docUploads.length) await Promise.all(docUploads)

  return child
}

/**
 * Update a child record.
 */
export async function updateChild({ id, formData, familyCode, photoFile }) {
  let updates = {
    child_name:    formData.name,
    gender:        formData.gender,
    date_of_birth: formData.dob,
    grade:         formData.grade,
    school_name:   formData.school,
    medical_notes: formData.medical_notes,
  }

  if (photoFile) {
    const path = `${familyCode}/${formData.name.replace(/\s+/g, '-')}-photo.jpg`
    updates.child_photo_url = await uploadFile({
      supabase, file: photoFile,
      bucket: BUCKETS.CHILD_PHOTOS, path, type: 'photo',
    })
  }

  const { data, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Delete a child.
 */
export async function deleteChild(id) {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── DOCUMENTS ─────────────────────────────────────────────────

/**
 * Fetch all documents for a family.
 */
export async function fetchDocuments(familyId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('family_id', familyId)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Upload a document file to storage and save metadata to DB.
 */
export async function uploadDocument({ supabase, file, familyId, childId = null, documentType, familyCode, userId, onProgress }) {
  const slug = documentType.toLowerCase().replace(/\s+/g, '-')
  const childSlug = childId ? `child-${childId.slice(0, 8)}-` : ''
  const path = `${familyCode}/${childSlug}${slug}.jpg`

  const file_url = await uploadFile({
    supabase, file,
    bucket: BUCKETS.DOCUMENTS,
    path, type: 'document',
    onProgress,
  })

  const { data, error } = await supabase
    .from('documents')
    .insert([{
      family_id:     familyId,
      child_id:      childId,
      document_type: documentType,
      file_url,
      file_name:     file.name,
      file_size_kb:  Math.round(file.size / 1024),
      uploaded_by:   userId,
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Delete a document record and its storage file.
 */
export async function deleteDocument({ id, fileUrl }) {
  // Extract storage path from URL
  const url = new URL(fileUrl)
  const pathParts = url.pathname.split('/storage/v1/object/public/')
  if (pathParts[1]) {
    const [bucket, ...rest] = pathParts[1].split('/')
    await deleteFile({ supabase, bucket, path: rest.join('/') })
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── AUTH ──────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Sign out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/**
 * Get the current logged-in user with their role from the users table.
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return { ...user, ...profile }
}

/**
 * Send password reset email.
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(error.message)
}
