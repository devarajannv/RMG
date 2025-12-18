import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  RotateCcw,
  History,
  User,
  FolderKanban,
  MoreHorizontal,
  Edit,
  ChevronRight,
  ArrowUpRight,
  X,
  Paperclip,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// Types
// ============================================================================

interface Request {
  id: string;
  requestNumber: string;
  typeCode: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestData: Record<string, unknown>;
  urgencyJustification?: string;
  requestedCompletionDate?: string;
  submittedAt?: string;
  completedAt?: string;
  slaDeadline?: string;
  slaPausedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  onBehalfOf?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  resource?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
  allocation?: {
    id: string;
  };
  contract?: {
    id: string;
    name: string;
  };
  requestType: {
    code: string;
    name: string;
    category: string;
    description?: string;
  };
  approvals: RequestApproval[];
  comments: RequestComment[];
  history: RequestHistory[];
  watchers: RequestWatcher[];
  attachments: RequestAttachment[];
}

interface RequestApproval {
  id: string;
  stepOrder: number;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comments?: string;
  actedAt?: string;
  dueAt?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface RequestComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RequestHistory {
  id: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  changes?: Record<string, unknown>;
  comments?: string;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RequestWatcher {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface RequestAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// ============================================================================
// Status & Priority Config
// ============================================================================

const statusConfig: Record<Request['status'], { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: ArrowUpRight },
  APPROVED: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: X },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  ON_HOLD: { label: 'On Hold', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertTriangle },
};

const priorityConfig: Record<Request['priority'], { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  MEDIUM: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  HIGH: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  CRITICAL: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const approvalStatusConfig: Record<RequestApproval['status'], { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'text-amber-600', icon: Clock },
  APPROVED: { label: 'Approved', color: 'text-green-600', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'text-red-600', icon: XCircle },
  SKIPPED: { label: 'Skipped', color: 'text-gray-400', icon: ChevronRight },
};

// ============================================================================
// Action Modal Component
// ============================================================================

function ActionModal({
  isOpen,
  onClose,
  title,
  description,
  actionLabel,
  actionVariant = 'default',
  onAction,
  isLoading,
  requireComment = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: 'default' | 'destructive';
  onAction: (comments: string) => void;
  isLoading: boolean;
  requireComment?: boolean;
}) {
  const [comments, setComments] = useState('');

  const handleAction = () => {
    onAction(comments);
    setComments('');
  };

  const handleClose = () => {
    setComments('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-gray-500 mb-4">{description}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments {requireComment && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={actionVariant}
            onClick={handleAction}
            disabled={isLoading || (requireComment && !comments.trim())}
          >
            {isLoading ? 'Processing...' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Approval Timeline Component
// ============================================================================

function ApprovalTimeline({ approvals, currentUserId }: { approvals: RequestApproval[]; currentUserId: string }) {
  return (
    <div className="relative">
      {approvals.map((approval, index) => {
        const config = approvalStatusConfig[approval.status] || { label: approval.status || 'Unknown', color: 'text-gray-400', icon: Clock };
        const StatusIcon = config.icon;
        const isLast = index === approvals.length - 1;
        const isCurrentUser = approval.assignedTo?.id === currentUserId;

        return (
          <div key={approval.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
            )}
            
            {/* Timeline dot */}
            <div className={cn(
              'relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              approval.status === 'PENDING' ? 'bg-amber-100' :
              approval.status === 'APPROVED' ? 'bg-green-100' :
              approval.status === 'REJECTED' ? 'bg-red-100' :
              'bg-gray-100'
            )}>
              <StatusIcon className={cn('w-4 h-4', config.color)} />
            </div>

            {/* Content */}
            <div className={cn(
              'flex-1 pb-6',
              isCurrentUser && approval.status === 'PENDING' && 'bg-amber-50 -mx-2 px-2 py-2 rounded-lg'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Step {approval.stepOrder}: {approval.approverRole}
                  </p>
                  {approval.assignedTo && (
                    <p className="text-sm text-gray-500">
                      {approval.assignedTo.firstName} {approval.assignedTo.lastName}
                      {isCurrentUser && <span className="text-amber-600 font-medium"> (You)</span>}
                    </p>
                  )}
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color,
                  approval.status === 'PENDING' ? 'bg-amber-100' :
                  approval.status === 'APPROVED' ? 'bg-green-100' :
                  approval.status === 'REJECTED' ? 'bg-red-100' :
                  'bg-gray-100'
                )}>
                  {config.label}
                </span>
              </div>
              
              {approval.comments && (
                <p className="text-sm text-gray-600 mt-2 italic">"{approval.comments}"</p>
              )}
              
              {approval.actedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatDateTime(approval.actedAt)}
                </p>
              )}
              
              {approval.status === 'PENDING' && approval.dueAt && (
                <p className="text-xs text-amber-600 mt-1">
                  Due: {formatDateTime(approval.dueAt)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [actionModal, setActionModal] = useState<{
    type: 'submit' | 'approve' | 'reject' | 'return' | 'cancel' | null;
  }>({ type: null });
  const [newComment, setNewComment] = useState('');

  // Fetch request details
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const response = await api.get<{ data: Request }>(`/requests/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['request-comments', id],
    queryFn: async () => {
      const response = await api.get<{ data: RequestComment[] }>(`/requests/${id}/comments`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch history
  const { data: historyData } = useQuery({
    queryKey: ['request-history', id],
    queryFn: async () => {
      const response = await api.get<{ data: RequestHistory[] }>(`/requests/${id}/history`);
      return response.data;
    },
    enabled: !!id,
  });

  // Action mutations
  const submitMutation = useMutation({
    mutationFn: async (comments: string) => {
      return api.post(`/requests/${id}/submit`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['request-history', id] });
      setActionModal({ type: null });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (comments: string) => {
      return api.post(`/requests/${id}/approve`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['request-history', id] });
      setActionModal({ type: null });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (comments: string) => {
      return api.post(`/requests/${id}/reject`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['request-history', id] });
      setActionModal({ type: null });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (comments: string) => {
      return api.post(`/requests/${id}/return`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['request-history', id] });
      setActionModal({ type: null });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (comments: string) => {
      return api.post(`/requests/${id}/cancel`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['request-history', id] });
      setActionModal({ type: null });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return api.post(`/requests/${id}/comments`, { content, isInternal: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-comments', id] });
      setNewComment('');
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </MainLayout>
    );
  }

  if (error || !request) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Request not found</h2>
          <p className="text-gray-500 mb-4">The request you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/requests')}>Back to Requests</Button>
        </div>
      </MainLayout>
    );
  }

  const status = statusConfig[request.status] || { label: request.status || 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText };
  const priority = priorityConfig[request.priority] || { label: request.priority || 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  const StatusIcon = status.icon;
  
  const isRequester = request.requester?.id === user?.id;
  const canEdit = request.status === 'DRAFT' && isRequester;
  const canSubmit = request.status === 'DRAFT' && isRequester;
  const canCancel = ['DRAFT', 'PENDING_APPROVAL'].includes(request.status) && isRequester;
  
  const currentApproval = request.approvals?.find(a => a.status === 'PENDING');
  const canApprove = currentApproval?.assignedTo?.id === user?.id;

  const comments = commentsData || request.comments || [];
  const history = historyData || request.history || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back button and header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/requests')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-500">{request.requestNumber}</span>
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1', status.bgColor, status.color)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priority.bgColor, priority.color)}>
                {priority.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{request.title}</h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {canSubmit && (
              <Button onClick={() => setActionModal({ type: 'submit' })} className="gap-2">
                <Send className="w-4 h-4" />
                Submit for Approval
              </Button>
            )}
            
            {canApprove && (
              <>
                <Button onClick={() => setActionModal({ type: 'approve' })} className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setActionModal({ type: 'reject' })} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
                <Button variant="outline" onClick={() => setActionModal({ type: 'return' })} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Return
                </Button>
              </>
            )}
            
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/requests/${id}/edit`)} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            
            {canCancel && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setActionModal({ type: 'cancel' })}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Request
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'details' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  activeTab === 'comments' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Comments
                {comments.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">{comments.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                History
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  {request.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                      <p className="text-gray-900 whitespace-pre-wrap">{request.description}</p>
                    </div>
                  )}

                  {/* Request Data */}
                  {request.requestData && Object.keys(request.requestData).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Request Information</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <dl className="grid grid-cols-2 gap-4">
                          {Object.entries(request.requestData).map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                              <dd className="text-sm font-medium text-gray-900">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* Urgency Justification */}
                  {request.urgencyJustification && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Urgency Justification</h4>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-amber-800">{request.urgencyJustification}</p>
                      </div>
                    </div>
                  )}

                  {/* Related Entities */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Related To</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.resource && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg">
                          <User className="w-4 h-4 text-violet-600" />
                          <span className="text-sm text-violet-700">
                            {request.resource.firstName} {request.resource.lastName}
                          </span>
                        </div>
                      )}
                      {request.project && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                          <FolderKanban className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700">{request.project.name}</span>
                        </div>
                      )}
                      {request.contract && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">{request.contract.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {request.attachments && request.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Attachments</h4>
                      <div className="space-y-2">
                        {request.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Paperclip className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'comments' && (
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={() => addCommentMutation.mutate(newComment)}
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                        >
                          {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 pt-4 border-t">
                    {comments.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0">
                            {comment.author?.firstName?.[0] || '?'}{comment.author?.lastName?.[0] || ''}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {comment.author?.firstName} {comment.author?.lastName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(comment.createdAt)}
                              </span>
                              {comment.isInternal && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                  Internal
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No history yet</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <History className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.actor?.firstName} {item.actor?.lastName}
                              </span>
                              <span className="text-gray-500">{item.action?.toLowerCase().replace(/_/g, ' ')}</span>
                            </div>
                            {item.previousStatus && item.newStatus && (
                              <p className="text-sm text-gray-500 mt-1">
                                Status changed from{' '}
                                <span className="font-medium">{item.previousStatus}</span>
                                {' '}to{' '}
                                <span className="font-medium">{item.newStatus}</span>
                              </p>
                            )}
                            {item.comments && (
                              <p className="text-sm text-gray-600 mt-1 italic">"{item.comments}"</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Request Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">{request.requestType?.name || request.typeCode || 'Unknown Type'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <p className="font-medium text-gray-900">
                    {request.requester?.firstName} {request.requester?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{request.requester?.email}</p>
                </div>
                {request.onBehalfOf && (
                  <div>
                    <p className="text-xs text-gray-500">On Behalf Of</p>
                    <p className="font-medium text-gray-900">
                      {request.onBehalfOf?.firstName} {request.onBehalfOf?.lastName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDateTime(request.createdAt)}</p>
                </div>
                {request.submittedAt && (
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-medium text-gray-900">{formatDateTime(request.submittedAt)}</p>
                  </div>
                )}
                {request.requestedCompletionDate && (
                  <div>
                    <p className="text-xs text-gray-500">Requested By</p>
                    <p className="font-medium text-gray-900">{formatDate(request.requestedCompletionDate)}</p>
                  </div>
                )}
                {request.slaDeadline && (
                  <div>
                    <p className="text-xs text-gray-500">SLA Deadline</p>
                    <p className={cn(
                      'font-medium',
                      new Date(request.slaDeadline) < new Date() ? 'text-red-600' : 'text-gray-900'
                    )}>
                      {formatDateTime(request.slaDeadline)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Version</p>
                  <p className="font-medium text-gray-900">v{request.version}</p>
                </div>
              </CardContent>
            </Card>

            {/* Approval Flow */}
            {request.approvals && request.approvals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Approval Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApprovalTimeline approvals={request.approvals} currentUserId={user?.id || ''} />
                </CardContent>
              </Card>
            )}

            {/* Watchers */}
            {request.watchers && request.watchers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Watchers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {request.watchers.map((watcher) => (
                      <div
                        key={watcher.id}
                        className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full"
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                          {watcher.user?.firstName?.[0] || '?'}
                        </div>
                        <span className="text-xs text-gray-700">
                          {watcher.user?.firstName} {watcher.user?.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <ActionModal
        isOpen={actionModal.type === 'submit'}
        onClose={() => setActionModal({ type: null })}
        title="Submit for Approval"
        description="This will submit the request for approval. You won't be able to edit it after submission."
        actionLabel="Submit"
        onAction={submitMutation.mutate}
        isLoading={submitMutation.isPending}
      />

      <ActionModal
        isOpen={actionModal.type === 'approve'}
        onClose={() => setActionModal({ type: null })}
        title="Approve Request"
        description="Are you sure you want to approve this request?"
        actionLabel="Approve"
        onAction={approveMutation.mutate}
        isLoading={approveMutation.isPending}
      />

      <ActionModal
        isOpen={actionModal.type === 'reject'}
        onClose={() => setActionModal({ type: null })}
        title="Reject Request"
        description="Please provide a reason for rejecting this request."
        actionLabel="Reject"
        actionVariant="destructive"
        onAction={rejectMutation.mutate}
        isLoading={rejectMutation.isPending}
        requireComment
      />

      <ActionModal
        isOpen={actionModal.type === 'return'}
        onClose={() => setActionModal({ type: null })}
        title="Return Request"
        description="Return this request to the requester for modifications."
        actionLabel="Return"
        onAction={returnMutation.mutate}
        isLoading={returnMutation.isPending}
        requireComment
      />

      <ActionModal
        isOpen={actionModal.type === 'cancel'}
        onClose={() => setActionModal({ type: null })}
        title="Cancel Request"
        description="Are you sure you want to cancel this request? This action cannot be undone."
        actionLabel="Cancel Request"
        actionVariant="destructive"
        onAction={cancelMutation.mutate}
        isLoading={cancelMutation.isPending}
      />
    </MainLayout>
  );
}
