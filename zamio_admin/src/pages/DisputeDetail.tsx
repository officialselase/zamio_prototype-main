import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Building,
  Music,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
  User,
  Flag,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  Send,
  Eye,
  Download,
} from 'lucide-react';
import { Card } from '@zamio/ui';
import {
  fetchDisputeDetail,
  updateDisputeStatus,
  assignDispute,
  addDisputeComment,
  addDisputeEvidence,
  type DisputeDetail as DisputeDetailType,
} from '../lib/api';

const DisputeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [dispute, setDispute] = useState<DisputeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Comment form
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Status transition
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    if (id) {
      loadDisputeDetail();
    }
  }, [id]);

  const loadDisputeDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchDisputeDetail(id);
      setDispute(data);
    } catch (err: any) {
      console.error('Failed to load dispute:', err);
      setError(err?.response?.data?.message || 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !selectedStatus) return;
    
    setActionLoading(true);
    try {
      const updated = await updateDisputeStatus(id, selectedStatus, statusReason);
      setDispute(updated);
      setShowStatusModal(false);
      setSelectedStatus('');
      setStatusReason('');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err?.response?.data?.message || 'Failed to update dispute status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    
    setCommentLoading(true);
    try {
      await addDisputeComment(id, newComment, isInternalComment);
      setNewComment('');
      setIsInternalComment(false);
      await loadDisputeDetail(); // Reload to get updated comments
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert(err?.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'evidence_required':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'escalated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'rejected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading dispute details...</span>
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-center text-red-600 dark:text-red-400 mb-4">
            {error || 'Dispute not found'}
          </p>
          <button
            onClick={() => navigate('/disputes')}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Disputes
          </button>
        </Card>
      </div>
    );
  }

  return (
    <main className="w-full px-6 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/disputes"
          className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Disputes
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {dispute.title}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dispute.status)}`}>
                {dispute.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(dispute.priority)}`}>
                {dispute.priority.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ID: {dispute.dispute_id}
              </span>
            </div>
          </div>
          
          {dispute.available_transitions && dispute.available_transitions.length > 0 && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Change Status
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Description
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {dispute.description}
            </p>
          </Card>

          {/* Related Information */}
          {(dispute.related_track || dispute.related_station) && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Related Information
              </h2>
              <div className="space-y-4">
                {dispute.related_track && (
                  <div className="flex items-start space-x-3">
                    <Music className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Track</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dispute.related_track.title}
                      </p>
                      {dispute.related_track.artist && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          by {dispute.related_track.artist}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {dispute.related_station && (
                  <div className="flex items-start space-x-3">
                    <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Station</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dispute.related_station.name}
                      </p>
                      {dispute.related_station.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {dispute.related_station.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Evidence */}
          {dispute.evidence && dispute.evidence.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Evidence ({dispute.evidence.length})
              </h2>
              <div className="space-y-3">
                {dispute.evidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {evidence.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {evidence.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatFileSize(evidence.file_size)} • {evidence.file_category} • 
                          Uploaded by {evidence.uploaded_by.first_name} {evidence.uploaded_by.last_name}
                        </p>
                      </div>
                    </div>
                    {evidence.secure_url && (
                      <a
                        href={evidence.secure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Comments */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Comments ({dispute.comments?.length || 0})
            </h2>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Internal note (not visible to submitter)
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!newComment.trim() || commentLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {commentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Post Comment</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {dispute.comments && dispute.comments.length > 0 ? (
                dispute.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.is_internal
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.author.first_name} {comment.author.last_name}
                        </span>
                        {comment.is_internal && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No comments yet
                </p>
              )}
            </div>
          </Card>

          {/* Timeline */}
          {dispute.audit_logs && dispute.audit_logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Activity Timeline
              </h2>
              <div className="space-y-4">
                {dispute.audit_logs.map((log, index) => (
                  <div key={log.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {log.actor.first_name} {log.actor.last_name} • {formatDate(log.timestamp)}
                      </p>
                      {log.previous_state && log.new_state && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {log.previous_state} → {log.new_state}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {dispute.dispute_type.replace('_', ' ')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Submitted By</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {dispute.submitted_by.first_name} {dispute.submitted_by.last_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dispute.submitted_by.email}
                </p>
              </div>
              
              {dispute.assigned_to && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dispute.assigned_to.first_name} {dispute.assigned_to.last_name}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(dispute.created_at)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(dispute.updated_at)}
                </p>
              </div>
              
              {dispute.resolved_at && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(dispute.resolved_at)}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Resolution */}
          {dispute.resolution_summary && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resolution
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {dispute.resolution_summary}
              </p>
              {dispute.resolution_action_taken && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Action Taken</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {dispute.resolution_action_taken}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Change Dispute Status
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select status...</option>
                  {dispute.available_transitions?.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Provide a reason for this status change..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus('');
                    setStatusReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || actionLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
};

export default DisputeDetail;
