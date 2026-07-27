'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type StudyFront = { id: string; name: string; _count: { notes: number } }
type StudyTopic = { id: string; name: string; description: string | null; fronts: StudyFront[] }

export default function StudyPage() {
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/study/topics').then(r => r.json()).then(data => { setTopics(data); setLoading(false) })
    fetch('/api/study/review').then(r => r.json()).then(data => setReviewsCount(Array.isArray(data) ? data.length : 0))
  }, [])

  async function createTopic() {
    if (!form.name) return
    setCreating(true)
    const res = await fetch('/api/study/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      setTopics(prev => [...prev, data])
      setShowModal(false)
      setForm({ name: '', description: '' })
    }
  }

  async function deleteTopic(id: string) {
    if (!confirm('¿Eliminar este tema y todas sus notas?')) return
    await fetch('/api/study/topics', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTopics(prev => prev.filter(t => t.id !== id))
  }

  const totalNotes = topics.reduce((acc, t) => acc + t.fronts.reduce((a, f) => a + f._count.notes, 0), 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🧠</span>
            <h1 className="page-title">Sistema de Estudio</h1>
          </div>
          <p className="text-slate-400 text-sm">
            {totalNotes} nota{totalNotes !== 1 ? 's' : ''} en {topics.length} tema{topics.length !== 1 ? 's' : ''} · Repetición espaciada con SM-2 + IA
          </p>
        </div>
        <div className="flex gap-3">
          {reviewsCount > 0 && (
            <Link href="/study/review" className="btn-secondary relative">
              🧠 Repasar
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center font-bold">
                {reviewsCount}
              </span>
            </Link>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary" id="new-topic-btn">
            + Nuevo Tema
          </button>
        </div>
      </div>

      {/* Today's reviews banner */}
      {reviewsCount > 0 && (
        <Link href="/study/review">
          <div className="card border-violet-500/30 bg-violet-500/[0.08] hover:bg-violet-500/[0.12] cursor-pointer mb-6 transition-all">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🧠</div>
              <div className="flex-1">
                <p className="font-semibold text-violet-200">
                  {reviewsCount} nota{reviewsCount > 1 ? 's' : ''} para repasar hoy
                </p>
                <p className="text-violet-400/70 text-sm">Repetición espaciada · SM-2 adaptativo →</p>
              </div>
              <div className="text-violet-400 text-xl">→</div>
            </div>
          </div>
        </Link>
      )}

      {/* Topics grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="shimmer h-40 rounded-2xl" />)}
        </div>
      ) : topics.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">🧠</p>
          <p className="text-slate-300 font-semibold text-lg">No hay temas de estudio</p>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            Crea tu primer tema (ej. Marketing, Negociación, Comunicación)
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Crear Primer Tema</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map(topic => {
            const noteCount = topic.fronts.reduce((a, f) => a + f._count.notes, 0)
            return (
              <div key={topic.id} className="card hover:scale-[1.02] transition-transform group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-100 text-lg">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{topic.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTopic(topic.id)}
                    className="btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  >
                    🗑
                  </button>
                </div>

                <div className="flex gap-4 text-sm text-slate-400 mb-4">
                  <span>📚 {topic.fronts.length} frente{topic.fronts.length !== 1 ? 's' : ''}</span>
                  <span>📝 {noteCount} nota{noteCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Fronts list */}
                {topic.fronts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {topic.fronts.map(front => (
                      <span key={front.id} className="badge badge-purple">
                        {front.name} ({front._count.notes})
                      </span>
                    ))}
                  </div>
                )}

                <Link href={`/study/${topic.id}`} className="btn-secondary w-full text-center block">
                  Abrir Tema →
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Create topic modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">Nuevo Tema de Estudio</h2>
              <p className="text-xs text-slate-400 mt-1">ej. Marketing, Negociación, Comunicación, Inversiones...</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del tema *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="ej. Marketing Digital" id="topic-name" />
              </div>
              <div>
                <label className="label">Descripción (opcional)</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="¿Para qué estudias este tema?" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={createTopic} disabled={creating || !form.name} className="btn-primary flex-1" id="create-topic-submit">
                  {creating ? 'Creando...' : 'Crear Tema'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
