import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FileText,
  Pill,
  Activity,
  Droplet,
  Upload,
  Calendar,
  Sparkles,
  Filter,
  CheckCircle,
  Clock,
  Plus,
  X,
  Eye
} from 'lucide-react';

export default function HealthTimelinePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeSummaryModal, setActiveSummaryModal] = useState(null);

  // Upload Form State
  const [newRecord, setNewRecord] = useState({
    title: '',
    type: 'lab_report',
    aiSummary: '',
    fileUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=600&q=80'
  });
  const [uploading, setUploading] = useState(false);

  const fetchRecords = () => {
    if (!user) return;
    setLoading(true);
    api.get(`/records/patient/${user.id}?type=${filterType}`)
      .then(res => setRecords(res.data.records || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [user, filterType]);

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await api.post('/records', {
        ...newRecord,
        patientId: user.id
      });
      setShowUploadModal(false);
      setNewRecord({
        title: '',
        type: 'lab_report',
        aiSummary: '',
        fileUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=600&q=80'
      });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const getRecordIcon = (type) => {
    switch (type) {
      case 'prescription':
        return <Pill className="w-5 h-5 text-teal-600" />;
      case 'lab_report':
        return <FileText className="w-5 h-5 text-cyan-600" />;
      case 'blood_donation':
        return <Droplet className="w-5 h-5 text-rose-500 fill-rose-500" />;
      default:
        return <Activity className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Continuous Health Timeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Chronological longitudinal record of prescriptions, lab diagnostics, vital logs, and voluntary blood donations.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Medical Document</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full font-bold transition ${filterType === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          All Events
        </button>
        <button
          onClick={() => setFilterType('prescription')}
          className={`px-3 py-1.5 rounded-full font-bold transition ${filterType === 'prescription' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          Prescriptions
        </button>
        <button
          onClick={() => setFilterType('lab_report')}
          className={`px-3 py-1.5 rounded-full font-bold transition ${filterType === 'lab_report' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          Lab & Diagnostics
        </button>
        <button
          onClick={() => setFilterType('blood_donation')}
          className={`px-3 py-1.5 rounded-full font-bold transition flex items-center space-x-1 ${filterType === 'blood_donation' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}
        >
          <Droplet className="w-3.5 h-3.5 fill-current" />
          <span>LifeShare Blood Gifts</span>
        </button>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No medical timeline events found in this category.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-teal-200 dark:before:bg-teal-900">
          {records.map((r) => (
            <div key={r._id} className="relative group">
              {/* Timeline marker node */}
              <div className="absolute -left-[27px] sm:-left-[31px] top-4 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 flex items-center justify-center shadow-md">
                {getRecordIcon(r.type)}
              </div>

              {/* Event Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {r.type.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{r.title}</h3>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                </div>

                {/* AI-Generated Summary Box */}
                {r.aiSummary && (
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
                    <div className="flex items-center space-x-1.5 font-bold mb-1 text-teal-800 dark:text-teal-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>SmartCare Plain-Language Clinical Summary:</span>
                    </div>
                    <p className="leading-relaxed">{r.aiSummary}</p>
                  </div>
                )}

                {/* Prescription Medicines List */}
                {r.metadata?.medicines && r.metadata.medicines.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Prescribed Medications:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {r.metadata.medicines.map((m, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                          <strong className="text-teal-700 dark:text-teal-300 font-bold block">{m.name} ({m.dosage})</strong>
                          <span className="text-slate-500 block text-[11px] mt-0.5">Schedule: {m.frequency} • {m.duration}</span>
                          <span className="text-slate-400 block text-[10px] italic">{m.instructions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blood Donation Details */}
                {r.type === 'blood_donation' && r.metadata?.bloodDonation && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-950 dark:text-rose-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">Unit #{r.metadata.bloodDonation.unitNumber}</span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-300">
                        {r.metadata.bloodDonation.volumeMl}ml {r.metadata.bloodDonation.component} • Screening: {r.metadata.bloodDonation.screeningStatus}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100 text-[10px] font-bold rounded-full">
                      Voluntary & Unpaid
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Upload Medical Record</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs mt-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Record Title</label>
                <input
                  type="text"
                  required
                  value={newRecord.title}
                  onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                  placeholder="e.g. CBC Blood Count, Chest X-Ray..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={newRecord.type}
                  onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="lab_report">Lab Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="scan_image">Scan Image / X-Ray</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Plain-Language Summary (Optional)</label>
                <textarea
                  rows={2}
                  value={newRecord.aiSummary}
                  onChange={(e) => setNewRecord({ ...newRecord, aiSummary: e.target.value })}
                  placeholder="SmartCare automatically generates clinical summaries..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-slate-500 block">PDF or Image Document Attached</span>
                <span className="text-[10px] text-teal-600 font-semibold">report_sample.pdf (Secure SSL Encrypted)</span>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition"
              >
                {uploading ? 'Processing & Securing...' : 'Add to Health Timeline'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
