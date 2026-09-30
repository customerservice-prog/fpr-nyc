'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem { question: string; answer: string }
interface AccordionProps { items: AccordionItem[] }

export default function Accordion({ items }: AccordionProps) {
  const groupName = useId()
  // Native disclosures remain readable and keyboard-operable without JavaScript.
  return (
    <div className="space-y-2">
      {items.map(item => (
        <details key={item.question} name={groupName} className="group rounded-lg border border-primary/30 bg-white">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg p-4 text-left transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 font-medium text-dark">{item.question}</span>
            <ChevronDown aria-hidden="true" size={20} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="rounded-b-lg border-t bg-gray-50 p-4 text-sm leading-7 text-body">{item.answer}</div>
        </details>
      ))}
    </div>
  )
}
