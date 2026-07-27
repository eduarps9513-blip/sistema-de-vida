export function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getCurrentWeekOfCycle(startDate: Date | string): number {
  const now = new Date()
  const start = new Date(startDate)
  const diff = now.getTime() - start.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1))
}

export function getWeekDateRange(startDate: Date | string, weekNumber: number): string {
  if (!startDate) return ''
  const start = new Date(startDate)
  if (isNaN(start.getTime())) return ''

  const weekStart = new Date(start)
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const formatShort = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

  return `${formatShort(weekStart)} – ${formatShort(weekEnd)}`
}

export function getDaysUntilDate(date: Date | string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getDaysSince(date: Date | string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const past = new Date(date)
  past.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

export const LIFEBOOK_CATEGORIES = [
  { slug: 'HEALTH', label: 'Salud y Fitness', icon: '💪', color: 'from-green-500 to-emerald-600' },
  { slug: 'INTELLECTUAL', label: 'Vida Intelectual', icon: '🧠', color: 'from-blue-500 to-indigo-600' },
  { slug: 'EMOTIONAL', label: 'Vida Emocional', icon: '❤️', color: 'from-pink-500 to-rose-600' },
  { slug: 'CHARACTER', label: 'Carácter', icon: '⚡', color: 'from-yellow-500 to-amber-600' },
  { slug: 'SPIRITUAL', label: 'Vida Espiritual', icon: '✨', color: 'from-purple-500 to-violet-600' },
  { slug: 'PARTNERSHIP', label: 'Relación de Pareja', icon: '💑', color: 'from-red-500 to-pink-600' },
  { slug: 'PARENTING', label: 'Paternidad', icon: '👨‍👧', color: 'from-orange-500 to-amber-600' },
  { slug: 'SOCIAL', label: 'Vida Social', icon: '🤝', color: 'from-cyan-500 to-teal-600' },
  { slug: 'FINANCIAL', label: 'Vida Financiera', icon: '💰', color: 'from-emerald-500 to-green-600' },
  { slug: 'CAREER', label: 'Carrera', icon: '🚀', color: 'from-indigo-500 to-blue-600' },
  { slug: 'QUALITY_OF_LIFE', label: 'Calidad de Vida', icon: '🌟', color: 'from-violet-500 to-purple-600' },
  { slug: 'LIFE_VISION', label: 'Visión de Vida', icon: '🔭', color: 'from-slate-500 to-gray-600' },
]

export function getLifebookCategory(slug: string) {
  return LIFEBOOK_CATEGORIES.find(c => c.slug === slug)
}
