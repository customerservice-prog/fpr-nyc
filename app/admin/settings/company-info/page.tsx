'use client'

import { useEffect, useState, createElement } from 'react'
import toast from 'react-hot-toast'

interface CompanyForm {
    businessName: string
    phone: string
    email: string
    address: string
    city: string
    state: string
    zip: string
    timeZone: string
}

const DEFAULT_FORM: CompanyForm = {
    businessName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'SC',
    zip: '',
    timeZone: 'America/New_York',
}

interface FieldDef {
    key: keyof CompanyForm
    label: string
    type?: string
    placeholder?: string
}

interface FieldGroup {
    title: string
    description: string
    fields: FieldDef[]
}

const FIELD_GROUPS: FieldGroup[] = [
  {
        title: 'Business Identity',
        description: 'The legal/trade name customers see on the website and documents.',
        fields: [{ key: 'businessName', label: 'Business Name' }],
  },
  {
        title: 'Contact Information',
        description: 'How customers and staff reach the business.',
        fields: [
          { key: 'phone', label: 'Phone Number', type: 'tel' },
          { key: 'email', label: 'Email Address', type: 'email' },
              ],
  },
  {
        title: 'Address',
        description: 'The business location used for delivery calculations and documents.',
        fields: [
          { key: 'address', label: 'Street Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State', placeholder: 'NY' },
          { key: 'zip', label: 'Zip Code' },
              ],
  },
  {
        title: 'Operational Settings',
        description: 'Settings that affect how dates and times are calculated across the system.',
        fields: [{ key: 'timeZone', label: 'Time Zone', placeholder: 'America/New_York' }],
  },
  ]

export default function CompanyInfoPage() {
    const [form, setForm] = useState<CompanyForm>(DEFAULT_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

  useEffect(() => {
        fetch('/api/admin/settings/company-info')
          .then((r) => r.json())
          .then((d) => {
                    if (d.settings) setForm({ ...DEFAULT_FORM, ...d.settings })
          })
          .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
        setSaving(true)
        const res = await fetch('/api/admin/settings/company-info', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
        })
        setSaving(false)
        if (res.ok) toast.success('Company info saved')
        else toast.error('Failed to save company info')
  }

  if (loading) {
        return createElement('div', { className: 'p-4 max-w-2xl text-sm text-body' }, 'Loading company info...')
  }

  return createElement(
        'div',
    { className: 'p-4 max-w-2xl' },
        createElement('h1', { className: 'text-xl font-bold text-dark mb-6' }, 'Company Info'),
        createElement(
                'div',
          { className: 'space-y-6' },
                FIELD_GROUPS.map((group) =>
                          createElement(
                                      'div',
                            { key: group.title, className: 'bg-white rounded shadow p-6' },
                                      createElement('h2', { className: 'text-base font-semibold text-dark mb-1' }, group.title),
                                      createElement('p', { className: 'text-xs text-body mb-4' }, group.description),
                                      createElement(
                                                    'div',
                                        { className: 'space-y-4' },
                                                    group.fields.map((field) =>
                                                                    createElement(
                                                                                      'div',
                                                                      { key: field.key },
                                                                                      createElement('label', { className: 'block text-sm font-medium mb-1' }, field.label),
                                                                                      createElement('input', {
                                                                                                          type: field.type || 'text',
                                                                                                          value: form[field.key],
                                                                                                          placeholder: field.placeholder,
                                                                                                          onChange: (e: any) => setForm({ ...form, [field.key]: e.target.value }),
                                                                                                          className: 'w-full border rounded px-3 py-2 text-sm',
                                                                                        })
                                                                                    )
                                                                                 )
                                                  )
                                    )
                                       ),
                createElement(
                          'button',
                  { onClick: handleSave, disabled: saving, className: 'btn-admin' },
                          saving ? 'Saving...' : 'Save'
                        )
              )
      )
}
