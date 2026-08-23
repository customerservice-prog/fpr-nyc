'use client'

import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCart } from './CartContext'
import { formatCurrency } from '@/lib/utils'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, subtotal, itemCount, updateQuantity, removeItem, eventDate } = useCart()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-primary">
          <h2 className="font-bold text-dark flex items-center gap-2">
            <ShoppingCart size={20} />
            Cart ({itemCount})
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-primary/50 rounded">
            <X size={24} />
          </button>
        </div>

        {eventDate && (
          <div className="px-4 py-2 bg-blue-50 text-sm text-secondary font-medium">
            Event Date: {eventDate}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-body text-center py-8">Your cart is empty</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 border-b pb-4">
                              {item.picture && (
              <img src={item.picture} alt={item.name} className="w-16 h-16 object-cover rounded flex-shrink-0" />
            )}
                  <div className="flex-1">
                    <h3 className="font-medium text-dark text-sm">{item.name}</h3>
                    {item.eventDate && item.eventDate !== eventDate && (<p className="text-xs text-amber-600 mt-1">Added for {item.eventDate} - different from your currently selected date</p>)}
                    <p className="text-secondary font-bold">{formatCurrency(item.price)}/day</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 border rounded hover:bg-gray-100"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 border rounded hover:bg-gray-100"
                        disabled={item.quantity >= item.maxQuantity}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 text-xs ml-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-bold text-dark">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="btn-primary block text-center w-full"
              onClick={onClose}
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
