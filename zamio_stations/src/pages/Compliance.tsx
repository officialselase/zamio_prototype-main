import React, { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  FileText,
  CheckCircle,
  Shield,
  FileCheck,
  Upload,
  Download,
  Eye,
  Trash2,
  Clock,
  AlertCircle,
  User,
  Mail,
  Phone,
} from 'lucide-react';

const Compliance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'checklist' | 'licenses' | 'reports'>('documents');

  const [complianceDocuments, setComplianceDocuments] = useState([
    {
      id: '1',
      name: 'Broadcasting License.pdf',
      type: 'license' as const,
      status: 'approved' as const,
      uploadedAt: '2024-01-15',
      fileSize: '2.4 MB',
      expiryDate: '2025-12-31',
      description: 'Main broadcasting license issued by NCA'
    },
    {
      id: '2',
      name: 'Technical Certificate.pdf',
      type: 'certificate' as const,
      status: 'approved' as const,
      uploadedAt: '2024-10-01',
      fileSize: '1.8 MB',
      expiryDate: '2026-06-15',
      description: 'Technical compliance certificate for equipment'
    },
    {
      id: '3',
      name: 'Monthly Compliance Report.pdf',
      type: 'report' as const,
      status: 'pending' as const,
      uploadedAt: '2024-11-01',
      fileSize: '3.2 MB',
      description: 'November 2024 compliance report'
    },
    {
      id: '4',
      name: 'Emergency Procedures.pdf',
      type: 'other' as const,
      status: 'approved' as const,
      uploadedAt: '2024-09-15',
      fileSize: '1.2 MB',
      expiryDate: '2025-09-15',
      description: 'Emergency broadcast procedures manual'
    }
  ]);

  const [checklistItems, setChecklistItems] = useState([
    { id: 'license', label: 'Valid broadcasting license', completed: true, required: true, lastUpdated: '2024-01-15' },
    { id: 'technical', label: 'Technical compliance certificate', completed: true, required: true, lastUpdated: '2024-10-01' },
    { id: 'frequency', label: 'Frequency allocation documentation', completed: true, required: true, lastUpdated: '2024-01-15' },
    { id: 'insurance', label: 'Public liability insurance', completed: false, required: false, notes: 'Under review' },
    { id: 'content', label: 'Content compliance guidelines', completed: true, required: true, lastUpdated: '2024-01-01' },
    { id: 'emergency', label: 'Emergency broadcast procedures', completed: true, required: false, lastUpdated: '2024-09-15' },
    { id: 'reporting', label: 'Monthly reporting compliance', completed: true, required: true, lastUpdated: '2024-11-01' }
  ]);

  const [licenseInfo, setLicenseInfo] = useState({
    licenseNumber: 'NCA/BR/2024/001',
    licenseAuthority: 'National Communications Authority',
    licenseIssueDate: '2024-01-01',
    licenseExpiryDate: '2025-12-31',
    frequency: '104.3 MHz',
    power: '1000W',
    stationCategory: 'Commercial FM',
    complianceOfficer: 'Sarah Johnson',
    officerEmail: 'sarah@peacefmonline.com',
    officerPhone: '+233 24 123 4567',
    emergencyContact: '+233 24 987 6543'
  });

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<string | null>(null);
  const [documentFormData, setDocumentFormData] = useState({
    name: '',
    type: 'license' as 'license' | 'certificate' | 'report' | 'other',
    description: '',
    expiryDate: ''
  });

  const documentTypes = [
    { value: 'license', label: 'Broadcasting License' },
    { value: 'certificate', label: 'Technical Certificate' },
    { value: 'report', label: 'Compliance Report' },
    { value: 'other', label: 'Other Document' }
  ];

  const handleDocumentSubmit = () => {
    if (!documentFormData.name.trim()) return;

    const newDocument = {
      id: Date.now().toString(),
      name: documentFormData.name,
      type: documentFormData.type,
      status: 'pending' as const,
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: '0 MB',
      description: documentFormData.description,
      expiryDate: documentFormData.expiryDate || undefined
    };

    setComplianceDocuments(prev => [...prev, newDocument]);
    setShowDocumentModal(false);
    setDocumentFormData({ name: '', type: 'license', description: '', expiryDate: '' });
  };

  const handleChecklistToggle = (itemId: string) => {
    setChecklistItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, completed: !item.completed, lastUpdated: new Date().toISOString().split('T')[0] }
        : item
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'license': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'certificate': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'report': return 'bg-green-100 text-green-700 border-green-200';
      case 'other': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const complianceStats = {
    total: complianceDocuments.length,
    approved: complianceDocuments.filter(d => d.status === 'approved').length,
    pending: complianceDocuments.filter(d => d.status === 'pending').length,
    expired: complianceDocuments.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date()).length
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Management</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Monitor license compliance, track regulatory requirements, and ensure your station meets all broadcasting standards.
          </p>
        </div>
        <button
          onClick={() => setShowDocumentModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 hover:scale-105"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Compliance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Documents</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {complianceStats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Approved</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {complianceStats.approved}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Pending Review</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {complianceStats.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Expiring Soon</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {complianceStats.expired}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-600">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'checklist', label: 'Compliance Checklist', icon: CheckCircle },
            { id: 'licenses', label: 'License Information', icon: Shield },
            { id: 'reports', label: 'Compliance Reports', icon: FileCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'documents' && (
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-500" />
              Compliance Documents ({complianceDocuments.length})
            </h2>

            <div className="space-y-4">
              {complianceDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTypeColor(doc.type)}`}>
                      {getStatusIcon(doc.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{doc.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{doc.fileSize}</span>
                        {doc.expiryDate && (
                          <>
                            <span>•</span>
                            <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {complianceDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No compliance documents uploaded yet</p>
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First Document
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'checklist' && (
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
              Compliance Checklist
            </h2>

            <div className="space-y-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleChecklistToggle(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-slate-500 hover:border-emerald-400'
                      }`}
                    >
                      {item.completed && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${item.completed ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            Required
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.notes}</p>
                      )}
                      {item.lastUpdated && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Progress: {checklistItems.filter(i => i.completed).length} of {checklistItems.length} completed
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(checklistItems.filter(i => i.completed).length / checklistItems.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round((checklistItems.filter(i => i.completed).length / checklistItems.length) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Compliance Score</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'licenses' && (
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-500" />
              License Information
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    {licenseInfo.licenseNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Issuing Authority
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    {licenseInfo.licenseAuthority}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Date
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                      {new Date(licenseInfo.licenseIssueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Date
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                      {new Date(licenseInfo.licenseExpiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    {licenseInfo.frequency}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Power Output
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    {licenseInfo.power}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Station Category
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                    {licenseInfo.stationCategory}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compliance Officer</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{licenseInfo.complianceOfficer}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Compliance Officer</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{licenseInfo.officerEmail}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{licenseInfo.officerPhone}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Emergency Contact</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{licenseInfo.emergencyContact}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'reports' && (
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <FileCheck className="w-5 h-5 mr-2 text-purple-500" />
              Compliance Reports
            </h2>

            <div className="text-center py-12">
              <FileCheck className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Compliance Reports</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Generate detailed compliance reports and analytics for regulatory submissions.
              </p>

              <div className="flex items-center justify-center space-x-4">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-all duration-200">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Monthly Report
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200">
                  <Eye className="w-4 h-4 mr-2" />
                  View Report History
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Upload Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Compliance Document</h3>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentFormData.name}
                  onChange={(e) => setDocumentFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter document name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  value={documentFormData.type}
                  onChange={(e) => setDocumentFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={documentFormData.description}
                  onChange={(e) => setDocumentFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief description of the document"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={documentFormData.expiryDate}
                  onChange={(e) => setDocumentFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDocumentModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocumentSubmit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Upload Document
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Compliance;
