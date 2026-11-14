import { Card } from '@/components/ui/card'
import { TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table'
import { DishTableRow } from './DishTableRow'

interface DishCatalogTableProps {
  activeTab: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE'
  sortedDishes: any[]
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  dishStats: any[]
  totalVoters: number
  onSort: (key: string) => void
  onRowClick: (dish: any) => void
  onEdit: (dish: any) => void
  onDeleteConfirm: (id: string) => void
  onDeactivateConfirm: (id: string) => void
  onApproveConfirm: (id: string) => void
  onRejectConfirm: (id: string) => void
  onToggleStatus: (id: string, status: string) => void
}

export function DishCatalogTable({
  activeTab,
  sortedDishes,
  sortConfig,
  dishStats,
  totalVoters,
  onSort,
  onRowClick,
  onEdit,
  onDeleteConfirm,
  onDeactivateConfirm,
  onApproveConfirm,
  onRejectConfirm,
  onToggleStatus,
}: DishCatalogTableProps) {
  if (sortedDishes.length === 0) {
    return (
      <Card className="p-8 text-center text-muted border-hairline shadow-none">
        No dishes found for this category.
      </Card>
    )
  }

  const renderSortArrow = (key: string) => {
    return (
      <span className="w-3 inline-block text-center">
        {sortConfig?.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
      </span>
    )
  }

  return (
    <Card className="overflow-hidden border-hairline shadow-none">
      <div className="overflow-auto w-full max-h-[75vh] custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <TableHeader className="sticky top-0 z-20 bg-surface-soft shadow-sm">
            <TableRow className="bg-surface-soft hover:bg-surface-soft">
              <TableHead
                className="text-center cursor-pointer hover:bg-surface transition-colors w-1/4 sticky left-0 z-30 bg-surface-soft shadow-[1px_0_0_0_var(--color-hairline)]"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center justify-center gap-1">
                  Name {renderSortArrow('name')}
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-surface transition-colors"
                onClick={() => onSort('mealType')}
              >
                <div className="flex items-center justify-center gap-1">
                  Meal Type {renderSortArrow('mealType')}
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-surface transition-colors"
                onClick={() => onSort('itemClass')}
              >
                <div className="flex items-center justify-center gap-1">
                  Fixed {renderSortArrow('itemClass')}
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-surface transition-colors"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center justify-center gap-1">
                  Category {renderSortArrow('category')}
                </div>
              </TableHead>

              {activeTab === 'ACTIVE' ? (
                <>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => onSort('priceScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Price {renderSortArrow('priceScore')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => onSort('healthScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Health {renderSortArrow('healthScore')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Tags</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => onSort('totalVotes')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Votes {renderSortArrow('totalVotes')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Reviews</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>
              ) : activeTab === 'UNDER_REVIEW' ? (
                <>
                  <TableHead className="text-center">Tags</TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => onSort('suggestedBy')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Suggested By {renderSortArrow('suggestedBy')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-center">Tags</TableHead>
                  <TableHead className="text-center">Reason</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDishes.map((dish) => (
              <DishTableRow
                key={dish._id}
                dish={dish}
                activeTab={activeTab}
                dishStats={dishStats}
                totalVoters={totalVoters}
                onRowClick={onRowClick}
                onEdit={onEdit}
                onDeleteConfirm={onDeleteConfirm}
                onDeactivateConfirm={onDeactivateConfirm}
                onApproveConfirm={onApproveConfirm}
                onRejectConfirm={onRejectConfirm}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </TableBody>
        </table>
      </div>
    </Card>
  )
}
