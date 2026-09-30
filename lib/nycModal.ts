/**
 * Open a native modal: background controls become inert and the panel is placed
 * above chat/sticky bars. The caller owns rendering and dismisses via onDismiss.
 */
export function openNycMobileModal(
  dialog: HTMLDialogElement,
  onDismiss: () => void,
): () => void {
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const previousOverflow = document.body.style.overflow
  let disposed = false
  const desktop = window.matchMedia('(min-width: 768px)')
  const requestDismiss = () => { if (!disposed) onDismiss() }
  // A queued close event from StrictMode cleanup must not dismiss a reopened modal.
  const closed = () => { if (!dialog.open) requestDismiss() }
  const cancel = (event: Event) => { event.preventDefault(); requestDismiss() }
  const viewportChanged = () => { if (desktop.matches) requestDismiss() }

  const keyboard = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]'
    )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled')
      && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first) {
      event.preventDefault()
      dialog.focus({ preventScroll: true })
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault()
      first.focus()
    }
  }

  document.body.style.overflow = 'hidden'
  dialog.addEventListener('cancel', cancel)
  dialog.addEventListener('close', closed)
  dialog.addEventListener('keydown', keyboard)
  desktop.addEventListener('change', viewportChanged)
  try {
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-nyc-initial-focus]')?.focus({ preventScroll: true })
    viewportChanged()
  } catch (error) {
    cleanup()
    throw error
  }

  function cleanup() {
    if (disposed) return
    disposed = true
    dialog.removeEventListener('cancel', cancel)
    dialog.removeEventListener('close', closed)
    dialog.removeEventListener('keydown', keyboard)
    desktop.removeEventListener('change', viewportChanged)
    if (dialog.open) dialog.close()
    document.body.style.overflow = previousOverflow
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }
  return cleanup
}
