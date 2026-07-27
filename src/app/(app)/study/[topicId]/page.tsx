'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type SpacedRepetition = { id: string; nextReviewDate: string }
type Note = {
  id: string
  content: string
  mentalImage: string | null
  flashcard: string | null
  mentalImageEdited: boolean
  createdAt: string
  spacedRepetition: SpacedRepetition | null
}
type Front = {
  id: string
  name: string
  description: string | null
  notes: Note[]
}
type Topic = { id: string; name: string; description: string | null }

export default function TopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [fronts, setFronts] = useState<Front[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFront, setExpandedFront] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNewFront, setShowNewFront] = useState(false)
  const [showNewNote, setShowNewNote] = useState<string | null>(null) // frontId
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [frontForm, setFrontForm] = useState({ name: '', description: '' })
  const [noteContent, setNoteContent] = useState('')
  const [noteEditContent, setNoteEditContent] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingMentalImage, setEditingMentalImage] = useState(false)
  const [mentalImageEdit, setMentalImageEdit] = useState('')

  const loadData = useCallback(async () => {
    const [topicRes, frontsRes] = await Promise.all([
      fetch(`/api/study/topics`),
      fetch(`/api/study/fronts?topicId=${topicId}`),
    ])
    const topicsData = await topicRes.json()
    const frontsData = await frontsRes.json()

    const found = topicsData.find((t: Topic) => t.id === topicId)
    setTopic(found || null)

    // Load notes for all fronts
    const frontsWithNotes = await Promise.all(
      frontsData.map(async (front: Front) => {
        const notesRes = await fetch(`/api/study/notes?frontId=${front.id}`)
        const notes = await notesRes.json()
        return { ...front, notes }
      })
    )
    setFronts(frontsWithNotes)
    setLoading(false)
  }, [topicId])

  useEffect(() => { loadData() }, [loadData])

  async function createFront() {
    if (!frontForm.name) return
    const res = await fetch('/api/study/fronts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, ...frontForm }),
    })
    const data = await res.json()
    if (res.ok) {
      setFronts(prev => [...prev, { ...data, notes: [] }])
      setShowNewFront(false)
      setFrontForm({ name: '', description: '' })
      setExpandedFront(data.id)
    }
  }

  async function createNote(frontId: string) {
    if (!noteContent.trim()) return
    setSaving(true)
    setGeneratingAI(true)
    try {
      const res = await fetch('/api/study/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontId, content: noteContent }),
      })
      const data = await res.json()
      if (res.ok) {
        setFronts(prev => prev.map(f => f.id === frontId ? { ...f, notes: [...f.notes, data] } : f))
        setShowNewNote(null)
        setNoteContent('')
        // Show note detail directly with generated text
        setSelectedNote(data)
      }
    } finally {
      setSaving(false)
      setGeneratingAI(false)
    }
  }

  async function regenerateAI(noteId: string, frontId: string) {
    setGeneratingAI(true)
    const res = await fetch(`/api/study/notes/${noteId}/generate`, { method: 'POST' })
    const data = await res.json()
    setGeneratingAI(false)
    if (res.ok) {
      setSelectedNote(data)
      setFronts(prev => prev.map(f => f.id === frontId ? { ...f, notes: f.notes.map(n => n.id === noteId ? data : n) } : f))
    }
  }

  async function saveNoteEdit() {
    if (!editingNote) return
    setSaving(true)
    const res = await fetch('/api/study/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingNote.id, content: noteEditContent }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setSelectedNote(data)
      setFronts(prev => prev.map(f => ({ ...f, notes: f.notes.map(n => n.id === data.id ? data : n) })))
      setEditingNote(null)
    }
  }

  async function saveMentalImageEdit(noteId: string, frontId: string) {
    const res = await fetch('/api/study/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId, mentalImage: mentalImageEdit, mentalImageEdited: true }),
    })
    const data = await res.json()
    if (res.ok) {
      setSelectedNote(data)
      setFronts(prev => prev.map(f => f.id === frontId ? { ...f, notes: f.notes.map(n => n.id === data.id ? data : n) } : f))
      setEditingMentalImage(false)
    }
  }

  async function deleteNote(noteId: string, frontId: string) {
    if (!confirm('¿Eliminar esta nota?')) return
    await fetch('/api/study/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId }),
    })
    setFronts(prev => prev.map(f => f.id === frontId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f))
    setSelectedNote(null)
  }

  async function deleteFront(frontId: string) {
    if (!confirm('¿Eliminar este frente y todas sus notas?')) return
    await fetch('/api/study/fronts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: frontId }),
    })
    setFronts(prev => prev.filter(f => f.id !== frontId))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-20 rounded-2xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    )
  }

  const notesFront = selectedNote ? fronts.find(f => f.notes.some(n => n.id === selectedNote.id)) : null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/study" className="btn-ghost btn-sm mb-6 inline-flex">← Volver a temas</Link>

      {/* Topic header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📚</span>
          <h1 className="page-title">{topic?.name || 'Tema'}</h1>
        </div>
        {topic?.description && <p className="text-slate-400 text-sm">{topic.description}</p>}
      </div>

      {/* New Front button */}
      <button onClick={() => setShowNewFront(true)} className="btn-secondary w-full mb-5 border-dashed" id="new-front-btn">
        + Nuevo Frente
      </button>

      {/* Create front form */}
      {showNewFront && (
        <div className="card mb-5 border-violet-500/30 bg-violet-500/[0.06]">
          <h3 className="text-sm font-semibold text-violet-300 mb-3">Nuevo Frente</h3>
          <div className="space-y-3">
            <input type="text" value={frontForm.name} onChange={e => setFrontForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Nombre del frente (ej. Fundamentos, Casos de uso...)" id="front-name" />
            <input type="text" value={frontForm.description} onChange={e => setFrontForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Descripción (opcional)" />
            <div className="flex gap-3">
              <button onClick={() => setShowNewFront(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={createFront} disabled={!frontForm.name} className="btn-primary flex-1">Crear Frente</button>
            </div>
          </div>
        </div>
      )}

      {/* Fronts list */}
      <div className="space-y-4">
        {fronts.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-2xl mb-2">📚</p>
            <p className="text-slate-400">No hay frentes todavía</p>
          </div>
        )}
        {fronts.map(front => (
          <div key={front.id} className="card">
            {/* Front header */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setExpandedFront(expandedFront === front.id ? null : front.id)}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-slate-100">{front.name}</h3>
                {front.description && <p className="text-xs text-slate-500 mt-0.5">{front.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-purple">{front.notes.length} notas</span>
                <button onClick={e => { e.stopPropagation(); deleteFront(front.id) }} className="btn-danger btn-sm">🗑</button>
                <span className="text-slate-500">{expandedFront === front.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Notes list */}
            {expandedFront === front.id && (
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <button
                  onClick={() => setShowNewNote(front.id)}
                  className="btn-secondary btn-sm w-full mb-3"
                  id={`new-note-${front.id}`}
                >
                  + Nueva Nota
                </button>

                {/* New note form */}
                {showNewNote === front.id && (
                  <div className="mb-4 space-y-3">
                    <textarea
                      className="textarea w-full"
                      rows={5}
                      placeholder="Escribe tu nota aquí. La IA redactará automáticamente una descripción visual mnemotécnica en texto y una pregunta de repaso..."
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      id={`note-content-${front.id}`}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowNewNote(null)} className="btn-secondary flex-1">Cancelar</button>
                      <button
                        onClick={() => createNote(front.id)}
                        disabled={saving || !noteContent.trim()}
                        className="btn-primary flex-1"
                      >
                        {saving ? 'Guardando...' : '💾 Guardar Nota'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {front.notes.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">No hay notas en este frente</p>
                  )}
                  {front.notes.map(note => (
                    <div
                      key={note.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all"
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{note.content.slice(0, 80)}{note.content.length > 80 ? '...' : ''}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{formatDate(note.createdAt)}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {note.mentalImage && <span className="badge badge-green text-[10px]">🧠 IA Texto</span>}
                        {note.spacedRepetition && <span className="badge badge-purple text-[10px]">SR</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note detail modal */}
      {selectedNote && notesFront && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedNote(null)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Nota · {notesFront.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => { setEditingNote(selectedNote); setNoteEditContent(selectedNote.content) }} className="btn-ghost btn-sm">✏️ Editar</button>
                <button onClick={() => deleteNote(selectedNote.id, notesFront.id)} className="btn-danger btn-sm">🗑</button>
                <button onClick={() => setSelectedNote(null)} className="btn-ghost btn-sm">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Note content */}
              {editingNote?.id === selectedNote.id ? (
                <div className="space-y-3">
                  <textarea
                    className="textarea w-full"
                    rows={6}
                    value={noteEditContent}
                    onChange={e => setNoteEditContent(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setEditingNote(null)} className="btn-secondary flex-1">Cancelar</button>
                    <button onClick={saveNoteEdit} disabled={saving} className="btn-primary flex-1">
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose-dark">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>
                </div>
              )}

              {/* Mental Image Description (Text) */}
              <div className={`rounded-2xl p-4 ${generatingAI ? 'bg-violet-500/[0.06] border border-violet-500/20' : selectedNote.mentalImage ? 'bg-gradient-to-br from-violet-900/40 to-blue-900/40 border border-violet-500/30' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-violet-300">🧠 Descripción Visual Mental (Texto)</p>
                  {selectedNote.mentalImage && !generatingAI && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingMentalImage(true); setMentalImageEdit(selectedNote.mentalImage || '') }}
                        className="btn-ghost btn-sm"
                      >
                        ✏️ Editar
                      </button>
                      <button onClick={() => regenerateAI(selectedNote.id, notesFront.id)} className="btn-ghost btn-sm">
                        🔄 Redactar de nuevo
                      </button>
                    </div>
                  )}
                </div>

                {generatingAI ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-violet-500/50 border-t-violet-400 rounded-full animate-spin" />
                    <p className="text-sm text-violet-400">Redactando descripción visual con IA...</p>
                  </div>
                ) : editingMentalImage ? (
                  <div className="space-y-3">
                    <textarea
                      className="textarea w-full"
                      rows={4}
                      value={mentalImageEdit}
                      onChange={e => setMentalImageEdit(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingMentalImage(false)} className="btn-secondary flex-1">Cancelar</button>
                      <button onClick={() => saveMentalImageEdit(selectedNote.id, notesFront.id)} className="btn-primary flex-1">Guardar</button>
                    </div>
                  </div>
                ) : selectedNote.mentalImage ? (
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{selectedNote.mentalImage}</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-600">Sin descripción visual</p>
                    <button onClick={() => regenerateAI(selectedNote.id, notesFront.id)} className="btn-ghost btn-sm">
                      Redactar con IA →
                    </button>
                  </div>
                )}
              </div>

              {/* Flashcard */}
              {selectedNote.flashcard && (
                <div className="rounded-2xl p-4 bg-amber-500/[0.06] border border-amber-500/30">
                  <p className="text-sm font-semibold text-amber-300 mb-2">📇 Flashcard (pregunta de repaso)</p>
                  <p className="text-sm text-slate-300 italic">{selectedNote.flashcard}</p>
                </div>
              )}

              {/* SR next review */}
              {selectedNote.spacedRepetition && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">📅 Próximo repaso:</span>
                  <span className="badge badge-purple">{formatDate(selectedNote.spacedRepetition.nextReviewDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
