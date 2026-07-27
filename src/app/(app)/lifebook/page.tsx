'use client'

import { useState, useEffect } from 'react'
import { getDaysSince, LIFEBOOK_CATEGORIES } from '@/lib/utils'

type LifebookCategory = {
  id: string
  slug: string
  currentBeliefs: string
  idealVision: string
  whyIWantIt: string
  howIWillAchieveIt: string
  linkedVision3: boolean
  linkedVision5: boolean
  updatedAt: string
}

const CATEGORY_FIELDS = [
  { key: 'currentBeliefs', label: 'Creencias actuales', placeholder: 'Describe tus creencias actuales sobre este área: ¿cuáles te potencian? ¿cuáles te limitan?', icon: '🪞' },
  { key: 'idealVision', label: 'Visión ideal', placeholder: 'Describe cómo quieres que sea este área de tu vida en su versión más elevada...', icon: '✨' },
  { key: 'whyIWantIt', label: '¿Por qué lo quiero?', placeholder: 'Tu propósito profundo. ¿Qué significa esto para ti? ¿Por qué importa?', icon: '❤️' },
  { key: 'howIWillAchieveIt', label: '¿Cómo lo voy a lograr?', placeholder: 'Tu plan concreto: hábitos, compromisos, cambios que debes hacer...', icon: '🗺️' },
]

function staleness(updatedAt: string): 'fresh' | 'aging' | 'stale' {
  const days = getDaysSince(updatedAt)
  if (days < 30) return 'fresh'
  if (days < 90) return 'aging'
  return 'stale'
}

export default function LifebookPage() {
  const [categories, setCategories] = useState<LifebookCategory[]>([])
  const [selected, setSelected] = useState<LifebookCategory | null>(null)
  const [form, setForm] = useState<Partial<LifebookCategory>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    fetch('/api/lifebook')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data)
        setLoading(false)
      })
  }, [])

  function openCategory(cat: LifebookCategory) {
    setSelected(cat)
    setForm({
      currentBeliefs: cat.currentBeliefs,
      idealVision: cat.idealVision,
      whyIWantIt: cat.whyIWantIt,
      howIWillAchieveIt: cat.howIWillAchieveIt,
      linkedVision3: cat.linkedVision3,
      linkedVision5: cat.linkedVision5,
    })
    setSavedMsg('')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/lifebook', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selected.slug, ...form }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setCategories((prev) =>
        prev.map((c) => (c.slug === selected.slug ? { ...c, ...updated } : c))
      )
      setSelected((s) => (s ? { ...s, ...updated } : s))
      setSavedMsg('✓ Guardado')
      setTimeout(() => setSavedMsg(''), 2500)
    }
  }

  const catMeta = LIFEBOOK_CATEGORIES

  const staleCount = categories.filter(
    (c) => c.updatedAt && getDaysSince(c.updatedAt) > 90
  ).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📖</span>
              <h1 className="page-title">Lifebook</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Las 12 áreas de tu vida. Haz click en cada categoría para profundizar y actualizar tu visión.
            </p>
          </div>
          {staleCount > 0 && (
            <div className="badge-red flex-shrink-0">
              {staleCount} sin actualizar +90 días
            </div>
          )}
        </div>
      </div>

      {/* Methodology note */}
      <div className="alert-info mb-6">
        <span>💡</span>
        <p className="text-sm">
          <strong>Metodología: Lifebook</strong> de Jon & Missy Butcher — 12 categorías de vida con creencias, visión,
          propósito y plan. Revisarlas regularmente mantiene tu sistema vivo.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="shimmer h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {catMeta.map((meta) => {
            const cat = categories.find((c) => c.slug === meta.slug)
            const status = cat?.updatedAt ? staleness(cat.updatedAt) : 'stale'
            const daysSince = cat?.updatedAt ? getDaysSince(cat.updatedAt) : 999
            const hasContent = cat?.idealVision || cat?.currentBeliefs

            return (
              <button
                key={meta.slug}
                id={`lifebook-${meta.slug.toLowerCase()}`}
                onClick={() => cat && openCategory(cat)}
                className="card text-left hover:scale-[1.02] transition-transform cursor-pointer group relative"
              >
                {/* Status dot */}
                <div
                  className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
                    status === 'fresh' ? 'bg-emerald-400' : status === 'aging' ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                />

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-lg mb-3 shadow-lg`}
                >
                  {meta.icon}
                </div>

                <p className="text-sm font-semibold text-slate-200 leading-tight mb-1">
                  {meta.label}
                </p>

                {hasContent ? (
                  <p className="text-xs text-slate-500">
                    {daysSince === 0 ? 'Hoy' : daysSince < 30 ? `Hace ${daysSince}d` : daysSince < 90 ? `${Math.round(daysSince / 7)} sem` : `${Math.round(daysSince / 30)} meses`}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">Sin completar</p>
                )}

                {/* Vision links */}
                {(cat?.linkedVision3 || cat?.linkedVision5) && (
                  <div className="flex gap-1 mt-2">
                    {cat.linkedVision3 && <span className="badge badge-purple text-[10px]">3A</span>}
                    {cat.linkedVision5 && <span className="badge badge-blue text-[10px]">5A</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center gap-3 p-6 border-b border-white/[0.06]">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                  catMeta.find((c) => c.slug === selected.slug)?.color
                } flex items-center justify-center text-lg`}
              >
                {catMeta.find((c) => c.slug === selected.slug)?.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  {catMeta.find((c) => c.slug === selected.slug)?.label}
                </h2>
                <p className="text-xs text-slate-500">
                  Última actualización: {selected.updatedAt ? getDaysSince(selected.updatedAt) : '?'} días
                </p>
              </div>
              {savedMsg && <span className="badge-green">{savedMsg}</span>}
              <button onClick={() => setSelected(null)} className="btn-ghost btn-sm ml-auto">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {CATEGORY_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="flex items-center gap-2 label">
                    <span>{field.icon}</span> {field.label}
                  </label>
                  <textarea
                    className="textarea w-full"
                    rows={4}
                    placeholder={field.placeholder}
                    value={(form[field.key as keyof typeof form] as string) ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                  />
                </div>
              ))}

              {/* Vision links */}
              <div>
                <label className="label">Vincular a visión</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.linkedVision3 ?? false}
                      onChange={(e) => setForm((f) => ({ ...f, linkedVision3: e.target.checked }))}
                      className="w-4 h-4 rounded accent-violet-500"
                    />
                    <span className="text-sm text-slate-300">Visión 3 años</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.linkedVision5 ?? false}
                      onChange={(e) => setForm((f) => ({ ...f, linkedVision5: e.target.checked }))}
                      className="w-4 h-4 rounded accent-violet-500"
                    />
                    <span className="text-sm text-slate-300">Visión 5 años</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full"
                id={`save-lifebook-${selected.slug.toLowerCase()}`}
              >
                {saving ? 'Guardando...' : '💾 Guardar Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
