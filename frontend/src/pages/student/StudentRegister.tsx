import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authService } from '@/services/auth.service'
import type { StudentRegisterResponse } from '@/services/auth.service'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function StudentRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    joinCode: '',
    name: '',
    roomNo: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [result, setResult] = useState<StudentRegisterResponse | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'joinCode' ? value.toUpperCase().slice(0, 6) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.joinCode.trim() || formData.joinCode.trim().length !== 6) {
      setError('Please enter a valid 6-character join code')
      return
    }
    if (!formData.name.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!formData.roomNo.trim()) {
      setError('Please enter your room number')
      return
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await authService.registerStudent({
        joinCode: formData.joinCode.trim(),
        name: formData.name.trim(),
        roomNo: formData.roomNo.trim(),
        email: formData.email.trim(),
        password: formData.password
      })
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-semantic-success/10 text-semantic-success mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-headline">Registration Submitted</h1>
            <p className="text-body-sm text-muted">
              Your account has been created and is pending approval by your hostel administrator.
            </p>
          </div>

          <div className="p-4 border border-hairline rounded bg-surface-soft text-left space-y-2">
            <p className="text-caption text-muted uppercase tracking-wide">Your Generated Login ID</p>
            <p className="text-body font-mono font-medium text-ink break-all">
              {result.user.username}
            </p>
            <p className="text-caption text-muted">
              Use this username to sign in once your account is approved.
            </p>
          </div>

          <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-headline mb-1">Join Your Hostel</h1>
          <p className="text-body-sm text-muted">Enter your hostel join code to register as a student</p>
        </div>

        {error && (
          <div className="p-3 border border-hairline rounded bg-surface-soft text-body-sm text-semantic-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="joinCode" className="block text-body-sm mb-2">Hostel Join Code</label>
            <Input
              type="text"
              id="joinCode"
              name="joinCode"
              value={formData.joinCode}
              onChange={handleChange}
              placeholder="e.g. AB12CD"
              maxLength={6}
              required
              className="font-mono uppercase tracking-wider text-center text-lg"
            />
            <p className="text-caption text-muted mt-1">
              Ask your hostel admin for the 6-character code
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-body-sm mb-2">Full Name</label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label htmlFor="roomNo" className="block text-body-sm mb-2">Room Number</label>
            <Input
              type="text"
              id="roomNo"
              name="roomNo"
              value={formData.roomNo}
              onChange={handleChange}
              placeholder="e.g. 101, A-204"
              required
            />
            {formData.roomNo.trim() && (
              <p className="text-caption text-muted mt-1">
                Your login ID will be based on your room number (e.g. {formData.roomNo.trim().toLowerCase()}.1@hostel)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-body-sm mb-2">Email Address</label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-body-sm mb-2">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-body-sm mb-2">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button variant="primary" type="submit" disabled={loading} className="w-full mt-6">
            {loading ? 'Submitting Registration...' : 'Register'}
          </Button>

          <p className="text-center text-muted text-body-sm mt-4">
            Already registered? <Link to="/login" className="text-ink hover:underline">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
