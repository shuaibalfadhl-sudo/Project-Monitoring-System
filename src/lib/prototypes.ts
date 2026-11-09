import type { SupabaseClient } from '@supabase/supabase-js'

export const PROTOTYPE_BUCKET = 'project-prototypes'
export const PROTOTYPE_MAX_BYTES = 10 * 1024 * 1024
export const PROTOTYPE_SIGNED_URL_TTL = 300

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validatePrototypeFile(file: File): string | null {
  const name = (file.name || '').toLowerCase()
  const isHtml = name.endsWith('.html') || name.endsWith('.htm') || file.type === 'text/html'
  if (!isHtml) return 'Only HTML files (.html) can be uploaded as a prototype.'
  if (file.size === 0) return 'That file is empty. Choose a different HTML file.'
  if (file.size > PROTOTYPE_MAX_BYTES) return 'Prototype files must be 10 MB or smaller.'
  return null
}

function safeBaseName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'prototype'
}

function uniqueSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return Math.random().toString(36).slice(2, 14)
}

export function buildPrototypePath(projectId: string, moduleId: string, fileName: string): string {
  if (!UUID_RE.test(projectId)) throw new Error('Invalid project id for prototype upload.')
  if (!UUID_RE.test(moduleId)) throw new Error('Invalid module id for prototype upload.')
  return `${projectId}/${moduleId}/${safeBaseName(fileName)}-${uniqueSuffix()}.html`
}

export function prototypeFileName(path: string): string {
  return path.split('/').pop() || 'prototype.html'
}

interface UploadPrototypeArgs {
  path: string
  file: File
  accessToken: string
  onProgress?: (percent: number) => void
}

function uploadErrorMessage(status: number, body: string): string {
  let detail = ''
  try {
    const parsed = JSON.parse(body)
    if (parsed && typeof parsed.message === 'string') detail = parsed.message
  } catch {
    detail = ''
  }
  if (status === 413) return 'The prototype file is too large to upload.'
  if (status === 401 || status === 403) {
    return 'You do not have permission to upload the prototype for this module.'
  }
  return detail || 'The prototype could not be uploaded. Please try again.'
}

export function uploadPrototypeWithProgress({
  path,
  file,
  accessToken,
  onProgress,
}: UploadPrototypeArgs): Promise<void> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !apiKey) {
      reject(new Error('Storage is not configured for this app.'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${PROTOTYPE_BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', apiKey)
    xhr.setRequestHeader('Content-Type', 'text/html')
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText)))
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading the prototype.'))
    xhr.send(file)
  })
}

export async function createPrototypeSignedUrl(
  supabase: SupabaseClient,
  path: string,
  options?: { download?: string | boolean; expiresIn?: number },
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROTOTYPE_BUCKET)
    .createSignedUrl(path, options?.expiresIn ?? PROTOTYPE_SIGNED_URL_TTL, {
      download: options?.download,
    })

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not create a link for the prototype.')
  }
  return data.signedUrl
}

export async function deletePrototypeObject(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<void> {
  if (!path) return
  const { error } = await supabase.storage.from(PROTOTYPE_BUCKET).remove([path])
  if (error) console.error('Failed to remove prototype object', error)
}
