import React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'

interface DishActionModalsProps {
  // Reviews
  reviewsModal: { isOpen: boolean; dish: any; reviews: any[]; loading: boolean } | null
  onCloseReviews: () => void

  // Delete
  deleteConfirmId: string | null
  onCloseDelete: () => void
  onConfirmDelete: () => void

  // Deactivate
  deactivateConfirmId: string | null
  deactivateReason: string
  onCloseDeactivate: () => void
  onDeactivateReasonChange: (reason: string) => void
  onConfirmDeactivate: (e: React.FormEvent) => void

  // Approve
  approveConfirmId: string | null
  approveScores: { priceScore: number; healthScore: number }
  onCloseApprove: () => void
  onApproveScoresChange: (scores: { priceScore: number; healthScore: number }) => void
  onConfirmApprove: (e: React.FormEvent) => void

  // Reject
  rejectConfirmId: string | null
  rejectReason: string
  onCloseReject: () => void
  onRejectReasonChange: (reason: string) => void
  onConfirmReject: (e: React.FormEvent) => void
}

export function DishActionModals({
  reviewsModal,
  onCloseReviews,
  deleteConfirmId,
  onCloseDelete,
  onConfirmDelete,
  deactivateConfirmId,
  deactivateReason,
  onCloseDeactivate,
  onDeactivateReasonChange,
  onConfirmDeactivate,
  approveConfirmId,
  approveScores,
  onCloseApprove,
  onApproveScoresChange,
  onConfirmApprove,
  rejectConfirmId,
  rejectReason,
  onCloseReject,
  onRejectReasonChange,
  onConfirmReject,
}: DishActionModalsProps) {
  return (
    <>
      {/* Reviews Modal */}
      <Modal
        isOpen={!!reviewsModal?.isOpen}
        onClose={onCloseReviews}
        title={`Reviews for ${reviewsModal?.dish?.name || 'Dish'}`}
      >
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {reviewsModal?.loading ? (
            <div className="text-center text-muted text-body py-8">Loading reviews...</div>
          ) : reviewsModal?.reviews?.length === 0 ? (
            <div className="text-center text-muted text-body py-8">No reviews yet for this dish.</div>
          ) : (
            <div className="space-y-4">
              {reviewsModal?.reviews?.map((r: any) => (
                <div key={r._id} className="p-4 bg-surface-soft border border-hairline rounded flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-ink block">{r.studentId?.name || 'Unknown Student'}</span>
                      <span className="text-caption text-muted">{formatDate(r.createdAt, true)}</span>
                    </div>
                    <span className="text-body-sm font-mono text-semantic-warning bg-semantic-warning/10 px-2 py-1 rounded">
                      ★ {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="text-body-sm text-ink mt-1 italic leading-relaxed">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={onCloseDelete} title="Delete Dish">
        <div className="p-6">
          <p className="text-body text-ink mb-6">Are you sure you want to delete this dish? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCloseDelete}>Cancel</Button>
            <Button variant="primary" onClick={onConfirmDelete} className="bg-(--color-semantic-error) hover:bg-(--color-semantic-error)/90 border-(--color-semantic-error)">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal isOpen={!!deactivateConfirmId} onClose={onCloseDeactivate} title="Deactivate Dish">
        <form onSubmit={onConfirmDeactivate} className="p-6 space-y-4">
          <p className="text-body-sm text-muted">Please provide a reason for deactivating this dish:</p>
          <Input
            required
            placeholder="e.g. Out of stock, seasonal pause, low feedback"
            value={deactivateReason}
            onChange={(e) => onDeactivateReasonChange(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCloseDeactivate}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-(--color-semantic-warning) hover:bg-(--color-semantic-warning)/90 border-(--color-semantic-warning)">Deactivate</Button>
          </div>
        </form>
      </Modal>

      {/* Approve Modal */}
      <Modal isOpen={!!approveConfirmId} onClose={onCloseApprove} title="Approve Dish Suggestion">
        <form onSubmit={onConfirmApprove} className="p-6 space-y-4">
          <p className="text-body-sm text-muted">Set scores before activating this dish in the catalog:</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm mb-1.5 flex items-center justify-between">
                <span>Price Score</span>
                <span className="text-muted text-body-xs bg-surface px-1.5 py-0.5 rounded">1-5</span>
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                value={approveScores.priceScore}
                onChange={(e) => onApproveScoresChange({ ...approveScores, priceScore: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-body-sm mb-1.5 flex items-center justify-between">
                <span>Health Score</span>
                <span className="text-muted text-body-xs bg-surface px-1.5 py-0.5 rounded">1-5</span>
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                value={approveScores.healthScore}
                onChange={(e) => onApproveScoresChange({ ...approveScores, healthScore: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={onCloseApprove}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-(--color-semantic-success) hover:bg-(--color-semantic-success)/90 border-(--color-semantic-success)">Approve & Activate</Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectConfirmId} onClose={onCloseReject} title="Reject Dish Suggestion">
        <form onSubmit={onConfirmReject} className="p-6 space-y-4">
          <p className="text-body-sm text-muted">Please specify a reason for rejecting this suggestion:</p>
          <Input
            required
            placeholder="e.g. Not feasible with kitchen budget, difficult supply"
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCloseReject}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-(--color-semantic-error) hover:bg-(--color-semantic-error)/90 border-(--color-semantic-error)">Reject</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
