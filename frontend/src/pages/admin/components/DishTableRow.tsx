import { TableRow, TableCell } from '@/components/ui/table'
import { Pencil, Trash2, CheckCircle, XCircle, Ban } from 'lucide-react'

interface DishTableRowProps {
  dish: any
  activeTab: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE'
  dishStats: any[]
  totalVoters: number
  onRowClick: (dish: any) => void
  onEdit: (dish: any) => void
  onDeleteConfirm: (id: string) => void
  onDeactivateConfirm: (id: string) => void
  onApproveConfirm: (id: string) => void
  onRejectConfirm: (id: string) => void
  onToggleStatus: (id: string, status: string) => void
}

export function DishTableRow({
  dish: d,
  activeTab,
  dishStats,
  totalVoters,
  onRowClick,
  onEdit,
  onDeleteConfirm,
  onDeactivateConfirm,
  onApproveConfirm,
  onRejectConfirm,
  onToggleStatus,
}: DishTableRowProps) {
  const stats = dishStats.find((s) => s._id === d._id)

  return (
    <TableRow
      key={d._id}
      className={`transition-colors hover:bg-surface-soft ${activeTab === 'ACTIVE' ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (activeTab === 'ACTIVE') onRowClick(d)
      }}
    >
      <TableCell className="font-medium text-ink sticky left-0 z-10 bg-canvas shadow-[1px_0_0_0_var(--color-hairline)]">
        {d.name}
      </TableCell>
      <TableCell className="text-center">{d.mealType}</TableCell>
      <TableCell className="text-center">
        <span
          className={`px-2 py-0.5 rounded-full text-caption font-medium border ${
            d.itemClass === 'FIXED'
              ? 'bg-canvas text-ink border-hairline'
              : 'bg-surface-soft text-muted border-hairline'
          }`}
        >
          {d.itemClass === 'FIXED' ? 'Fixed Daily' : 'Rotating'}
        </span>
      </TableCell>
      <TableCell className="text-center">{d.category}</TableCell>

      {activeTab === 'ACTIVE' ? (
        <>
          <TableCell className="text-center text-muted">{d.priceScore || '—'}</TableCell>
          <TableCell className="text-center text-muted">{d.healthScore || '—'}</TableCell>
          <TableCell className="text-center truncate max-w-[150px]" title={d.tags?.join(', ')}>
            {d.tags?.join(', ') || '—'}
          </TableCell>
          <TableCell className="text-center">
            {stats?.averageRating ? (
              <span className="font-medium text-ink">{Number(stats.averageRating).toFixed(1)} / 5</span>
            ) : (
              <span className="text-muted">No ratings</span>
            )}
          </TableCell>
          <TableCell className="text-center">
            <span className="font-medium text-ink">{stats?.totalVotes || 0}</span>
            <span className="text-muted text-body-sm"> / {totalVoters}</span>
          </TableCell>
          <TableCell className="text-center text-muted">{stats?.totalReviews || 0}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeactivateConfirm(d._id)
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-warning) hover:bg-(--color-semantic-warning)/10 rounded transition-colors"
                title="Deactivate"
              >
                <Ban className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(d)
                }}
                className="p-1.5 text-muted hover:text-ink hover:bg-surface rounded transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteConfirm(d._id)
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-error) hover:bg-(--color-semantic-error)/10 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </>
      ) : activeTab === 'UNDER_REVIEW' ? (
        <>
          <TableCell className="text-center truncate max-w-[150px]" title={d.tags?.join(', ')}>
            {d.tags?.join(', ') || '—'}
          </TableCell>
          <TableCell className="text-muted text-center">{d.suggestedBy?.name || '—'}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApproveConfirm(d._id)
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-success) hover:bg-(--color-semantic-success)/10 rounded transition-colors"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRejectConfirm(d._id)
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-error) hover:bg-(--color-semantic-error)/10 rounded transition-colors"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-center py-2 truncate max-w-[150px]" title={d.tags?.join(', ')}>
            {d.tags?.join(', ') || '—'}
          </TableCell>
          <TableCell className="text-muted py-2 text-center truncate max-w-[150px]" title={d.rejectionReason}>
            {d.rejectionReason || '—'}
          </TableCell>
          <TableCell className="text-center py-2">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStatus(d._id, 'ACTIVE')
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-success) hover:bg-(--color-semantic-success)/10 rounded transition-colors"
                title="Reactivate"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteConfirm(d._id)
                }}
                className="p-1.5 text-muted hover:text-(--color-semantic-error) hover:bg-(--color-semantic-error)/10 rounded transition-colors"
                title="Delete Permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  )
}
