import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Plus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface RaiseIssueFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function RaiseIssueForm({ onSuccess, onCancel }: RaiseIssueFormProps) {
  const { request } = useApi();
  const [formData, setFormData] = useState({
    subject: '',
    description: ''
  });
  const [touched, setTouched] = useState({
    subject: false,
    description: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleBlur = (field: 'subject' | 'description') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isSubjectEmpty = !formData.subject.trim();
  const isSubjectTooLong = formData.subject.trim().length > 80;
  const isDescriptionEmpty = !formData.description.trim();

  const subjectError = touched.subject && isSubjectEmpty
    ? 'Subject is required'
    : touched.subject && isSubjectTooLong
    ? 'Subject must be 80 characters or less'
    : '';

  const descriptionError = touched.description && isDescriptionEmpty
    ? 'Description is required'
    : '';

  const canSubmit = !isSubjectEmpty && !isSubjectTooLong && !isDescriptionEmpty && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ subject: true, description: true });

    if (isSubjectEmpty || isSubjectTooLong || isDescriptionEmpty) {
      setError('Please resolve field errors before submitting');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await request('/issues', 'POST', {
        subject: formData.subject.trim(),
        description: formData.description.trim()
      });
      toast.success('Complaint submitted successfully');
      setFormData({ subject: '', description: '' });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to raise complaint';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {error && (
        <div className="bg-(--color-canvas) border border-(--color-semantic-error) text-(--color-semantic-error) px-4 py-3 rounded text-body-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="subject" className="block text-body-sm text-muted mb-1">Subject *</label>
        <Input
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          onBlur={() => handleBlur('subject')}
          placeholder="e.g. Menu change, Rotten dish, Ants on tables"
          maxLength={80}
          required
          className="w-full"
        />
        <div className="flex justify-between items-center mt-1">
          {subjectError ? (
            <p className="text-body-xs text-(--color-semantic-error)">{subjectError}</p>
          ) : (
            <span />
          )}
          <span className="text-body-xs text-muted font-mono">{formData.subject.length}/80</span>
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-body-sm text-muted mb-1">Description *</label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={() => handleBlur('description')}
          placeholder="Describe your complaint in detail..."
          rows={5}
          required
          className="w-full"
        />
        {descriptionError && (
          <p className="text-body-xs text-(--color-semantic-error) mt-1">{descriptionError}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
        <div>
          {!canSubmit && !loading && (
            <span className="text-body-xs text-muted">
              {isSubjectEmpty || isDescriptionEmpty ? 'Fill in subject and description to submit' : isSubjectTooLong ? 'Subject exceeds 80 characters' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!canSubmit}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface Issue {
  _id: string;
  subject: string;
  status: string;
  description: string;
  resolverNote?: string;
  createdAt: string;
  updatedAt: string;
}

export default function StudentIssuesPage() {
  const { request } = useApi();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const handleOpenModal = () => {
    if (!user?.name || !user.name.trim()) {
      toast.error('Please update your profile with your full name before raising a complaint.');
      return;
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchIssues();
  }, [refreshKey]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await request('/issues/my-issues', 'GET');
      setIssues(response.issues || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRaised = () => {
    setIsModalOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'warning';
      case 'CLOSED':
        return 'success';
      default:
        return 'outline';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-32">
      {/* Header section */}
      <section className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-card-title md:text-headline tracking-tight text-ink leading-tight">My Complaints</h1>
          <p className="text-body text-muted mt-1">Track the complaints you've raised and read admin responses</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleOpenModal}
          className="whitespace-nowrap flex items-center gap-2 border-hairline hover:bg-surface-soft"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </Button>
      </section>

      {/* Complaints List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-muted">Loading your complaints...</div>
        ) : issues.length === 0 ? (
          <div className="py-16 px-4 text-center bg-canvas sm:bg-surface/30 border border-hairline rounded-xl">
            <h3 className="text-card-title text-ink mb-2">No Complaints Found</h3>
            <p className="text-body text-muted max-w-md mx-auto">You haven't reported any complaints yet. If you face any problems with the mess or food facilities, let us know.</p>
          </div>
        ) : (
          issues.map((issue) => {
            const isClosed = issue.status === 'CLOSED';
            
            return (
              <div key={issue._id} className="bg-canvas sm:bg-surface/30 border border-hairline rounded-xl overflow-hidden transition-all hover:border-ink/20 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-hairline bg-surface-soft/40">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-body font-medium ${isClosed ? 'text-muted line-through decoration-ink/30' : 'text-ink'}`}>
                      {issue.subject}
                    </h3>
                    <Badge variant={getStatusVariant(issue.status) as any} className="text-[10px] tracking-widest px-2 py-0.5 rounded-sm uppercase">
                      {issue.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(issue.createdAt)}
                  </div>
                </div>

                <div className="p-5 flex-grow">
                  <p className={`text-body leading-relaxed whitespace-pre-wrap ${isClosed ? 'text-muted' : 'text-ink'}`}>
                    {issue.description}
                  </p>

                  {/* Admin Note Box */}
                  {issue.resolverNote && (
                    <div className="mt-5 bg-surface-soft/80 border border-hairline rounded-lg p-4 flex gap-3 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-(--color-semantic-success) rounded-l-lg" />
                      <CheckCircle2 className="w-5 h-5 text-(--color-semantic-success) shrink-0" />
                      <div>
                        <h4 className="text-[11px] text-muted uppercase tracking-widest mb-1.5">Admin Response</h4>
                        <p className="text-body-sm text-ink italic leading-relaxed">"{issue.resolverNote}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Raise a Complaint">
        <RaiseIssueForm onSuccess={handleIssueRaised} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
