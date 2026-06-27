// ─── IMAGE COMPRESSION UTILITY ───────────────────────────────────────────────
// Compresses images in the browser using Canvas API before uploading to Supabase.
// This keeps storage usage low while maintaining visual quality.
//
// Photos (faces): resized to max 800px, quality 82% → ~100–250KB
// Documents (ID, certs): resized to max 1400px, quality 88% → ~200–500KB
// PDFs: passed through as-is (no compression needed)

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB hard limit on originals

/**
 * Compresses an image File using the browser Canvas API.
 * @param {File} file - The original image file from the input
 * @param {object} options
 * @param {number} options.maxWidth - Max width in pixels (height scales automatically)
 * @param {number} options.quality - JPEG quality 0–1 (0.85 = 85%)
 * @param {'photo'|'document'} options.type - Preset: photo or document
 * @returns {Promise<File>} - Compressed File object, same name
 */
export async function compressImage(file, options = {}) {
  // PDFs pass through untouched
  if (file.type === 'application/pdf') {
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`PDF is too large (${formatBytes(file.size)}). Max allowed is 5MB.`)
    }
    return file
  }

  // Must be an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPG, PNG, HEIC) and PDFs are accepted.')
  }

  // Original too large even before compression
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File is too large (${formatBytes(file.size)}). Max allowed is 5MB.`)
  }

  // Set defaults based on type
  const isDocument = options.type === 'document'
  const maxWidth = options.maxWidth || (isDocument ? 1400 : 800)
  const quality = options.quality || (isDocument ? 0.88 : 0.82)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Calculate new dimensions, keeping aspect ratio
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      // Draw onto canvas at new size
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Export as JPEG (smaller than PNG, still high quality)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed. Please try a different image.'))
            return
          }
          // Return as File with original name but .jpg extension
          const compressedName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
          const compressedFile = new File([blob], compressedName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read the image file. Please try again.'))
    }

    img.src = objectUrl
  })
}

/**
 * Upload a file to Supabase Storage with compression.
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase
 * @param {File} params.file - Raw file from input
 * @param {string} params.bucket - Supabase storage bucket name
 * @param {string} params.path - Storage path e.g. 'FM001/mother.jpg'
 * @param {'photo'|'document'} params.type - Compression preset
 * @param {function} params.onProgress - Called with % 0–100 (approximate)
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function uploadFile({ supabase, file, bucket, path, type = 'photo', onProgress }) {
  onProgress?.(10)

  // Step 1: Compress
  let fileToUpload
  try {
    fileToUpload = await compressImage(file, { type })
    onProgress?.(40)
  } catch (err) {
    throw new Error(err.message)
  }

  // Step 2: Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  onProgress?.(85)

  // Step 3: Get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  onProgress?.(100)

  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile({ supabase, bucket, path }) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Create a local preview URL for a file (before upload).
 */
export function createPreviewUrl(file) {
  return URL.createObjectURL(file)
}
