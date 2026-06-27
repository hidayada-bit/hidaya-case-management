import { useState, useRef } from 'react'
import { compressImage, formatBytes } from '../lib/imageUtils'

/**
 * Reusable image/document upload component.
 * Compresses in the browser before returning the compressed File.
 *
 * Props:
 * - label: string
 * - type: 'photo' | 'document'
 * - currentUrl: string | null  (existing image URL to show)
 * - onFileReady: (compressedFile) => void
 * - accept: string (default: images + pdf)
 * - shape: 'circle' | 'rect'
 */
export default function ImageUpload({
  label,
  type = 'photo',
  currentUrl = null,
  onFileReady,
  accept = 'image/jpeg,image/png,image/heic,image/webp,application/pdf',
  shape = 'rect',
  previewSize = 90,
}) {
  const [preview, setPreview] = useState(currentUrl)
  const [status, setStatus] = useState('idle') // idle | compressing | ready | error
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const borderRadius = shape === 'circle' ? '50%' : 12

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setStatus('compressing')
    setInfo(`Original: ${formatBytes(file.size)}`)

    try {
      const compressed = await compressImage(file, { type })
      const localUrl = URL.createObjectURL(compressed)
      setPreview(localUrl)
      setStatus('ready')
      setInfo(`${formatBytes(file.size)} → ${formatBytes(compressed.size)} ✓`)
      onFileReady?.(compressed)
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const onDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  const isDoc = type === 'document'

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.02em' }}>
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{
          width: isDoc ? '100%' : previewSize,
          height: isDoc ? 100 : previewSize,
          borderRadius,
          border: `2px dashed ${status === 'ready' ? '#10b981' : status === 'error' ? '#ef4444' : '#93c5fd'}`,
          background: preview && !isDoc ? 'transparent' : '#f8fbff',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: isDoc ? 'column' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.2s',
        }}
      >
        {/* Image preview */}
        {preview && !isDoc && (
          <img
            src={preview}
            alt="preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius }}
          />
        )}

        {/* Document / no-preview state */}
        {(!preview || isDoc) && (
          <div style={{ textAlign: 'center', padding: '8px 12px' }}>
            {status === 'compressing' ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 4 }}>⏳</div>
                <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Compressing…</div>
              </>
            ) : status === 'ready' && isDoc ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Ready to upload</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: isDoc ? 22 : 18, marginBottom: 4 }}>
                  {isDoc ? '📄' : '📷'}
                </div>
                <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>
                  {isDoc ? 'Click or drag file' : 'Upload photo'}
                </div>
                {isDoc && (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    JPG, PNG, PDF
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Hover overlay for photos */}
        {preview && !isDoc && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s', borderRadius,
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Change</span>
          </div>
        )}
      </div>

      {/* Size info */}
      {info && (
        <div style={{ fontSize: 10, color: status === 'ready' ? '#10b981' : '#64748b', marginTop: 4, fontWeight: 600 }}>
          {info}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, background: '#fef2f2', padding: '4px 8px', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
