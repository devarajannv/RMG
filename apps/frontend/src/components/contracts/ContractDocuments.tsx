/**
 * ContractDocuments Component
 * 
 * Comprehensive document management for contracts:
 * - Upload new documents with drag & drop
 * - Preview documents inline
 * - Version history tracking
 * - Document categorization
 * - Download/delete operations
 * 
 * @module ContractDocuments
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FilePlus,
  Clock,
  User,
  ExternalLink,
  MoreVertical,
  AlertCircle,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Can } from '@/components/permissions';

// ============================================================================
// Types
// ============================================================================

export interface ContractDocument {
  id: string;
  name: string;
  type: 'CONTRACT' | 'AMENDMENT' | 'ATTACHMENT' | 'SOW' | 'INVOICE' | 'OTHER';
  mimeType: string;
  size: number;
  url: string;
  version: number;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
  description?: string;
}

interface ContractDocumentsProps {
  contractId: string;
  documents?: ContractDocument[];
  onUpload?: (file: File, type: string) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>;
  readOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DOCUMENT_TYPES = {
  CONTRACT: { label: 'Contract', color: 'bg-blue-100 text-blue-700' },
  AMENDMENT: { label: 'Amendment', color: 'bg-purple-100 text-purple-700' },
  ATTACHMENT: { label: 'Attachment', color: 'bg-gray-100 text-gray-700' },
  SOW: { label: 'Statement of Work', color: 'bg-green-100 text-green-700' },
  INVOICE: { label: 'Invoice', color: 'bg-yellow-100 text-yellow-700' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  if (mimeType.includes('word')) return <FileText className="h-8 w-8 text-blue-500" />;
  return <File className="h-8 w-8 text-gray-500" />;
}

// ============================================================================
// Upload Zone Component
// ============================================================================

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

function UploadZone({ onFilesSelected, disabled, isUploading }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  }, [disabled, onFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFilesSelected(files);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-gray-600">Uploading...</p>
        </div>
      ) : (
        <>
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            PDF, Word, Excel, or images up to 10MB
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Document Card Component
// ============================================================================

interface DocumentCardProps {
  document: ContractDocument;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

function DocumentCard({ document, onPreview, onDownload, onDelete, readOnly }: DocumentCardProps) {
  const typeConfig = DOCUMENT_TYPES[document.type] || DOCUMENT_TYPES.OTHER;

  return (
    <div className="flex items-start gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
      {/* File Icon */}
      <div className="flex-shrink-0">
        {getFileIcon(document.mimeType)}
      </div>

      {/* Document Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.color)}>
            {typeConfig.label}
          </span>
          {document.version > 1 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
              v{document.version}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
          <span>{formatFileSize(document.size)}</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {document.uploadedBy.firstName} {document.uploadedBy.lastName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(document.uploadedAt)}
          </span>
        </div>

        {document.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{document.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(document.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </DropdownMenuItem>
            {!readOnly && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// Upload Dialog Component
// ============================================================================

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onUpload: (fileData: { file: File; type: string; description: string }[]) => void;
  isUploading: boolean;
}

function UploadDialog({ isOpen, onClose, files, onUpload, isUploading }: UploadDialogProps) {
  const [fileData, setFileData] = useState<{ type: string; description: string }[]>([]);

  // Initialize file data when files change
  useState(() => {
    setFileData(files.map(() => ({ type: 'ATTACHMENT', description: '' })));
  });

  const handleSubmit = () => {
    const uploadData = files.map((file, idx) => ({
      file,
      type: fileData[idx]?.type || 'ATTACHMENT',
      description: fileData[idx]?.description || '',
    }));
    onUpload(uploadData);
  };

  const updateFileData = (index: number, field: 'type' | 'description', value: string) => {
    setFileData((prev) => {
      const updated = [...prev];
      if (!updated[index]) updated[index] = { type: 'ATTACHMENT', description: '' };
      updated[index][field] = value;
      return updated;
    });
  };

  const isValid = files.every((file) => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return false;
    if (file.size > MAX_FILE_SIZE) return false;
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {files.map((file, index) => {
            const isValidFile = ACCEPTED_FILE_TYPES.includes(file.type);
            const isValidSize = file.size <= MAX_FILE_SIZE;

            return (
              <div
                key={`${file.name}-${index}`}
                className={cn(
                  'p-4 border rounded-lg',
                  !isValidFile || !isValidSize ? 'border-red-300 bg-red-50' : 'border-gray-200'
                )}
              >
                <div className="flex items-start gap-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                    </div>

                    {!isValidFile && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        Invalid file type
                      </p>
                    )}
                    {!isValidSize && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        File too large (max 10MB)
                      </p>
                    )}

                    {isValidFile && isValidSize && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-sm text-gray-600">Document Type</label>
                          <select
                            className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                            value={fileData[index]?.type || 'ATTACHMENT'}
                            onChange={(e) => updateFileData(index, 'type', e.target.value)}
                          >
                            {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Description (optional)</label>
                          <input
                            type="text"
                            className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                            placeholder="Brief description..."
                            value={fileData[index]?.description || ''}
                            onChange={(e) => updateFileData(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isUploading}>
            {isUploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Preview Dialog Component
// ============================================================================

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: ContractDocument | null;
}

function PreviewDialog({ isOpen, onClose, document }: PreviewDialogProps) {
  if (!document) return null;

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {document.name}
            <span className="text-sm font-normal text-gray-500">
              v{document.version}
            </span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="h-[70vh]">
          {isPdf ? (
            <iframe
              src={document.url}
              className="w-full h-full border-0 rounded"
              title={document.name}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full bg-gray-100 rounded">
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded">
              {getFileIcon(document.mimeType)}
              <p className="mt-4 text-gray-600">Preview not available for this file type</p>
              <Button
                className="mt-4"
                onClick={() => window.open(document.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.open(document.url, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContractDocuments({
  contractId,
  documents: initialDocuments,
  onUpload,
  onDelete,
  readOnly = false,
}: ContractDocumentsProps) {
  const queryClient = useQueryClient();
  
  // Local state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<ContractDocument | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<ContractDocument | null>(null);

  // Fetch documents if not provided
  const { data: fetchedDocuments, isLoading } = useQuery({
    queryKey: ['contract-documents', contractId],
    queryFn: () => api.get<{ data: ContractDocument[] }>(`/contracts/${contractId}/documents`),
    enabled: !initialDocuments,
  });

  const documents = initialDocuments || fetchedDocuments?.data || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: { file: File; type: string; description: string }[]) => {
      if (onUpload) {
        for (const { file, type } of fileData) {
          await onUpload(file, type);
        }
        return;
      }
      
      // Default upload logic
      for (const { file, type, description } of fileData) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        if (description) formData.append('description', description);
        
        await api.post(`/contracts/${contractId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents', contractId] });
      setShowUploadDialog(false);
      setSelectedFiles([]);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (onDelete) {
        await onDelete(documentId);
        return;
      }
      await api.delete(`/contracts/${contractId}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents', contractId] });
      setDeleteDocument(null);
    },
  });

  // Handle file selection
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setShowUploadDialog(true);
  };

  // Handle download
  const handleDownload = (doc: ContractDocument) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    link.click();
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, ContractDocument[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          Documents ({documents.length})
        </CardTitle>
        {!readOnly && (
          <Can permission="contract:write">
            <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
              <FilePlus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </Can>
        )}
      </CardHeader>
      <CardContent>
        {/* Upload Zone */}
        {!readOnly && (
          <Can permission="contract:write">
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={uploadMutation.isPending}
              isUploading={uploadMutation.isPending}
            />
          </Can>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No documents uploaded yet</p>
          </div>
        )}

        {/* Document List by Type */}
        {!isLoading && documents.length > 0 && (
          <div className="space-y-6 mt-6">
            {Object.entries(groupedDocuments).map(([type, docs]) => (
              <div key={type}>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  {DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.label || type}
                  ({docs.length})
                </h4>
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onPreview={() => setPreviewDocument(doc)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => setDeleteDocument(doc)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={showUploadDialog && selectedFiles.length > 0}
        onClose={() => {
          setShowUploadDialog(false);
          setSelectedFiles([]);
        }}
        files={selectedFiles}
        onUpload={(data) => uploadMutation.mutate(data)}
        isUploading={uploadMutation.isPending}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Are you sure you want to delete "{deleteDocument?.name}"?</p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDocument(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDocument && deleteMutation.mutate(deleteDocument.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
