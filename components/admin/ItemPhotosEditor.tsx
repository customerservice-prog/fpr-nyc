'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Upload, ChevronLeft, ChevronRight, Trash2, ImagePlus } from 'lucide-react'
import { ITEM_PHOTO_ACCEPT, appendItemPhoto, itemPhotoUrl, moveItemPhoto, uploadItemPhoto } from '@/lib/itemPhotoUploads'

type Props = {
  picture: string
  additionalImages: string[]
  onPictureChange: (url: string) => void
  onAdditionalImagesChange: Dispatch<SetStateAction<string[]>>
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}

function PhotoPreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className="flex aspect-[4/3] items-center justify-center bg-gray-50 p-3 text-center text-xs text-gray-500">Preview unavailable. You can still remove this photo.</div>
  ) : (
    <img src={src} alt={alt} className="aspect-[4/3] w-full object-contain bg-white" onError={() => setFailed(true)} />
  )
}

export default function ItemPhotosEditor({ picture, additionalImages, onPictureChange, onAdditionalImagesChange, onBusyChange, disabled = false }: Props) {
  const mainInput = useRef<HTMLInputElement>(null)
  const additionalInput = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [manualUrl, setManualUrl] = useState('')
  const locked = disabled || uploading

  async function upload(files: File[], target: 'main' | 'additional') {
    if (!files.length || disabled || busyRef.current) return
    busyRef.current = true
    setUploading(true)
    onBusyChange(true)
    setErrors([])
    let succeeded = 0
    const failures: string[] = []
    try {
      // Sequential uploads preserve selection order and avoid large parallel requests.
      for (const [index, file] of files.entries()) {
        setStatus(`Uploading photo ${index + 1} of ${files.length}…`)
        try {
          const url = await uploadItemPhoto(file)
          if (target === 'main') onPictureChange(url)
          else onAdditionalImagesChange((current) => appendItemPhoto(current, url))
          succeeded += 1
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed. Please try again.'}`)
        }
      }
      setErrors(failures)
      setStatus(succeeded ? `${succeeded} photo${succeeded === 1 ? '' : 's'} uploaded. Save the item to publish your changes.` : 'No photos were added. Please check the messages below.')
    } finally {
      busyRef.current = false
      setUploading(false)
      onBusyChange(false)
    }
  }

  function addUrl() {
    if (locked) return
    const url = itemPhotoUrl(manualUrl)
    if (!url) {
      setErrors(['Enter one valid photo URL beginning with https://, http://, or /.'])
      return
    }
    if (url === picture || additionalImages.includes(url)) {
      setErrors(['That photo is already in this item’s gallery.'])
      return
    }
    onAdditionalImagesChange((current) => appendItemPhoto(current, url))
    setManualUrl('')
    setErrors([])
    setStatus('Photo added. Save the item to publish your changes.')
  }

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 p-4" aria-label="Item photos" aria-busy={uploading} data-item-photos-editor="v1">
      <div>
        <h2 className="text-base font-semibold text-dark">Main Photo</h2>
        <p className="mt-1 text-xs text-gray-600">Shown first on the item page and in your rental catalog.</p>
        {picture && <div className="mt-3 max-w-xs overflow-hidden rounded-lg border"><PhotoPreview key={picture} src={picture} alt="Main item photo — shown first" /></div>}
        <input ref={mainInput} type="file" accept={ITEM_PHOTO_ACCEPT} className="sr-only" tabIndex={-1} disabled={locked} aria-label="Choose main photo" onChange={(event) => {
          const files = Array.from(event.currentTarget.files || []).slice(0, 1)
          event.currentTarget.value = ''
          void upload(files, 'main')
        }} />
        <button type="button" disabled={locked} onClick={() => mainInput.current?.click()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><Upload className="h-4 w-4" aria-hidden="true" />Upload Main Photo</button>
        <details className="mt-3 text-xs text-gray-600">
          <summary className="cursor-pointer">Main photo URL (optional)</summary>
          <input aria-label="Main photo URL" value={picture} disabled={locked} onChange={(event) => onPictureChange(event.target.value)} className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="https://example.com/photo.jpg" />
        </details>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-base font-semibold text-dark">Additional Photos</h2>
        <p className="mt-1 text-sm text-gray-600">Upload real setup photos and other views. These appear after your main photo as clickable gallery thumbnails.</p>
        <input ref={additionalInput} type="file" multiple accept={ITEM_PHOTO_ACCEPT} className="sr-only" tabIndex={-1} disabled={locked} aria-label="Choose additional photos" onChange={(event) => {
          const files = Array.from(event.currentTarget.files || [])
          event.currentTarget.value = ''
          void upload(files, 'additional')
        }} />
        <button type="button" disabled={locked} onClick={() => additionalInput.current?.click()} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"><ImagePlus className="h-5 w-5" aria-hidden="true" />{uploading ? 'Uploading Photos…' : 'Upload Additional Photos'}</button>
        <p className="mt-2 text-xs text-gray-500">Select one or several photos. JPG, PNG, WebP, or GIF. Maximum 5 MB each.</p>
        {additionalImages.length === 0 ? (
          <div className="mt-4 rounded-lg border-2 border-dashed bg-gray-50 p-5 text-center text-sm text-gray-500">No additional photos yet. Your main photo will not be replaced.</div>
        ) : (
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Additional photo order">
            {additionalImages.map((src, index) => (
              <li key={`${src}-${index}`} className="min-w-0 overflow-hidden rounded-lg border bg-white">
                <PhotoPreview key={src} src={src} alt={`Additional photo ${index + 1}`} />
                <div className="border-t p-2">
                  <p className="mb-2 text-xs font-medium text-gray-600">Photo {index + (picture ? 2 : 1)}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" disabled={locked || index === 0} aria-label={`Move additional photo ${index + 1} earlier`} onClick={() => onAdditionalImagesChange((current) => moveItemPhoto(current, index, index - 1))} className="min-h-11 min-w-11 rounded border p-2 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="mx-auto h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" disabled={locked || index === additionalImages.length - 1} aria-label={`Move additional photo ${index + 1} later`} onClick={() => onAdditionalImagesChange((current) => moveItemPhoto(current, index, index + 1))} className="min-h-11 min-w-11 rounded border p-2 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="mx-auto h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" disabled={locked} aria-label={`Remove additional photo ${index + 1}`} onClick={() => {
                      onAdditionalImagesChange((current) => current.filter((_, position) => position !== index))
                      setStatus('Photo removed from this gallery. Save the item to publish your changes.')
                    }} className="inline-flex min-h-11 items-center gap-1 rounded px-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <details className="mt-4 text-sm text-gray-600">
          <summary className="cursor-pointer">Add a photo by URL instead</summary>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input aria-label="Additional photo URL" value={manualUrl} disabled={locked} onChange={(event) => setManualUrl(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); addUrl() }
            }} placeholder="Paste one photo URL" className="min-w-0 flex-1 rounded border px-3 py-2" />
            <button type="button" disabled={locked || !manualUrl.trim()} onClick={addUrl} className="min-h-11 rounded border px-3 py-2 font-medium hover:bg-gray-50 disabled:opacity-50">Add Photo</button>
          </div>
        </details>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-gray-600">{status || 'Your existing photos stay unchanged until you save the item.'}</p>
      {errors.length > 0 && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errors.map((error, index) => <p key={index} className="break-words">{error}</p>)}</div>}
    </section>
  )
}
