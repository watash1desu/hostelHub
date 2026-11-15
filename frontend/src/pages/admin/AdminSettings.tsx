import { useEffect, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import toast from 'react-hot-toast'
import { Trash2, Plus, Ban, CheckCircle } from 'lucide-react'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type SettingsTab = 'general' | 'meals' | 'danger'

export default function AdminSettings() {
  const { request } = useApi()
  const { logout } = useAuth()

  const getTabFromHash = (): SettingsTab => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'meals' || hash === 'danger') return hash
    return 'general'
  }

  const [activeSection, setActiveSection] = useState<SettingsTab>(getTabFromHash)
  const [settings, setSettings] = useState<any>(null)
  const [initialSettings, setInitialSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'mealCat', mealIndex?: number, catIndex: number, replacementCatIndex?: number } | null>(null)
  const [categoryReassignments, setCategoryReassignments] = useState<any[]>([])

  const fetchSettings = () => {
    request('/admin/settings').then(res => {
      setSettings(res)
      setInitialSettings(JSON.parse(JSON.stringify(res)))
    }).catch(err => {
      toast.error(err.message || 'Failed to fetch settings')
    })
  }

  useEffect(() => {
    fetchSettings()

    const onHashChange = () => {
      setActiveSection(getTabFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleTabClick = (tab: SettingsTab) => {
    setActiveSection(tab)
    window.location.hash = tab
  }

  const saveSettings = async () => {
    if (!settings.defaultPassword || !settings.defaultPassword.trim()) {
      toast.error('Default password cannot be empty')
      return
    }

    try {
      setSaving(true)
      await request('/admin/settings', 'PUT', { ...settings, categoryReassignments })
      toast.success('Settings saved successfully')
      
      const newSettings = { ...settings }
      setSettings(newSettings)
      setInitialSettings(JSON.parse(JSON.stringify(newSettings)))
      setCategoryReassignments([])
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings)

  const handleDeleteConfirm = () => {
    if (!deleteModal || !settings) return
    const { type, mealIndex, catIndex, replacementCatIndex } = deleteModal
    
    const newSettings = { ...settings }
    
    if (type === 'mealCat' && mealIndex !== undefined) {
      const oldCat = newSettings.mealPlan[mealIndex].categories[catIndex];
      const newCat = replacementCatIndex !== undefined ? newSettings.mealPlan[mealIndex].categories[replacementCatIndex] : null;
      if (newCat) {
        setCategoryReassignments([...categoryReassignments, {
          mealName: newSettings.mealPlan[mealIndex].mealName,
          oldCategory: oldCat.categoryName,
          newCategory: newCat.categoryName
        }]);
      }
      newSettings.mealPlan[mealIndex].categories.splice(catIndex, 1)
    }
    
    setSettings(newSettings)
    setDeleteModal(null)
  }

  const [deleteHostelModal, setDeleteHostelModal] = useState(false)
  const [deleteHostelConfirm, setDeleteHostelConfirm] = useState('')
  const [deletingHostel, setDeletingHostel] = useState(false)

  const handleDeleteHostel = async () => {
    if (deleteHostelConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm.')
      return
    }
    try {
      setDeletingHostel(true)
      await request('/admin/settings/hostel', 'DELETE')
      toast.success('Hostel deleted successfully')
      logout()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete hostel')
    } finally {
      setDeletingHostel(false)
      setDeleteHostelModal(false)
    }
  }

  const toggleMealCategoryActive = (mealIndex: number, catIndex: number) => {
    const newSettings = { ...settings }
    const cat = newSettings.mealPlan[mealIndex].categories[catIndex]
    cat.isActive = !cat.isActive
    setSettings(newSettings)
  }

  const toggleMealActive = (mealIndex: number) => {
    const newSettings = { ...settings }
    const meal = newSettings.mealPlan[mealIndex]
    meal.isActive = meal.isActive === false ? true : false
    setSettings(newSettings)
  }

  const addMealCategory = (mealIndex: number) => {
    const name = window.prompt("Enter new meal category name (Dessert, Main, etc):")
    if (!name?.trim()) return
    const newSettings = { ...settings }
    newSettings.mealPlan[mealIndex].categories.push({ categoryName: name.trim(), isActive: true })
    setSettings(newSettings)
  }

  const toggleOffDay = (mealIndex: number, dayIndex: number) => {
    const newSettings = { ...settings }
    const offDays = newSettings.mealPlan[mealIndex].offDays
    if (offDays.includes(dayIndex)) {
      newSettings.mealPlan[mealIndex].offDays = offDays.filter((d: number) => d !== dayIndex)
    } else {
      offDays.push(dayIndex)
    }
    setSettings(newSettings)
  }

  if (!settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted text-body">Loading settings...</p>
      </div>
    )
  }

  return (
    <>
    <div className="w-full mx-auto pb-24 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row gap-8 mt-2">
        {/* Navigation Tabs */}
        <div className="lg:w-64 shrink-0">
          <div className="sticky top-24 flex flex-col gap-1 border border-hairline p-2 rounded-lg bg-canvas">
            <button
              type="button"
              onClick={() => handleTabClick('general')}
              className={`text-left px-3 py-2 text-body rounded transition-colors ${activeSection === 'general' ? 'bg-(--color-primary)/10 text-(--color-primary) font-medium' : 'text-ink hover:bg-surface-soft'}`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('meals')}
              className={`text-left px-3 py-2 text-body rounded transition-colors ${activeSection === 'meals' ? 'bg-(--color-primary)/10 text-(--color-primary) font-medium' : 'text-ink hover:bg-surface-soft'}`}
            >
              Mess Menu Config
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('danger')}
              className={`text-left px-3 py-2 text-body rounded transition-colors ${activeSection === 'danger' ? 'bg-(--color-semantic-error)/10 text-(--color-semantic-error) font-medium' : 'text-(--color-semantic-error) hover:bg-surface-soft'}`}
            >
              Danger Zone
            </button>
          </div>
        </div>

        {/* Content Area - Single Section at a Time */}
        <div className="flex-1 space-y-12">
          {activeSection === 'general' && (
            <section id="general" className="space-y-6">
              <Card className="p-6 shadow-none border-hairline">
                <h2 className="text-card-title text-ink mb-1">Default User Password</h2>
                <div className="w-full">
                  <p className="text-body-xs text-muted mb-4">
                    This password will be assigned to all new users created individually or in bulk if no password is provided. If left empty, a random password will be generated for each user.
                  </p>
                  <div className="max-w-md">
                    <Input
                      type="text"
                      value={settings.defaultPassword || ''}
                      onChange={(e: any) => setSettings({ ...settings, defaultPassword: e.target.value })}
                      placeholder="Enter default password"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 shadow-none border-hairline">
                <h2 className="text-card-title text-ink mb-1">Menu Change Request Policy</h2>
                <div className="w-full">
                  <p className="text-body-xs text-muted mb-4">
                    Configure the threshold and cooldown period required for students to trigger a menu change request.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                    <div>
                      <label className="block text-body-sm mb-1 text-ink">Minimum Voters (%)</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.menuChangePolicy?.minVotersPercent ?? 60}
                        onChange={(e: any) => setSettings({
                          ...settings,
                          menuChangePolicy: {
                            ...(settings.menuChangePolicy || {}),
                            minVotersPercent: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm mb-1 text-ink">Minimum Voters (Count)</label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.menuChangePolicy?.minVoters ?? 10}
                        onChange={(e: any) => setSettings({
                          ...settings,
                          menuChangePolicy: {
                            ...(settings.menuChangePolicy || {}),
                            minVoters: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm mb-1 text-ink">Cooldown (Days)</label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.menuChangePolicy?.cooldownDays ?? 14}
                        onChange={(e: any) => setSettings({
                          ...settings,
                          menuChangePolicy: {
                            ...(settings.menuChangePolicy || {}),
                            cooldownDays: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {activeSection === 'meals' && (
            <section id="meals">
              <h2 className="text-card-title text-ink mb-4 pb-2 border-b border-hairline">Mess Menu Configuration</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {settings.mealPlan.map((meal: any, mIdx: number) => (
                  <Card key={meal.mealName} className={`p-5 shadow-none border-hairline transition-opacity ${meal.isActive === false ? 'opacity-70 bg-surface-soft' : ''}`}>
                    <div className="flex justify-between items-start mb-4 border-b border-hairline pb-4">
                      <div>
                        <h2 className={`text-card-title ${meal.isActive !== false ? 'text-ink' : 'text-muted line-through'}`}>{meal.mealName}</h2>
                        {meal.isActive === false && <p className="text-caption text-(--color-semantic-error) mt-1">MEAL DEACTIVATED</p>}
                      </div>
                      <button 
                        onClick={() => toggleMealActive(mIdx)}
                        className={`p-2 rounded transition-colors ${meal.isActive !== false ? 'text-(--color-semantic-warning) hover:bg-canvas' : 'text-(--color-semantic-success) hover:bg-surface-hover bg-canvas border border-hairline'}`}
                        title={meal.isActive !== false ? "Deactivate Meal" : "Activate Meal"}
                      >
                        {meal.isActive !== false ? <Ban size={20} /> : <CheckCircle size={20} />}
                      </button>
                    </div>
                    
                    <div className={`transition-all ${meal.isActive === false ? 'pointer-events-none opacity-50' : ''}`}>
                      <div className="mb-6">
                        <h3 className="text-body text-muted mb-2">Off-Days (No meal served)</h3>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day, dIdx) => {
                            const isOff = meal.offDays.includes(dIdx)
                            return (
                              <button
                                key={day}
                                onClick={() => toggleOffDay(mIdx, dIdx)}
                                className={`px-3 py-1 text-body-sm rounded-full border transition-colors ${
                                  isOff 
                                    ? 'bg-(--color-semantic-error) text-white border-transparent' 
                                    : 'bg-surface-soft text-muted border-hairline hover:bg-surface-hover hover:text-ink'
                                }`}
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-body text-muted">Categories</h3>
                          <button onClick={() => addMealCategory(mIdx)} className="text-primary text-body-sm hover:underline flex items-center gap-1">
                            <Plus size={14} /> Add Category
                          </button>
                        </div>
                        <div className="space-y-2">
                          {meal.categories.map((cat: any, cIdx: number) => (
                            <div key={cIdx} className={`flex items-center justify-between p-2 rounded border ${cat.isActive ? 'bg-surface-soft border-hairline' : 'bg-canvas border-hairline opacity-60'}`}>
                              <span className={`text-body ${cat.isActive ? 'text-ink' : 'text-muted line-through'}`}>{cat.categoryName}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => toggleMealCategoryActive(mIdx, cIdx)}
                                  className={`p-1.5 rounded transition-colors ${cat.isActive ? 'text-(--color-semantic-warning) hover:bg-canvas' : 'text-(--color-semantic-success) hover:bg-surface-hover'}`}
                                  title={cat.isActive ? "Deactivate" : "Activate"}
                                >
                                  {cat.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                                </button>
                                <button 
                                  onClick={() => setDeleteModal({ isOpen: true, type: 'mealCat', mealIndex: mIdx, catIndex: cIdx })}
                                  className="p-1.5 text-muted hover:text-(--color-semantic-error) hover:bg-canvas rounded transition-colors"
                                  title="Delete Permanently"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {meal.categories.length === 0 && <p className="text-body-sm text-muted">No categories defined.</p>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'danger' && (
            <section id="danger" className="space-y-6">
              <Card className="p-6 shadow-none border-(--color-semantic-error) bg-(--color-semantic-error)/5">
                <h2 className="text-card-title text-(--color-semantic-error) mb-4">Danger Zone</h2>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-body-sm text-ink max-w-2xl">
                    Permanently delete this hostel and all associated data, including users, dishes, menus, and complaints. This action cannot be undone.
                  </p>
                  <Button 
                    variant="danger"
                    onClick={() => setDeleteHostelModal(true)}
                  >
                    Delete Hostel
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Confirm Deletion">
        <div className="p-6">
          <p className="text-body text-ink mb-4">
            Are you sure you want to permanently delete this category?
          </p>
          {deleteModal?.type === 'mealCat' && (
            <div className="bg-(--color-semantic-error)/10 text-(--color-semantic-error) p-3 rounded text-body-sm mb-4">
              <strong>Warning:</strong> Deleting a meal category requires reassigning existing dishes.
              <div className="mt-3">
                <label className="block mb-1">Reassign existing dishes to:</label>
                <Select 
                  className="w-full"
                  value={deleteModal.replacementCatIndex ?? ''}
                  onChange={e => setDeleteModal({ ...deleteModal, replacementCatIndex: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">-- Do not reassign (Dishes will be deleted) --</option>
                  {settings?.mealPlan[deleteModal.mealIndex!]?.categories.map((c: any, i: number) => 
                    i !== deleteModal.catIndex ? (
                      <option key={i} value={i}>{c.categoryName}</option>
                    ) : null
                  )}
                </Select>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>Yes, Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteHostelModal} onClose={() => setDeleteHostelModal(false)} title="Delete Hostel">
        <div className="p-6">
          <p className="text-body text-ink mb-4">
            Are you absolutely sure you want to permanently delete this hostel? All data will be wiped out.
          </p>
          <div className="bg-(--color-semantic-error)/10 text-(--color-semantic-error) p-3 rounded text-body-sm mb-4">
            <strong>Warning:</strong> This action is irreversible. Please type <strong>DELETE</strong> to confirm.
            <div className="mt-3">
              <Input
                type="text"
                placeholder="Type DELETE"
                value={deleteHostelConfirm}
                onChange={e => setDeleteHostelConfirm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteHostelModal(false)}>Cancel</Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteHostel}
              disabled={deletingHostel || deleteHostelConfirm !== 'DELETE'}
            >
              {deletingHostel ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>

    {/* Frozen Save Bar */}
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-canvas/80 backdrop-blur-md border-t border-hairline flex justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm">
        <Button 
          onClick={saveSettings} 
          disabled={saving || !hasChanges}
          className={`w-full transition-all shadow-none ${hasChanges ? 'bg-ink text-canvas scale-105' : 'bg-surface-soft text-muted'}`}
        >
          {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
        </Button>
      </div>
    </div>
    </>
  )
}
