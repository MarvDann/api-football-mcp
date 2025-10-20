import { padString, safeString } from './string-utils'

export interface TableColumn<T = unknown> {
  key: keyof T | string
  header: string
  align?: 'left' | 'right' | 'center'
}

export interface TableOptions {
  maxRows?: number
  showFooter?: boolean
}

export function renderTable<T extends Record<string, unknown>> (
  columns: TableColumn<T>[],
  rows: T[],
  options: TableOptions = {}
): string {
  const maxRows = options.maxRows ?? rows.length
  const visible = rows.slice(0, maxRows)

  const headerCells = columns.map(c => c.header)
  const dataCells = visible.map(row =>
    columns.map(c => safeString((row as Record<string, unknown>)[c.key as string]))
  )

  const colWidths = columns.map((_, i) =>
    Math.max(
      headerCells[i]?.length ?? 0,
      ...dataCells.map(r => r[i]?.length ?? 0)
    )
  )

  const header = headerCells.map((h, i) => padString(h, colWidths[i] ?? 0)).join(' | ')
  const sep = colWidths.map(w => '-'.repeat(w ?? 0)).join('-|-')
  const body = dataCells.map(cells =>
    cells.map((cell, i) => padString(cell, colWidths[i] ?? 0)).join(' | ')
  ).join('\n')

  let out = `${header}\n${sep}\n${body}`

  if (options.showFooter) {
    const total = rows.length
    const showing = visible.length
    out += `\n\n${total} results (showing ${showing}). Use format=json for full JSON.`
  }

  return out
}
