import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { useApi } from '../../hooks/useApi'
import { useDishSort } from './hooks/useDishSort'
import { DishCatalogTable } from './components/DishCatalogTable'
import { DishFormModal } from './components/DishForms'
import { DishActionModals } from './components/DishActionModals'

type TabType = 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE'

export default function AdminDishManagement() {
  const { request } = useApi()
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE')
  const [dishes, setDishes] = useState<any[]>([])
  const [dishStats, setDishStats] = useState<any[]>([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [mealPlan, setMealPlan] = useState<any[]>([])
  const [tagLibrary, setTagLibrary] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingDishId, setEditingDishId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [reviewsModal, setReviewsModal] = useState<{ isOpen: boolean; dish: any; reviews: any[]; loading: boolean } | null>(null)

  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null)
  const [approveScores, setApproveScores] = useState({ priceScore: 3, healthScore: 3 })

  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    mealType: 'Lunch',
    category: 'Main Course',
    tags: [] as string[],
    priceScore: 3,
    healthScore: 3,
    itemClass: 'ROTATING'
  })

  const { sortConfig, handleSort, sortedDishes } = useDishSort(dishes, dishStats)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [data, tagData] = await Promise.all([
          request('/admin/settings'),
          request('/admin/dishes/tags').catch(() => ({ tags: [] }))
        ])
        if (tagData?.tags) setTagLibrary(tagData.tags)
        if (data?.mealPlan && data.mealPlan.length > 0) {
          setMealPlan(data.mealPlan)
          setFormData(prev => ({
            ...prev,
            mealType: data.mealPlan[0].mealName,
            category: data.mealPlan[0].categories?.[0]?.categoryName || ''
          }))
        }
      } catch (err) {
        console.error('Failed to load settings', err)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    loadDishes()
  }, [activeTab])

  const loadDishes = async () => {
    setLoading(true)
    try {
      if (activeTab === 'ACTIVE') {
        const [dishesData, statsData] = await Promise.all([
          request(`/admin/dishes?status=${activeTab}`),
          request('/admin/reviews/stats')
        ])
        setDishes(dishesData || [])
        const stats = statsData?.dishStats || []
        const votes = statsData?.votingStats || []
        setDishStats(
          stats.map((s: any) => {
            const v = votes.find((item: any) => item._id === s._id)
            return { ...s, totalVotes: v ? v.totalVotes : 0 }
          })
        )
        setTotalVoters(statsData?.totalVoters || 0)
      } else {
        const data = await request(`/admin/dishes?status=${activeTab}`)
        setDishes(data || [])
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to load dishes')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (dish: any) => {
    setFormData({
      name: dish.name,
      mealType: dish.mealType,
      category: dish.category,
      tags: Array.isArray(dish.tags) ? dish.tags : [],
      priceScore: dish.priceScore || 3,
      healthScore: dish.healthScore || 3,
      itemClass: dish.itemClass || 'ROTATING'
    })
    setEditingDishId(dish._id)
    setShowModal(true)
  }

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        priceScore: Number(formData.priceScore),
        healthScore: Number(formData.healthScore)
      }

      if (editingDishId) {
        await request(`/admin/dishes/${editingDishId}`, 'PUT', payload)
        toast.success('Dish updated successfully!')
      } else {
        await request('/admin/dishes', 'POST', payload)
        toast.success('Dish created successfully!')
      }

      setShowModal(false)
      setEditingDishId(null)
      setFormData({
        name: '',
        mealType: mealPlan[0]?.mealName || 'Lunch',
        category: mealPlan[0]?.categories?.[0]?.categoryName || 'Main Course',
        tags: [],
        priceScore: 3,
        healthScore: 3,
        itemClass: 'ROTATING'
      })
      loadDishes()
      request('/admin/dishes/tags').then(res => {
        if (res?.tags) setTagLibrary(res.tags)
      }).catch(() => {})
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to save dish')
    }
  }

  const handleDeleteDish = async () => {
    if (!deleteConfirmId) return
    try {
      await request(`/admin/dishes/${deleteConfirmId}`, 'DELETE')
      toast.success('Dish deleted successfully!')
      loadDishes()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete dish')
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deactivateConfirmId) return
    const dishId = deactivateConfirmId
    const note = deactivateReason
    const prevDishes = [...dishes]

    // Optimistic update
    setDishes(prev => prev.map(d => d._id === dishId ? { ...d, status: 'INACTIVE' } : d))
    setDeactivateConfirmId(null)
    setDeactivateReason('')

    try {
      await request(`/admin/dishes/${dishId}/toggle-status`, 'PATCH', { status: 'INACTIVE', note })
      toast.success('Dish deactivated successfully!')
      loadDishes()
    } catch (err: unknown) {
      setDishes(prevDishes)
      toast.error((err as Error).message || 'Failed to deactivate dish')
    }
  }

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveConfirmId) return
    const dishId = approveConfirmId
    const prevDishes = [...dishes]

    // Optimistic update
    setDishes(prev => prev.filter(d => d._id !== dishId))
    setApproveConfirmId(null)

    try {
      await request(`/admin/dishes/${dishId}/approve`, 'POST', approveScores)
      toast.success('Dish approved successfully!')
      loadDishes()
    } catch (err: unknown) {
      setDishes(prevDishes)
      toast.error((err as Error).message || 'Failed to approve dish')
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectConfirmId) return
    try {
      await request(`/admin/dishes/${rejectConfirmId}/reject`, 'POST', { reason: rejectReason })
      toast.success('Dish rejected successfully!')
      loadDishes()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to reject dish')
    } finally {
      setRejectConfirmId(null)
      setRejectReason('')
    }
  }

  const handleToggleStatus = async (id: string, status: string) => {
    const prevDishes = [...dishes]

    // Optimistic update
    setDishes(prev => prev.map(d => d._id === id ? { ...d, status } : d))

    try {
      await request(`/admin/dishes/${id}/toggle-status`, 'PATCH', { status })
      toast.success('Dish status updated!')
      loadDishes()
    } catch (err: unknown) {
      setDishes(prevDishes)
      toast.error((err as Error).message || 'Failed to update status')
    }
  }

  const openReviewsModal = async (dish: any) => {
    setReviewsModal({ isOpen: true, dish, reviews: [], loading: true })
    try {
      const data = await request(`/admin/reviews?dishId=${dish._id}`)
      setReviewsModal({ isOpen: true, dish, reviews: data?.reviews || [], loading: false })
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch reviews')
      setReviewsModal({ isOpen: true, dish, reviews: [], loading: false })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-end border-b border-hairline mb-6 gap-3 sm:gap-0">
        <div className="flex overflow-x-auto w-full sm:w-auto no-scrollbar">
          {(['ACTIVE', 'UNDER_REVIEW', 'INACTIVE'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 border-b-2 text-body whitespace-nowrap transition-colors -mb-[1px] ${
                activeTab === tab
                  ? 'border-ink text-ink font-medium'
                  : 'border-transparent text-muted hover:text-ink hover:border-hairline'
              }`}
            >
              {tab === 'ACTIVE' ? 'Active Dishes' : tab === 'UNDER_REVIEW' ? 'Suggestions' : 'Rejected Dishes'}
            </button>
          ))}
        </div>
        <div className="pb-2 w-full sm:w-auto">
          <Button
            variant="primary"
            className="h-9 w-full sm:w-auto"
            onClick={() => {
              setEditingDishId(null)
              setFormData({
                name: '',
                mealType: mealPlan[0]?.mealName || 'Lunch',
                category: mealPlan[0]?.categories?.[0]?.categoryName || 'Main Course',
                tags: [],
                priceScore: 3,
                healthScore: 3,
                itemClass: 'ROTATING'
              })
              setShowModal(true)
            }}
          >
            Add New Dish
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted">Loading dishes...</div>
      ) : (
        <DishCatalogTable
          activeTab={activeTab}
          sortedDishes={sortedDishes}
          sortConfig={sortConfig}
          dishStats={dishStats}
          totalVoters={totalVoters}
          onSort={handleSort}
          onRowClick={openReviewsModal}
          onEdit={handleEditClick}
          onDeleteConfirm={setDeleteConfirmId}
          onDeactivateConfirm={setDeactivateConfirmId}
          onApproveConfirm={setApproveConfirmId}
          onRejectConfirm={setRejectConfirmId}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <DishFormModal
        showModal={showModal}
        editingDishId={editingDishId}
        formData={formData}
        mealPlan={mealPlan}
        tagLibrary={tagLibrary}
        onClose={() => setShowModal(false)}
        onChange={setFormData}
        onSubmit={handleSaveDish}
      />

      <DishActionModals
        reviewsModal={reviewsModal}
        onCloseReviews={() => setReviewsModal(null)}
        deleteConfirmId={deleteConfirmId}
        onCloseDelete={() => setDeleteConfirmId(null)}
        onConfirmDelete={handleDeleteDish}
        deactivateConfirmId={deactivateConfirmId}
        deactivateReason={deactivateReason}
        onCloseDeactivate={() => { setDeactivateConfirmId(null); setDeactivateReason(''); }}
        onDeactivateReasonChange={setDeactivateReason}
        onConfirmDeactivate={handleDeactivate}
        approveConfirmId={approveConfirmId}
        approveScores={approveScores}
        onCloseApprove={() => setApproveConfirmId(null)}
        onApproveScoresChange={setApproveScores}
        onConfirmApprove={handleApprove}
        rejectConfirmId={rejectConfirmId}
        rejectReason={rejectReason}
        onCloseReject={() => { setRejectConfirmId(null); setRejectReason(''); }}
        onRejectReasonChange={setRejectReason}
        onConfirmReject={handleReject}
      />
    </div>
  )
}
