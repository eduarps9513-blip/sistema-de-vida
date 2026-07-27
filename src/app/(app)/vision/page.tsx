'use client'

import { useState, useEffect, useCallback } from 'react'

type VisionItem = {
  id: string
  text: string
  done: boolean
}

type Vision = {
  id?: string
  type: string
  whereIWantToBe: string
  whoIWantToBe: string
  whatIWantToAchieve: string
  updatedAt?: string
}

type VisionHorizon = 'ONE_YEAR' | 'TWO_YEAR' | 'THREE_YEAR' | 'FIVE_YEAR' | 'TEN_YEAR'

const HORIZONS: { key: VisionHorizon; label: string; icon: string; desc: string }[] = [
  { key: 'ONE_YEAR', label: '1 Año', icon: '🎯', desc: 'Metas a corto plazo para los próximos 12 meses.' },
  { key: 'TWO_YEAR', label: '2 Años', icon: '🧭', desc: 'Consolidación de proyectos y crecimiento a mediano plazo.' },
  { key: 'THREE_YEAR', label: '3 Años', icon: '🎥', desc: 'El ancla táctica principal para tus ciclos de 12 semanas.' },
  { key: 'FIVE_YEAR', label: '5 Años', icon: '🚀', desc: 'Transformación integral y visión de estilo de vida.' },
  { key: 'TEN_YEAR', label: '10 Años', icon: '🌟', desc: 'Tu legado a largo plazo y la máxima aspiración de tu vida.' },
]

const VISION_FIELDS = [
  {
    key: 'whereIWantToBe',
    label: '¿Dónde quiero estar?',
    placeholder: 'ej. Vivir en mi propia casa cerca de la playa, con un espacio de trabajo amplio...',
    icon: '🌍',
  },
  {
    key: 'whoIWantToBe',
    label: '¿Quién quiero ser?',
    placeholder: 'ej. Una persona disciplinada, saludable, enfocada y excelente líder de equipo...',
    icon: '⭐',
  },
  {
    key: 'whatIWantToAchieve',
    label: '¿Qué quiero haber logrado?',
    placeholder: 'ej. Haber facturado 100K$, completar 4 maratones, tener inversiones pasivas...',
    icon: '🏆',
  },
]

function parseVisionItems(raw: string): VisionItem[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `item_${idx}_${Date.now()}`,
        text: typeof item === 'string' ? item : item.text || '',
        done: typeof item === 'object' && item !== null ? Boolean(item.done) : false,
      }))
    }
  } catch {
    // Fallback: parse plain text split by newline
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, idx) => ({
        id: `legacy_${idx}_${Date.now()}`,
        text: line.replace(/^[•\-\*]\s*/, ''),
        done: false,
      }))
  }
  return []
}

function serializeVisionItems(items: VisionItem[]): string {
  const filtered = items.filter((i) => i.text.trim() !== '')
  return JSON.stringify(filtered)
}

export default function VisionPage() {
  const [activeTab, setActiveTab] = useState<VisionHorizon>('THREE_YEAR')
  const [visions, setVisions] = useState<Record<string, Vision>>({
    ONE_YEAR: { type: 'ONE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
    TWO_YEAR: { type: 'TWO_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
    THREE_YEAR: { type: 'THREE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
    FIVE_YEAR: { type: 'FIVE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
    TEN_YEAR: { type: 'TEN_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
  })
  const [newInputs, setNewInputs] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/vision')
      .then((r) => r.json())
      .then((data: Vision[]) => {
        const map: Record<string, Vision> = {
          ONE_YEAR: { type: 'ONE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
          TWO_YEAR: { type: 'TWO_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
          THREE_YEAR: { type: 'THREE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
          FIVE_YEAR: { type: 'FIVE_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
          TEN_YEAR: { type: 'TEN_YEAR', whereIWantToBe: '', whoIWantToBe: '', whatIWantToAchieve: '' },
        }
        data.forEach((v) => { map[v.type] = v })
        setVisions(map)
        setLoading(false)
      })
  }, [])

  const currentVision = visions[activeTab]
  const currentHorizonMeta = HORIZONS.find((h) => h.key === activeTab) || HORIZONS[2]

  const handleSaveVisionData = useCallback(async (updatedVision: Vision) => {
    setSaving(true)
    const res = await fetch('/api/vision', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activeTab,
        whereIWantToBe: updatedVision.whereIWantToBe || '',
        whoIWantToBe: updatedVision.whoIWantToBe || '',
        whatIWantToAchieve: updatedVision.whatIWantToAchieve || '',
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
    }
  }, [activeTab])

  function updateFieldItems(fieldKey: string, newItems: VisionItem[]) {
    const serialized = serializeVisionItems(newItems)
    setVisions((prev) => {
      const updatedVision = {
        ...prev[activeTab],
        [fieldKey]: serialized,
      }
      handleSaveVisionData(updatedVision)
      return {
        ...prev,
        [activeTab]: updatedVision,
      }
    })
  }

  function addItemToField(fieldKey: string) {
    const text = (newInputs[fieldKey] || '').trim()
    if (!text) return

    const raw = currentVision?.[fieldKey as keyof Vision] as string ?? ''
    const currentItems = parseVisionItems(raw)
    const newItem: VisionItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      text,
      done: false,
    }

    updateFieldItems(fieldKey, [...currentItems, newItem])
    setNewInputs((prev) => ({ ...prev, [fieldKey]: '' }))
  }

  function toggleItemDone(fieldKey: string, itemId: string) {
    const raw = currentVision?.[fieldKey as keyof Vision] as string ?? ''
    const items = parseVisionItems(raw)
    const updated = items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
    updateFieldItems(fieldKey, updated)
  }

  function editItemText(fieldKey: string, itemId: string, newText: string) {
    const raw = currentVision?.[fieldKey as keyof Vision] as string ?? ''
    const items = parseVisionItems(raw)
    const updated = items.map((i) => (i.id === itemId ? { ...i, text: newText } : i))
    updateFieldItems(fieldKey, updated)
  }

  function deleteItem(fieldKey: string, itemId: string) {
    const raw = currentVision?.[fieldKey as keyof Vision] as string ?? ''
    const items = parseVisionItems(raw)
    const updated = items.filter((i) => i.id !== itemId)
    updateFieldItems(fieldKey, updated)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🔭</span>
          <h1 className="page-title">Visión de Vida</h1>
          {saving ? (
            <span className="badge-yellow ml-auto">Guardando...</span>
          ) : savedAt ? (
            <span className="badge-green ml-auto">Guardado a las {savedAt} ✓</span>
          ) : null}
        </div>
        <p className="text-slate-400 text-sm">
          Tu norte estratégico a 1, 2, 3, 5 y 10 años. Define elementos claros como tareas/metas en cada dimensión.
        </p>
      </div>

      {/* Horizon Tabs Bar */}
      <div className="flex gap-1.5 mb-6 p-1 bg-white/[0.03] rounded-xl overflow-x-auto max-w-full">
        {HORIZONS.map((h) => {
          const isSelected = activeTab === h.key
          return (
            <button
              key={h.key}
              onClick={() => setActiveTab(h.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <span>{h.icon}</span>
              <span>{h.label}</span>
            </button>
          )
        })}
      </div>

      {/* Methodology Note */}
      <div className="alert-info mb-6">
        <span>💡</span>
        <div>
          <p className="font-semibold">{currentHorizonMeta.icon} Visión a {currentHorizonMeta.label}</p>
          <p className="text-blue-300/80 text-xs mt-0.5">
            {currentHorizonMeta.desc}
          </p>
        </div>
      </div>

      {/* Form */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {VISION_FIELDS.map((field) => {
            const raw = currentVision?.[field.key as keyof Vision] as string ?? ''
            const items = parseVisionItems(raw)
            const completedCount = items.filter((i) => i.done).length

            return (
              <div key={field.key} className="card">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <span className="text-xl">{field.icon}</span>
                    {field.label}
                  </label>
                  <span className="badge badge-purple text-xs">
                    {items.length > 0 ? `${completedCount}/${items.length} completados` : 'Sin elementos'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No has añadido elementos todavía a esta pregunta para la visión a {currentHorizonMeta.label}.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          item.done
                            ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                        }`}
                      >
                        <button
                          onClick={() => toggleItemDone(field.key, item.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-white/20 hover:border-emerald-400/50'
                          }`}
                        >
                          {item.done && '✓'}
                        </button>

                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => editItemText(field.key, item.id, e.target.value)}
                          onBlur={() => handleSaveVisionData(currentVision)}
                          className={`flex-1 bg-transparent text-sm text-slate-200 focus:outline-none ${
                            item.done ? 'line-through text-slate-500' : ''
                          }`}
                        />

                        <button
                          onClick={() => deleteItem(field.key, item.id)}
                          className="btn-ghost btn-sm text-slate-500 hover:text-red-400 text-xs px-1.5"
                          title="Eliminar elemento"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new item form */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                  <input
                    type="text"
                    value={newInputs[field.key] || ''}
                    onChange={(e) => setNewInputs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItemToField(field.key)}
                    placeholder={field.placeholder}
                    className="input text-xs flex-1 py-2 px-3"
                  />
                  <button
                    onClick={() => addItemToField(field.key)}
                    disabled={!(newInputs[field.key] || '').trim()}
                    className="btn-primary btn-sm text-xs px-4 flex-shrink-0"
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => handleSaveVisionData(currentVision)}
            disabled={saving}
            className="btn-primary w-full py-3"
            id="save-vision"
          >
            {saving ? 'Guardando...' : `💾 Guardar Visión ${currentHorizonMeta.label}`}
          </button>
        </div>
      )}
    </div>
  )
}
