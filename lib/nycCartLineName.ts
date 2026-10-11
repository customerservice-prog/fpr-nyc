import type { CartItem } from '@/components/public/CartContext'

/** Match the server's catalog-name + approved-color format without repeating a cart label. */
export function cartCheckoutLineName(item: Pick<CartItem, 'name' | 'selectedColor'>) {
  if (!item.selectedColor) return item.name
  const suffix = ' (' + item.selectedColor + ')'
  return item.name.endsWith(suffix) ? item.name : item.name + suffix
}
