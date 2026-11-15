import { logger } from '../../lib/logger';
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { Modal } from '../../components/ui/modal';
import { Textarea } from '../../components/ui/textarea';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface Issue {
  _id: string;
  subject: string;
  status: string;
  description: string;
  resolverNote?: string;
  raisedBy: any;
  raisedByName: string;
  roomNo: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminIssues() {
  const { request } = useApi();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [closePrompt, setClosePrompt] = useState<{ issueId: string; note: string } | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      params.append('page', String(currentPage));
      params.append('limit', String(itemsPerPage));
      if (sortConfig?.key) {
        params.append('sortBy', sortConfig.key);
        params.append('order', sortConfig.direction);
      }

      const response = await request(`/issues/admin/all?${params.toString()}`, 'GET');
      setIssues(response.issues || []);
      setTotal(response.total ?? 0);
      setTotalPages(response.pages ?? 1);
    } catch (error: any) {
      logger.error('APP', 'Failed to fetch complaints:', error);
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [debouncedSearch, filterStatus, currentPage, sortConfig]);

  const handleStatusUpdate = async (issueId: string, newStatus: string, resolverNote?: string) => {
    try {
      const payload: any = { status: newStatus };
      if (resolverNote !== undefined) payload.resolverNote = resolverNote;

      await request(`/issues/${issueId}/status`, 'PATCH', payload);
      toast.success('Complaint status updated successfully');
      fetchIssues();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleDownloadPdf = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
    if (sortConfig?.key) params.append('sortBy', sortConfig.key);
    if (sortConfig?.direction) params.append('order', sortConfig.direction);

    const url = `${baseUrl}/issues/admin/export.pdf?${params.toString()}`;
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to download PDF');
        return res.blob();
      })
      .then((blob) => {
        const windowUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = windowUrl;
        a.download = `Complaints_Export_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(windowUrl);
      })
      .catch((err) => {
        toast.error('Failed to download PDF');
        logger.error('APP', 'Error downloading PDF:', err);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-end border-b border-hairline mb-6 gap-3 sm:gap-0 pb-3">
        <div>
          <h2 className="text-card-title text-ink">Complaints</h2>
          <p className="text-body-sm text-muted">Review and resolve mess complaints reported by students</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Input
            type="text"
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-[200px]"
          />
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-[140px]"
          >
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
            <option value="ALL">All Statuses</option>
          </Select>
          <Button onClick={handleDownloadPdf} variant="secondary" className="h-9 px-4 text-caption whitespace-nowrap">
            Download PDF
          </Button>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-body text-muted">Loading complaints...</div>
      )}

      {!loading && issues.length === 0 && (
        <div className="p-8 text-center text-body text-muted">No complaints found matching your filters.</div>
      )}

      {!loading && issues.length > 0 && (
        <Card className="overflow-hidden shadow-none border-hairline flex flex-col">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={total}
            itemsPerPage={itemsPerPage}
          />
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-soft">
                  <TableHead className="text-center cursor-pointer hover:bg-surface transition-colors w-[180px]" onClick={() => handleSort('subject')}>
                    <div className="flex items-center justify-center gap-1">
                      Subject <span className="w-3 inline-block text-center">{sortConfig?.key === 'subject' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <div className="flex items-center gap-1">
                      Complaint
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-surface transition-colors" onClick={() => handleSort('raisedByName')}>
                    <div className="flex items-center justify-center gap-1">
                      Raised By <span className="w-3 inline-block text-center">{sortConfig?.key === 'raisedByName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-surface transition-colors" onClick={() => handleSort('roomNo')}>
                    <div className="flex items-center justify-center gap-1">
                      Room No <span className="w-3 inline-block text-center">{sortConfig?.key === 'roomNo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-surface transition-colors" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center justify-center gap-1">
                      Date <span className="w-3 inline-block text-center">{sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:bg-surface transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">
                      Status <span className="w-3 inline-block text-center">{sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      Remark
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue._id} className="transition-colors hover:bg-surface-soft">
                    <TableCell className="text-center font-medium text-ink">
                      {issue.subject}
                    </TableCell>
                    <TableCell className="max-w-[300px] leading-tight">
                      <p className={`${issue.status === 'CLOSED' ? 'line-through text-(--color-ink)/50' : 'text-(--color-ink)/80'}`}>
                        {issue.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-muted">
                      {(() => {
                        let nameToUse = issue.raisedBy && typeof issue.raisedBy === 'object' ? issue.raisedBy.name : null;
                        if (!nameToUse && issue.raisedByName && !issue.raisedByName.includes('@')) {
                          nameToUse = issue.raisedByName;
                        }
                        return nameToUse || 'No Name Set';
                      })()}
                    </TableCell>
                    <TableCell className="text-center text-muted font-mono text-body-sm">
                      {issue.roomNo}
                    </TableCell>
                    <TableCell className="text-center text-muted whitespace-nowrap font-mono">
                      {formatDate(issue.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => {
                          if (issue.status === 'CLOSED') {
                            handleStatusUpdate(issue._id, 'OPEN');
                          } else {
                            setClosePrompt({
                              issueId: issue._id,
                              note: '',
                            });
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          issue.status === 'CLOSED'
                            ? 'text-(--color-semantic-success) hover:bg-(--color-semantic-success)/10'
                            : 'text-muted hover:text-(--color-ink) hover:bg-surface'
                        }`}
                        title={issue.status === 'CLOSED' ? 'Reopen Complaint' : 'Close Complaint'}
                      >
                        {issue.status === 'CLOSED' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center text-muted max-w-[200px] truncate" title={issue.resolverNote || ''}>
                      {issue.resolverNote ? issue.resolverNote : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!closePrompt} onClose={() => setClosePrompt(null)} title="Close Complaint">
        <div className="p-6">
          <p className="text-body text-ink mb-4">Please provide an optional closing remark for the student.</p>
          <Textarea
            value={closePrompt?.note || ''}
            onChange={(e) => closePrompt && setClosePrompt({ ...closePrompt, note: e.target.value })}
            className="w-full"
            rows={3}
            placeholder="Add an optional admin remark..."
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setClosePrompt(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (closePrompt) {
                  handleStatusUpdate(closePrompt.issueId, 'CLOSED', closePrompt.note);
                  setClosePrompt(null);
                }
              }}
            >
              Close Complaint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
