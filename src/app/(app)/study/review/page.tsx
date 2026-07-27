'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type Note = { content: string; mentalImage: string | null; flashcard: string | null }
type SpacedRepetitionEntry = {
  id: string
  nextReviewDate: string
  interval: number
  note: Note & { front: { name: string; topic: { name: string } } }
}

const RATINGS = [
  { quality: 5, label: 'Perfecto', color: 'bg-emerald-500 hover:bg-emerald-400', emoji: '🟢' },
  { quality: 4, label: 'Bien', color: 'bg-teal-500 hover:bg-teal-400', emoji: '🟦' },
  { quality: 3, label: 'Regular', color: 'bg-amber-500 hover:bg-amber-400', emoji: '🟡' },
  { quality: 2, label: 'Difícil', color: 'bg-orange-500 hover:bg-orange-400', emoji: '🟠' },
  { quality: 0, label: 'No lo recordé', color: 'bg-red-600 hover:bg-red-500', emoji: '🔴' },
]

export default function ReviewSessionPage() {
  const [entries, setEntries] = useState<SpacedRepetitionEntry[]>([])
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [lastInterval, setLastInterval] = useState<number | null>(null)
  const [sessionStats, setSessionStats] = useState({ total: 0, done: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/study/review')
      .then(r => r.json())
      .then((data: SpacedRepetitionEntry[]) => {
        setEntries(data)
        setSessionStats({ total: data.length, done: 0 })
        setLoading(false)
      })
  }, [])

  async function rate(quality: number) {
    const entry = entries[current]
    if (!entry) return
    setReviewing(true)
    const res = await fetch('/api/study/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.id, quality }),
    })
    const data = await res.json()
    setReviewing(false)
    setLastInterval(data.newInterval)

    // Wait a moment then go next
    setTimeout(() => {
      setLastInterval(null)
      const nextIdx = current + 1
      setSessionStats(prev => ({ ...prev, done: prev.done + 1 }))
      if (nextIdx >= entries.length) {
        setDone(true)
      } else {
        setCurrent(nextIdx)
        setRevealed(false)
      }
    }, 1200)
  }

  const entry = entries[current]
  const progress = sessionStats.total > 0 ? Math.round((sessionStats.done / sessionStats.total) * 100) : 0

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    )
  }

  if (entries.length === 0 || done) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-16">
          <p className="text-5xl mb-5">{done ? '🎉' : '✅'}</p>
          {done ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">¡Sesión completada!</h2>
              <p className="text-slate-400 mb-2">
                Repasaste {sessionStats.total} nota{sessionStats.total !== 1 ? 's' : ''} en esta sesión.
              </p>
              <p className="text-slate-500 text-sm">
                El algoritmo SM-2 ha actualizado los intervalos de cada nota.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-3">¡No hay repasos pendientes!</h2>
              <p className="text-slate-400 mb-2">
                No tienes notas que repasar hoy. Vuelve mañana o agrega nuevas notas.
              </p>
            </>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/study" className="btn-primary">Ver Temas</Link>
            <Link href="/" className="btn-secondary">Ir al Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/study" className="btn-ghost btn-sm">← Salir</Link>
        <div className="flex-1 mx-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Repaso {sessionStats.done + 1} de {sessionStats.total}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill bg-violet-400" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="badge-purple">{sessionStats.total - sessionStats.done - 1} restantes</span>
      </div>

      {/* Context */}
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
        <span>📚 {entry.note.front.topic.name}</span>
        <span>›</span>
        <span>📁 {entry.note.front.name}</span>
      </div>

      {/* Question card */}
      <div className="card border-amber-500/30 bg-amber-500/[0.04] mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-amber-400">📇</span>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Pregunta de Repaso</p>
        </div>
        <p className="text-lg text-slate-200 leading-relaxed font-medium">
          {entry.note.flashcard || '¿Cuál es el concepto principal de esta nota?'}
        </p>
      </div>

      {/* Reveal button */}
      {!revealed && !lastInterval && (
        <button
          onClick={() => setRevealed(true)}
          className="btn-primary w-full btn-lg mb-4"
          id="reveal-answer"
        >
          Ver Respuesta →
        </button>
      )}

      {/* Answer */}
      {revealed && !lastInterval && (
        <>
          {/* Mental image (Text description) */}
          {entry.note.mentalImage && (
            <div className="card bg-gradient-to-br from-violet-900/40 to-blue-900/40 border-violet-500/30 mb-4">
              <p className="text-xs font-semibold text-violet-300 mb-2">🧠 Descripción Visual Mental (Texto)</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{entry.note.mentalImage}</p>
            </div>
          )}

          {/* Full note content */}
          <div className="card mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">📝 Nota completa</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.note.content}</p>
          </div>

          {/* Rating buttons */}
          <div>
            <p className="text-xs text-slate-500 text-center mb-3">¿Qué tan bien lo recordaste?</p>
            <div className="grid grid-cols-5 gap-2">
              {RATINGS.map(({ quality, label, color, emoji }) => (
                <button
                  key={quality}
                  onClick={() => rate(quality)}
                  disabled={reviewing}
                  className={`${color} text-white rounded-xl py-3 px-2 text-center transition-all transform hover:scale-105 disabled:opacity-50`}
                >
                  <span className="block text-lg mb-1">{emoji}</span>
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Interval feedback */}
      {lastInterval !== null && (
        <div className="card border-emerald-500/30 bg-emerald-500/[0.06] text-center py-8">
          <p className="text-3xl mb-3">✓</p>
          <p className="text-emerald-300 font-semibold">
            Vuelve en <span className="text-2xl">{lastInterval}</span> día{lastInterval !== 1 ? 's' : ''}
          </p>
          <p className="text-slate-500 text-sm mt-2">Siguiente nota...</p>
        </div>
      )}
    </div>
  )
}
