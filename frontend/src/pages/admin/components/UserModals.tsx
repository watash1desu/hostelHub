import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../../components/ui/modal'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { useApi } from '../../../hooks/useApi'

export function CreateUserModal({ isOpen, onClose, onSuccess, defaultRole }: any) {
  const { request } = useApi()
  const fixedRole: string = defaultRole || 'STUDENT'
  const [form, setForm] = useState<any>({ role: fixedRole })
  const [creating, setCreating] = useState(false)
  const [createdUser, setCreatedUser] = useState<any>(null)

  useEffect(() => {
    if (isOpen) setForm({ role: fixedRole })
  }, [isOpen, fixedRole])

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      const res = await request('/admin/users', 'POST', form)
      setCreatedUser({ ...res.user, rawPassword: res.rawPassword })
      setForm({ role: fixedRole })
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen && !createdUser} onClose={onClose} title="Create New User">
        <form onSubmit={submitCreate} className="p-6 space-y-4" autoComplete="off">
          <div>
            <label className="block text-body-sm mb-1">Full Name <span className="text-muted">(Optional)</span></label>
            <Input
              autoComplete="off"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {/* Show role select only when creating an ADMIN (fixedRole='ADMIN'); students always get STUDENT */}
          {fixedRole === 'ADMIN' ? (
            <div>
              <label className="block text-body-sm mb-1">Admin Role</label>
              <Select
                className="w-full"
                value={form.roleTitle || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Mess Manager') {
                    setForm({ ...form, roleTitle: 'Mess Manager', permissions: ['MANAGE_MENU'] });
                  } else if (val === 'Complaints Officer') {
                    setForm({ ...form, roleTitle: 'Complaints Officer', permissions: ['MANAGE_ISSUES'] });
                  } else {
                    setForm({ ...form, roleTitle: '', permissions: [] });
                  }
                }}
                required
              >
                <option value="">Select role...</option>
                <option value="Mess Manager">Mess Manager</option>
                <option value="Complaints Officer">Complaints Officer</option>
              </Select>
            </div>
          ) : (
            <div>
              <label className="block text-body-sm mb-1">Room No</label>
              <Input
                required
                value={form.roomNo || ''}
                onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-body-sm mb-1">Username / Login ID <span className="text-muted">(Optional)</span></label>
            <Input
              autoComplete="off"
              value={form.username || ''}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={fixedRole === 'STUDENT' ? 'Auto-generated based on room no' : 'Auto-generated if empty'}
            />
          </div>
          <div>
            <label className="block text-body-sm mb-1">Password <span className="text-muted">(Optional)</span></label>
            <Input
              type="text"
              autoComplete="new-password"
              value={form.password || ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Will use default password if empty"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!createdUser} onClose={() => { setCreatedUser(null); onClose(); }} title="User Created Successfully">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-ink">{createdUser?.name}</p>
            <p className="text-muted text-body-sm mb-4">Username: <span className="font-mono text-ink">{createdUser?.username}</span></p>
            <p className="text-body-sm text-muted">Password: <span className="font-mono bg-surface-soft p-1 rounded text-ink">{createdUser?.rawPassword}</span></p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="w-full" onClick={() => { setCreatedUser(null); onClose(); }}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

interface ParsedRow { name: string; roomNo: string }
interface RowError { line: number; raw: string; message: string }

function parseCsvRows(raw: string): { valid: ParsedRow[]; errors: RowError[] } {
  const valid: ParsedRow[] = []
  const errors: RowError[] = []
  const seenRooms = new Set<string>()

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length > 200) {
    errors.push({ line: 0, raw: '', message: 'Maximum 200 rows allowed' })
    return { valid: [], errors }
  }

  lines.forEach((line, i) => {
    const lineNum = i + 1
    const parts = line.split(',').map(s => s.trim())
    const name = parts[0] || ''
    const roomNo = parts[1] || ''

    if (!name) { errors.push({ line: lineNum, raw: line, message: 'Name is required' }); return }
    if (!roomNo) { errors.push({ line: lineNum, raw: line, message: 'Room number is required' }); return }
    if (seenRooms.has(roomNo)) { errors.push({ line: lineNum, raw: line, message: `Duplicate room ${roomNo} in this import` }); return }

    seenRooms.add(roomNo)
    valid.push({ name, roomNo })
  })

  return { valid, errors }
}

function downloadCsv(rows: Array<{ username: string; name: string; roomNo: string }>, rawPassword: string) {
  const header = 'name,roomNo,username,password'
  const body = rows.map(r => `${r.name},${r.roomNo},${r.username},${rawPassword}`).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'student-credentials.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: any) {
  const { request } = useApi()
  const [csvInput, setCsvInput] = useState('')
  const [preview, setPreview] = useState<{ valid: ParsedRow[]; errors: RowError[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ createdUsers: any[]; rawPassword: string; skipped: string[]; errors: any[] } | null>(null)

  const handleParse = (e: React.FormEvent) => {
    e.preventDefault()
    setPreview(parseCsvRows(csvInput))
  }

  const handleConfirm = async () => {
    if (!preview || preview.valid.length === 0) return
    try {
      setImporting(true)
      const res = await request('/admin/users/bulk', 'POST', { users: preview.valid })
      setResult(res)
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setCsvInput('')
    setPreview(null)
    setResult(null)
    onClose()
  }

  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Import Complete">
        <div className="p-6 space-y-4">
          <p className="text-body text-ink">{result.createdUsers.length} students imported successfully.</p>
          {result.skipped.length > 0 && (
            <p className="text-body-sm text-muted">{result.skipped.length} skipped (duplicates).</p>
          )}
          {result.errors.length > 0 && (
            <p className="text-body-sm text-semantic-error">{result.errors.length} rows had errors.</p>
          )}
          {result.createdUsers.length > 0 && (
            <Button variant="secondary" className="w-full" onClick={() => downloadCsv(result.createdUsers, result.rawPassword)}>
              Download credentials CSV
            </Button>
          )}
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  if (preview) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Preview Import">
        <div className="p-6 space-y-4">
          {preview.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-body-sm font-medium text-semantic-error">Errors ({preview.errors.length})</p>
              <ul className="text-caption text-semantic-error space-y-0.5 max-h-32 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <li key={i}>Row {e.line}: {e.message} — <span className="font-mono">{e.raw}</span></li>
                ))}
              </ul>
            </div>
          )}
          {preview.valid.length > 0 && (
            <div className="space-y-1">
              <p className="text-body-sm font-medium">{preview.valid.length} valid row(s) ready to import</p>
              <div className="max-h-48 overflow-y-auto border border-hairline rounded">
                <table className="w-full text-caption">
                  <thead className="bg-surface-soft"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Room</th></tr></thead>
                  <tbody>
                    {preview.valid.map((r, i) => (
                      <tr key={i} className="border-t border-hairline"><td className="p-2">{r.name}</td><td className="p-2">{r.roomNo}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPreview(null)}>Back</Button>
            <Button
              className="flex-1"
              disabled={importing || preview.valid.length === 0}
              onClick={handleConfirm}
            >
              {importing ? 'Importing...' : `Confirm & Import ${preview.valid.length} students`}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Students">
      <form onSubmit={handleParse} className="p-6 space-y-4">
        <div>
          <label className="block text-body-sm mb-1">
            One student per line: <code>Name, RoomNo</code>
          </label>
          <p className="text-body-xs text-muted mb-2">
            Max 200 rows. The hostel default password is used for all accounts.
            Duplicate room numbers are skipped.
          </p>
          <Textarea
            required
            className="h-40"
            placeholder={'Alice Sharma, 101\nBob Kumar, 102\nCarol Patel, A3'}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!csvInput.trim()} className="w-full sm:w-auto px-6">
            Preview
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: any) {
  const { request } = useApi()
  const [editForm, setEditForm] = useState<any>({})
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      setEditForm({
        name: user.name || '',
        roomNo: user.roomNo || '',
        roleTitle: user.roleTitle || (user.permissions?.includes('MANAGE_MENU') ? 'Mess Manager' : user.permissions?.includes('MANAGE_ISSUES') ? 'Complaints Officer' : ''),
        permissions: user.permissions || [],
      })
    }
  }, [user, isOpen])

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      setEditing(true)
      const res = await request(`/admin/users/${user._id}`, 'PUT', editForm)
      toast.success('User updated successfully')
      onSuccess(res.user)
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update user')
    } finally {
      setEditing(false)
    }
  }

  return (
    <Modal isOpen={isOpen && !!user} onClose={onClose} title="Edit User">
      <form onSubmit={submitEdit} className="p-6 space-y-4" autoComplete="off">
        <div>
          <label className="block text-body-sm mb-1">Full Name</label>
          <Input
            autoComplete="off"
            value={editForm.name || ''}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
        </div>
        {user?.role === 'STUDENT' && (
          <div>
            <label className="block text-body-sm mb-1">Room No</label>
            <Input
              value={editForm.roomNo || ''}
              onChange={(e) => setEditForm({ ...editForm, roomNo: e.target.value })}
            />
          </div>
        )}
        {user?.role === 'ADMIN' && (
          <div>
            <label className="block text-body-sm mb-1">Admin Role</label>
            <Select
              className="w-full"
              value={editForm.roleTitle || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Mess Manager') {
                  setEditForm({ ...editForm, roleTitle: 'Mess Manager', permissions: ['MANAGE_MENU'] });
                } else if (val === 'Complaints Officer') {
                  setEditForm({ ...editForm, roleTitle: 'Complaints Officer', permissions: ['MANAGE_ISSUES'] });
                } else {
                  setEditForm({ ...editForm, roleTitle: '', permissions: [] });
                }
              }}
            >
              <option value="">Select admin role...</option>
              <option value="Mess Manager">Mess Manager</option>
              <option value="Complaints Officer">Complaints Officer</option>
            </Select>
          </div>
        )}
        <div className="bg-surface-soft p-3 rounded border border-hairline text-body-sm text-muted">
          <p><strong>Note:</strong> Usernames and Login IDs are permanent and cannot be changed.</p>
        </div>
        <div className="pt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={editing}>
            {editing ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
