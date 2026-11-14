import { useState, useMemo } from 'react'

export type SortKey = 'name' | 'mealType' | 'itemClass' | 'category' | 'priceScore' | 'healthScore' | 'totalVotes' | 'suggestedBy'
export type SortDirection = 'asc' | 'desc'

export function useDishSort(dishes: any[], dishStats: any[] = []) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null)

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const defaultSort = (a: any, b: any) => {
    const mealOrder: Record<string, number> = { Breakfast: 1, Lunch: 2, Snack: 3, Dinner: 4 }
    const orderA = mealOrder[a.mealType] || 99
    const orderB = mealOrder[b.mealType] || 99
    if (orderA !== orderB) return orderA - orderB
    return (a.category || '').localeCompare(b.category || '')
  }

  const sortedDishes = useMemo(() => {
    return [...dishes].sort((a, b) => {
      if (!sortConfig) return defaultSort(a, b)

      const { key, direction } = sortConfig
      let comparison = 0

      if (key === 'totalVotes') {
        const votesA = dishStats.find((s) => s._id === a._id)?.totalVotes || 0
        const votesB = dishStats.find((s) => s._id === b._id)?.totalVotes || 0
        comparison = votesA - votesB
      } else if (key === 'suggestedBy') {
        const nameA = a.suggestedBy?.name || ''
        const nameB = b.suggestedBy?.name || ''
        comparison = nameA.localeCompare(nameB)
      } else {
        const valA = a[key] ?? ''
        const valB = b[key] ?? ''
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB
        } else {
          comparison = String(valA).localeCompare(String(valB))
        }
      }

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison
      }

      return defaultSort(a, b)
    })
  }, [dishes, sortConfig, dishStats])

  return { sortConfig, handleSort, sortedDishes }
}
