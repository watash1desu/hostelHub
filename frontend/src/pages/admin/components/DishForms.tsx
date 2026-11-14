import React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TagInput } from '@/components/ui/TagInput'

interface DishModalProps {
  showModal: boolean
  editingDishId: string | null
  formData: {
    name: string
    mealType: string
    category: string
    tags: string[]
    priceScore: number
    healthScore: number
    itemClass: string
  }
  mealPlan: any[]
  tagLibrary: string[]
  onClose: () => void
  onChange: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
}

export function DishFormModal({
  showModal,
  editingDishId,
  formData,
  mealPlan,
  tagLibrary,
  onClose,
  onChange,
  onSubmit,
}: DishModalProps) {
  const currentMealCategories =
    mealPlan.find((m) => m.mealName === formData.mealType)?.categories || []

  return (
    <Modal isOpen={showModal} onClose={onClose} title={editingDishId ? 'Edit Dish' : 'Add New Dish'}>
      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-body-sm mb-1.5">Dish Name</label>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            placeholder="e.g. Paneer Butter Masala"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-body-sm mb-1.5">Meal Type</label>
            <Select
              value={formData.mealType}
              onChange={(e) => {
                const newMeal = e.target.value
                const mealData = mealPlan.find((m) => m.mealName === newMeal)
                const firstCat = mealData?.categories?.[0]?.categoryName || ''
                onChange({ ...formData, mealType: newMeal, category: firstCat })
              }}
              className="w-full"
            >
              {mealPlan.map((m) => (
                <option key={m.mealName} value={m.mealName}>
                  {m.mealName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-body-sm mb-1.5">Category</label>
            <Select
              value={formData.category}
              onChange={(e) => onChange({ ...formData, category: e.target.value })}
              className="w-full"
            >
              {currentMealCategories.map((c: any) => (
                <option key={c.categoryName} value={c.categoryName}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-body-sm mb-1.5">Schedule Type</label>
            <Select
              value={formData.itemClass}
              onChange={(e) => onChange({ ...formData, itemClass: e.target.value })}
              className="w-full"
            >
              <option value="FIXED">Fixed Daily</option>
              <option value="ROTATING">Rotating (Occasional)</option>
            </Select>
          </div>

          <div>
            <label className="block text-body-sm mb-1.5">Tags</label>
            <TagInput
              value={formData.tags}
              onChange={(tags) => onChange({ ...formData, tags })}
              suggestions={tagLibrary}
              placeholder="Select or type tag..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-body-sm mb-1.5 flex items-center justify-between">
              <span>Price Score</span>
              <span className="text-muted text-body-xs bg-surface px-1.5 py-0.5 rounded">1-5</span>
            </label>
            <Input
              type="number"
              min="1"
              max="5"
              value={formData.priceScore}
              onChange={(e) => onChange({ ...formData, priceScore: Number(e.target.value) })}
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
              value={formData.healthScore}
              onChange={(e) => onChange({ ...formData, healthScore: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {editingDishId ? 'Save Changes' : 'Create Dish'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
