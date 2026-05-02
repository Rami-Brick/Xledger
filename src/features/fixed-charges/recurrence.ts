import type { FixedCharge } from './api'

const ISO_DATE_LENGTH = 10

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateKey() {
  return formatDateKey(new Date())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, 0, 1)
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function getDueDayInMonth(charge: Pick<FixedCharge, 'due_day_mode' | 'due_day_of_month'>, year: number, monthIndex: number) {
  if (charge.due_day_mode === 'last_day_of_month') {
    return daysInMonth(year, monthIndex)
  }

  const requestedDay = charge.due_day_of_month ?? 1
  return Math.min(requestedDay, daysInMonth(year, monthIndex))
}

function compareDates(a: Date, b: Date) {
  return formatDateKey(a).localeCompare(formatDateKey(b))
}

function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
}

function isoWeekday(date: Date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function generateWeeklyDates(charge: FixedCharge, start: Date, end: Date) {
  if (!charge.due_day_of_week) return []

  const dates: string[] = []
  const first = new Date(start)
  const offset = (charge.due_day_of_week - isoWeekday(first) + 7) % 7
  first.setDate(first.getDate() + offset)

  for (let cursor = first; compareDates(cursor, end) <= 0; cursor = addWeeks(cursor, charge.recurrence_interval)) {
    dates.push(formatDateKey(cursor))
  }

  return dates
}

function generateMonthlyDates(charge: FixedCharge, start: Date, end: Date) {
  const dates: string[] = []
  const anchorMonth = new Date(start.getFullYear(), start.getMonth(), 1)

  for (
    let cursorMonth = anchorMonth;
    compareDates(cursorMonth, end) <= 0;
    cursorMonth = addMonths(cursorMonth, 1)
  ) {
    if (monthsBetween(anchorMonth, cursorMonth) % charge.recurrence_interval !== 0) continue

    const dueDate = new Date(
      cursorMonth.getFullYear(),
      cursorMonth.getMonth(),
      getDueDayInMonth(charge, cursorMonth.getFullYear(), cursorMonth.getMonth())
    )

    if (compareDates(dueDate, start) >= 0 && compareDates(dueDate, end) <= 0) {
      dates.push(formatDateKey(dueDate))
    }
  }

  return dates
}

function generateYearlyDates(charge: FixedCharge, start: Date, end: Date) {
  if (!charge.due_month) return []

  const dates: string[] = []
  const anchorYear = new Date(start.getFullYear(), 0, 1)

  for (
    let cursorYear = anchorYear;
    compareDates(cursorYear, end) <= 0;
    cursorYear = addYears(cursorYear, 1)
  ) {
    const yearsFromStart = cursorYear.getFullYear() - anchorYear.getFullYear()
    if (yearsFromStart % charge.recurrence_interval !== 0) continue

    const monthIndex = charge.due_month - 1
    const dueDate = new Date(
      cursorYear.getFullYear(),
      monthIndex,
      getDueDayInMonth(charge, cursorYear.getFullYear(), monthIndex)
    )

    if (compareDates(dueDate, start) >= 0 && compareDates(dueDate, end) <= 0) {
      dates.push(formatDateKey(dueDate))
    }
  }

  return dates
}

export function generateFixedChargeDueDates(charge: FixedCharge, todayKey = getTodayDateKey()) {
  if (!charge.is_active || !charge.schedule_enabled || !charge.schedule_start_date) return []
  if (charge.schedule_start_date.length !== ISO_DATE_LENGTH) return []

  const interval = Math.max(1, charge.recurrence_interval || 1)
  const normalizedCharge = { ...charge, recurrence_interval: interval }
  const start = parseDate(charge.schedule_start_date)
  const end = addDays(parseDate(todayKey), Math.max(0, charge.generate_days_ahead || 0))

  if (compareDates(start, end) > 0) return []

  const dates =
    normalizedCharge.recurrence_frequency === 'weekly'
      ? generateWeeklyDates(normalizedCharge, start, end)
      : normalizedCharge.recurrence_frequency === 'yearly'
        ? generateYearlyDates(normalizedCharge, start, end)
        : generateMonthlyDates(normalizedCharge, start, end)

  return Array.from(new Set(dates)).sort()
}
