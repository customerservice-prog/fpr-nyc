'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  maxQuantity: number
  picture?: string | null
  pricingProfile?: string
  isPackage?: boolean 
    selectedColor?: string
  eventDate?: string | null
}

interface CartContextType {
  items: CartItem[]
  eventDate: string | null
  durationTierId: string | null
  eventTimeSlot: string | null
  deliveryType: string | null
  pickupTimeSlot: string | null
  exactTimeRequested: boolean
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setEventDate: (date: string) => void
  setDurationTierId: (id: string | null) => void
  setEventTimeSlot: (slot: string) => void
  setDeliveryType: (type: string | null) => void
  setPickupTimeSlot: (slot: string | null) => void
  setExactTimeRequested: (value: boolean) => void
  subtotal: number
  itemCount: number
  loaded: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_KEY = 'fpr_cart'
const DATE_KEY = 'fpr_event_date'
const DURATION_KEY = 'fpr_duration_tier'
const TIME_SLOT_KEY = 'fpr_event_time_slot'
const DELIVERY_TYPE_KEY = 'fpr_delivery_type'
const PICKUP_TIME_KEY = 'fpr_pickup_time_slot'
const EXACT_TIME_KEY = 'fpr_exact_time_requested'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [eventDate, setEventDateState] = useState<string | null>(null)
  const [durationTierId, setDurationTierIdState] = useState<string | null>(null)
  const [eventTimeSlot, setEventTimeSlotState] = useState<string | null>(null)
  const [deliveryType, setDeliveryTypeState] = useState<string | null>(null)
  const [pickupTimeSlot, setPickupTimeSlotState] = useState<string | null>(null)
  const [exactTimeRequested, setExactTimeRequestedState] = useState<boolean>(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      const savedDate = localStorage.getItem(DATE_KEY)
      const savedDuration = localStorage.getItem(DURATION_KEY)
      const savedTimeSlot = localStorage.getItem(TIME_SLOT_KEY)
      const savedDeliveryType = localStorage.getItem(DELIVERY_TYPE_KEY)
      const savedPickupTime = localStorage.getItem(PICKUP_TIME_KEY)
      const savedExactTime = localStorage.getItem(EXACT_TIME_KEY)
      if (saved) setItems(JSON.parse(saved))
      if (savedDate) setEventDateState(savedDate)
      if (savedDuration) setDurationTierIdState(savedDuration)
      if (savedTimeSlot) setEventTimeSlotState(savedTimeSlot)
      if (savedDeliveryType) setDeliveryTypeState(savedDeliveryType)
      if (savedPickupTime) setPickupTimeSlotState(savedPickupTime)
      if (savedExactTime) setExactTimeRequestedState(savedExactTime === 'true')
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items, loaded])

  useEffect(() => {
    if (!loaded) return
    if (eventDate) localStorage.setItem(DATE_KEY, eventDate)
  }, [eventDate, loaded])

  useEffect(() => {
    if (!loaded) return
    if (durationTierId) localStorage.setItem(DURATION_KEY, durationTierId)
    else localStorage.removeItem(DURATION_KEY)
  }, [durationTierId, loaded])

  useEffect(() => {
    if (!loaded) return
    if (eventTimeSlot) localStorage.setItem(TIME_SLOT_KEY, eventTimeSlot)
    else localStorage.removeItem(TIME_SLOT_KEY)
  }, [eventTimeSlot, loaded])

  useEffect(() => {
    if (!loaded) return
    if (deliveryType) localStorage.setItem(DELIVERY_TYPE_KEY, deliveryType)
    else localStorage.removeItem(DELIVERY_TYPE_KEY)
  }, [deliveryType, loaded])

  useEffect(() => {
    if (!loaded) return
    if (pickupTimeSlot) localStorage.setItem(PICKUP_TIME_KEY, pickupTimeSlot)
    else localStorage.removeItem(PICKUP_TIME_KEY)
  }, [pickupTimeSlot, loaded])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(EXACT_TIME_KEY, exactTimeRequested ? 'true' : 'false')
  }, [exactTimeRequested, loaded])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.selectedColor === item.selectedColor)
      if (existing) {
        const newQty = Math.min(existing.quantity + (item.quantity || 1), item.maxQuantity)
        return prev.map((i) => (i.id === item.id && i.selectedColor === item.selectedColor ? { ...i, quantity: newQty } : i))
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i))
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(CART_KEY)
  }, [])

  const setEventDate = useCallback((date: string) => {
    setEventDateState(date)
    localStorage.setItem(DATE_KEY, date)
  }, [])

  const setDurationTierId = useCallback((id: string | null) => {
    setDurationTierIdState(id)
    if (id) localStorage.setItem(DURATION_KEY, id)
    else localStorage.removeItem(DURATION_KEY)
  }, [])

  const setEventTimeSlot = useCallback((slot: string) => {
    setEventTimeSlotState(slot)
    if (slot) localStorage.setItem(TIME_SLOT_KEY, slot)
    else localStorage.removeItem(TIME_SLOT_KEY)
  }, [])

  const setDeliveryType = useCallback((type: string | null) => {
    setDeliveryTypeState(type)
    if (type) localStorage.setItem(DELIVERY_TYPE_KEY, type)
    else localStorage.removeItem(DELIVERY_TYPE_KEY)
  }, [])

  const setPickupTimeSlot = useCallback((slot: string | null) => {
    setPickupTimeSlotState(slot)
    if (slot) localStorage.setItem(PICKUP_TIME_KEY, slot)
    else localStorage.removeItem(PICKUP_TIME_KEY)
  }, [])

  const setExactTimeRequested = useCallback((value: boolean) => {
    setExactTimeRequestedState(value)
    localStorage.setItem(EXACT_TIME_KEY, value ? 'true' : 'false')
  }, [])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        eventDate,
        durationTierId,
        eventTimeSlot,
        deliveryType,
        pickupTimeSlot,
        exactTimeRequested,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setEventDate,
        setDurationTierId,
        setEventTimeSlot,
        setDeliveryType,
        setPickupTimeSlot,
        setExactTimeRequested,
        subtotal,
        itemCount,
        loaded,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
