import { useEffect, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'

export default function AdminMenuRules() {
  const { request } = useApi()
  const [constraintsText, setConstraintsText] = useState('')
  const [initialText, setInitialText] = useState('')
  const [previewedText, setPreviewedText] = useState('')
  const [parsedConstraints, setParsedConstraints] = useState<any[]>([])
  const [previewText, setPreviewText] = useState('')
  const [previewErrors, setPreviewErrors] = useState<string[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeRules, setActiveRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const res = await request('/admin/settings', 'GET')
      const text = res.menuConstraintsText || ''
      setConstraintsText(text)
      setInitialText(text)
      setPreviewedText(text)
      setActiveRules(res.menuConstraints || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load menu rules')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewConstraints = async () => {
    if (!constraintsText.trim()) {
      setParsedConstraints([])
      setPreviewText('No constraints defined.')
      setPreviewErrors([])
      setPreviewedText(constraintsText)
      return
    }

    try {
      setPreviewing(true)
      setPreviewErrors([])
      const res = await request(
        '/admin/settings/menu-constraints/preview',
        'POST',
        { text: constraintsText },
        { skipToast: true }
      )
      setParsedConstraints(res.constraints || [])
      setPreviewText(res.preview || '')
      setPreviewedText(constraintsText)
    } catch (err: any) {
      if (err.message === 'Could not produce a consistent rule set') {
        setPreviewErrors(['Validation failed: Check your logic for conflicting rules.'])
      } else {
        toast.error(err.message || 'Failed to parse constraints')
      }
    } finally {
      setPreviewing(false)
    }
  }

  const handleSaveRules = async () => {
    try {
      setSaving(true)
      await request('/admin/settings/menu-constraints/confirm', 'POST', {
        text: constraintsText,
        constraints: parsedConstraints
      })
      toast.success('Menu rules saved successfully')
      setInitialText(constraintsText)
      setActiveRules(parsedConstraints)
      setPreviewText('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = constraintsText !== initialText
  const canSave = constraintsText === previewedText && previewErrors.length === 0

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading menu rules...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-(--color-primary)" />
          <h1 className="text-card-title md:text-headline tracking-tight text-ink">Smart Menu Rules</h1>
          <Badge variant="default" className="text-[10px] tracking-wide uppercase px-1.5 py-0.5">
            AI
          </Badge>
        </div>
        <p className="text-body text-muted mt-1">
          Tell our AI how you want your menu to work, in plain English. It turns your words into rules the menu generator follows.
        </p>
      </div>

      <Card className="p-6 shadow-none border-hairline space-y-4">
        <div>
          <label className="block text-body-sm font-medium text-ink mb-2">Natural Language Instructions</label>
          <Textarea
            value={constraintsText}
            onChange={(e) => setConstraintsText(e.target.value)}
            className="w-full h-44 font-mono text-body-sm"
            placeholder="e.g. Require paneer on Monday for dinner&#10;Limit desserts to 2 per week&#10;Never serve bitter gourd for lunch"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={handlePreviewConstraints} disabled={previewing} variant="secondary">
            {previewing ? 'Parsing...' : 'Preview Rules'}
          </Button>
          <Button onClick={handleSaveRules} disabled={saving || !hasChanges || !canSave}>
            {saving ? 'Saving...' : !canSave ? 'Preview Rules First' : hasChanges ? 'Save Rules' : 'Saved'}
          </Button>
        </div>

        {previewText && (
          <div className="mt-6 p-5 bg-surface-soft/50 border border-hairline rounded-lg">
            <h3 className="text-body font-medium text-ink mb-2">AI Interpretation</h3>
            <p className="text-body-sm text-muted italic whitespace-pre-line">{previewText}</p>

            {previewErrors.length > 0 && (
              <div className="mt-4 p-3 bg-(--color-semantic-error)/10 border border-(--color-semantic-error)/20 rounded-md">
                <h4 className="text-caption text-(--color-semantic-error) mb-1 uppercase tracking-wider">Conflicts Detected</h4>
                <ul className="list-disc list-inside text-body-sm text-(--color-semantic-error)/90 space-y-1">
                  {previewErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeRules.length > 0 && !previewText && (
          <div className="mt-8 pt-4 border-t border-hairline">
            <h3 className="text-body font-medium text-ink mb-3">Active Rules ({activeRules.length})</h3>
            <div className="space-y-2">
              {activeRules.map((c: any, i: number) => (
                <div key={i} className="p-3 bg-canvas border border-hairline rounded flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-(--color-primary) mt-1.5 shrink-0" />
                  <span className="text-body-sm text-ink">{c.sourcePhrase}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
