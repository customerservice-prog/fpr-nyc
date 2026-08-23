'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="border border-primary/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-primary/10 transition-colors"
          >
            <span className="font-medium text-dark">{item.question}</span>
            <ChevronDown
              size={20}
              className={`transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
            />
          </button>
          {openIndex === index && (
            <div className="p-4 bg-gray-50 text-body text-sm border-t">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
