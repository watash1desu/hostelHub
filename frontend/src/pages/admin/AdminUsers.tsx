import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Badge } from '../../components/ui/badge'

import { Pagination } from '../../components/ui/pagination'
import { Trash2, Ban, CheckCircle, Pencil, KeyRound, Copy, Check, X } from 'lucide-react'
import { CreateUserModal, CsvImportModal, EditUserModal } from './components/UserModals'

interface User {
  _id: string
  name: string
  username: string
  email?: string
  role: 'STUDENT' | 'ADMIN'
  roomNo?: string
  isActive: boolean
  isPrimaryAdmin?: boolean
  roleTitle?: string
  permissions?: string[]
}

export default function AdminUsers() {
  const { request } = useApi()
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'ADMIN' | 'PENDING'>('STUDENT')
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const fetchPendingUsers = async () => {
    try {
      const res = await request('/admin/users?status=pending')
      setPendingUsers(res.users || [])
    } catch {
      // ignore
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await request(`/admin/users/${userId}/approve`, 'PATCH')
      toast.success('Student approved')
      setPendingUsers(prev => prev.filter(u => u._id !== userId))
      fetchUsers()
    fetchPendingUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve student')
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await request(`/admin/users/${userId}/reject`, 'PATCH')
      toast.success('Student rejected')
      setPendingUsers(prev => prev.filter(u => u._id !== userId))
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject student')
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await request('/admin/users')
      setUsers(res.users)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
    fetchPendingUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const confirmDeleteUser = (userId: string) => {
    setDeleteConfirmId(userId)
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirmId) return
    try {
      await request(`/admin/users/${deleteConfirmId}`, 'DELETE')
      setUsers(users.filter(u => u._id !== deleteConfirmId))
      toast.success('User deleted successfully')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete user')
    } finally {
      setDeleteConfirmId(null)
    }
  }



  // Bulk Import CSV
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const openEditModal = (user: User) => {
    setEditingUser(user)
  }

  const [resetPwdResult, setResetPwdResult] = useState<{ tempPassword: string; username: string } | null>(null)

  const handleResetPassword = async (user: User) => {
    try {
      const res = await request(`/admin/users/${user._id}/reset-password`, 'PATCH')
      setResetPwdResult({ tempPassword: res.tempPassword, username: user.username })
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to reset password')
    }
  }

  // Toggle User Status (Deactivate / Reactivate)
  const toggleUserStatus = async (user: User) => {
    try {
      const action = user.isActive ? 'deactivate' : 'reactivate'
      await request(`/admin/users/${user._id}/${action}`, 'PATCH')
      
      toast.success(`User ${action}d successfully`)
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u))
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to update user status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-end border-b border-hairline mb-6 gap-3 sm:gap-0">
        <div className="flex overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('STUDENT'); setCurrentPage(1); }}
            className={`py-3 px-4 border-b-2  text-body whitespace-nowrap transition-colors -mb-[1px] ${activeTab === 'STUDENT'
                ? 'border-ink text-ink'
                : 'border-transparent text-muted hover:text-ink hover:border-hairline'
              }`}
          >
            Students
          </button>
          <button
            onClick={() => { setActiveTab('ADMIN'); setCurrentPage(1); }}
            className={`py-3 px-4 border-b-2  text-body whitespace-nowrap transition-colors -mb-[1px] ${activeTab === 'ADMIN'
                ? 'border-ink text-ink'
                : 'border-transparent text-muted hover:text-ink hover:border-hairline'
              }`}
          >
            Admins
          </button>
        </div>
        <div className="flex gap-2 pb-2 w-full sm:w-auto">
          {activeTab === 'STUDENT' && (
            <Button onClick={() => setIsCsvModalOpen(true)} variant="secondary" className="h-8 text-caption px-3">
              Bulk Import CSV
            </Button>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)} className="h-8 text-caption px-3">
            Add User
          </Button>
        </div>
      </div>

      {activeTab === 'PENDING' && (
        <Card className="overflow-hidden shadow-none border-hairline flex flex-col">
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-body text-muted">No pending approvals found.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-soft">
                    <TableHead className="text-center w-[20%]">Name</TableHead>
                    <TableHead className="text-center w-[20%]">Username</TableHead>
                    <TableHead className="text-center w-[25%]">Email</TableHead>
                    <TableHead className="text-center w-[15%]">Room No</TableHead>
                    <TableHead className="text-center w-[20%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(pUser => (
                    <TableRow key={pUser._id} className="transition-colors hover:bg-surface-soft">
                      <TableCell className="text-ink text-center">{pUser.name}</TableCell>
                      <TableCell className="text-muted text-center font-mono">{pUser.username}</TableCell>
                      <TableCell className="text-muted text-center">{pUser.email || '-'}</TableCell>
                      <TableCell className="text-muted text-center">{pUser.roomNo ? `Room ${pUser.roomNo}` : '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(pUser._id)}
                            className="p-1.5 rounded transition-colors text-semantic-success hover:bg-semantic-success/10"
                            title="Approve Student"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(pUser._id)}
                            className="p-1.5 rounded transition-colors text-semantic-error hover:bg-semantic-error/10"
                            title="Reject Student"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {activeTab !== 'PENDING' && loading && <div className="p-8 text-center text-body text-muted">Loading users...</div>}

      {activeTab !== 'PENDING' && !loading && users.filter(u => u.role === activeTab).length === 0 && (
        <div className="p-8 text-center text-body text-muted">No {activeTab.toLowerCase()}s found.</div>
      )}

      {activeTab !== 'PENDING' && !loading && users.filter(u => u.role === activeTab).length > 0 && (() => {
        const filteredUsers = users.filter(u => u.role === activeTab)
        
        const sortedUsers = [...filteredUsers].sort((a: any, b: any) => {
          if (!sortConfig) return 0
          const { key, direction } = sortConfig
          let valA = a[key]
          let valB = b[key]
          if (valA == null) valA = ''
          if (valB == null) valB = ''
          
          if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
          }
          if (valA < valB) return direction === 'asc' ? -1 : 1
          if (valA > valB) return direction === 'asc' ? 1 : -1
          return 0
        })

        const totalItems = sortedUsers.length
        const totalPages = Math.ceil(totalItems / itemsPerPage)
        const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

        return (
          <Card className="overflow-hidden shadow-none border-hairline flex flex-col">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-soft">
                    <TableHead className="text-center w-[20%] cursor-pointer hover:bg-hairline/20 transition-colors" onClick={() => handleSort('name')}>
                      Name <span className="w-3 inline-block text-center">{sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </TableHead>
                    <TableHead className="text-center w-[15%] cursor-pointer hover:bg-hairline/20 transition-colors" onClick={() => handleSort('username')}>
                      Username <span className="w-3 inline-block text-center">{sortConfig?.key === 'username' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </TableHead>
                    <TableHead className="text-center w-[25%] cursor-pointer hover:bg-hairline/20 transition-colors" onClick={() => handleSort('email')}>
                      Email <span className="w-3 inline-block text-center">{sortConfig?.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </TableHead>
                    {activeTab === 'STUDENT' ? (
                      <TableHead className="text-center w-[20%] cursor-pointer hover:bg-hairline/20 transition-colors" onClick={() => handleSort('roomNo')}>
                        Room No <span className="w-3 inline-block text-center">{sortConfig?.key === 'roomNo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                      </TableHead>
                    ) : (
                      <TableHead className="text-center w-[20%]">Role</TableHead>
                    )}
                    <TableHead className="text-center w-[10%] min-w-[100px] cursor-pointer hover:bg-hairline/20 transition-colors" onClick={() => handleSort('isActive')}>
                      Status <span className="w-3 inline-block text-center">{sortConfig?.key === 'isActive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </TableHead>
                    <TableHead className="text-center w-[10%] min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map(user => (
                    <TableRow key={user._id} className="transition-colors hover:bg-surface-soft">
                    <TableCell className="text-ink text-center">{user.name}</TableCell>
                    <TableCell className="text-muted text-center">{user.username}</TableCell>
                    <TableCell className="text-muted text-center">
                      {user.email || <span className="italic text-muted-foreground text-body-xs">Not provided</span>}
                    </TableCell>
                    {activeTab === 'STUDENT' ? (
                      <TableCell className="text-center text-muted">
                        {user.roomNo ? `Room ${user.roomNo}` : 'N/A'}
                      </TableCell>
                    ) : (
                      <TableCell className="text-center text-muted">
                        {user.isPrimaryAdmin ? (
                          <Badge variant="default" className="text-[10px]">Primary Admin</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {user.roleTitle || (user.permissions?.includes("MANAGE_MENU") ? "Mess Manager" : user.permissions?.includes("MANAGE_ISSUES") ? "Complaints Officer" : "Admin")}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {user.isActive ? (
                        <span className="text-semantic-success">Active</span>
                      ) : (
                        <span className="text-muted">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {user._id !== currentUser?.id && !(user.role === 'ADMIN' && user.username.startsWith('admin@')) && (
                          <>
                            {user.role === 'ADMIN' && (
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="p-1.5 rounded transition-colors text-muted hover:text-semantic-warning hover:bg-semantic-warning/10"
                                title="Reset Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded transition-colors text-muted hover:text-(--color-primary) hover:bg-(--color-primary)/10"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className={`p-1.5 rounded transition-colors ${user.isActive ? 'text-muted hover:text-(--color-semantic-warning) hover:bg-(--color-semantic-warning)/10' : 'text-semantic-success hover:bg-semantic-success/10'}`} 
                              title={user.isActive ? "Deactivate User" : "Reactivate User"}
                            >
                              {user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(user._id)}
                              className="p-1.5 text-muted hover:text-(--color-semantic-error) hover:bg-(--color-semantic-error)/10 rounded transition-colors" 
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      })()}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
        currentUser={currentUser}
        defaultRole={activeTab}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={(updatedUser: any) => {
          setUsers(users.map(u => (u._id === updatedUser._id ? { ...u, ...updatedUser } : u)))
        }}
        user={editingUser}
      />

      {/* RESET PASSWORD RESULT MODAL */}
      <Modal isOpen={!!resetPwdResult} onClose={() => setResetPwdResult(null)} title="Password Reset">
        <div className="p-6 space-y-4">
          <p className="text-body-sm text-muted">Temporary password for <span className="font-mono text-ink">{resetPwdResult?.username}</span>. Share it once — it won't be shown again.</p>
          <div className="flex items-center gap-2 bg-surface-soft p-3 rounded border border-hairline">
            <span className="font-mono text-ink flex-1">{resetPwdResult?.tempPassword}</span>
            <button onClick={() => { navigator.clipboard.writeText(resetPwdResult?.tempPassword ?? ''); toast.success('Copied'); }} className="p-1.5 text-muted hover:text-ink transition-colors" title="Copy"><Copy className="w-4 h-4" /></button>
          </div>
          <Button className="w-full" onClick={() => setResetPwdResult(null)}>Done</Button>
        </div>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete User">
        <div className="p-6">
          <p className="text-body text-ink mb-6">Are you sure you want to permanently delete this user? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleDeleteUser} className="bg-(--color-semantic-error) hover:bg-(--color-semantic-error)/90 border-(--color-semantic-error)">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


