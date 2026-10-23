import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  User,
  Heart,
  Bell,
  Shield,
  Lock,
  Save,
  Download,
  Plus,
  X,
  Check,
  AlertCircle,
  Activity,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Stethoscope,
  Award,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  Trash2,
  Camera,
  Filter,
  Search,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ShieldCheck
} from 'lucide-react';

export default function UserProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Completeness state
  const [completeness, setCompleteness] = useState({ score: 40, prompts: [] });

  // Profile Form state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    dateOfBirth: '',
    cityArea: 'New Delhi',
    avatar: '',
    emergencyContact: { name: '', relationship: 'spouse', phone: '' },
    preferredLanguage: 'en',
    notificationPreferences: {
      channels: { inApp: true, email: true, sms: true },
      types: { appointments: true, queue: true, reminders: true, bloodAlerts: true, emergency: true }
    },
    privacySettings: {
      shareWithConsultingDoctors: true,
      showInDonorDirectory: true,
      allowEmergencyBreakGlass: true
    },
    patientHealth: {
      bloodGroup: 'O+',
      bloodGroupSource: 'self_declared',
      heightCm: 175,
      weightKg: 72,
      allergies: ['Penicillin'],
      existingConditions: ['Hypertension'],
      currentMedicines: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' }],
      pastSurgeries: []
    },
    donorSettings: {
      willingToDonate: true,
      lastDonationDate: ''
    },
    doctorDetails: null
  });

  // Password change state
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPass, setChangingPass] = useState(false);

  // New item inputs
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedicine, setNewMedicine] = useState({ name: '', dosage: '', frequency: '' });

  // Medical Reports State
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilterType, setReportFilterType] = useState('all');
  const [reportFilterEmergencyOnly, setReportFilterEmergencyOnly] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Upload Form state
  const [uploadData, setUploadData] = useState({
    title: '',
    reportType: 'blood_test',
    issuingFacility: '',
    doctorName: '',
    reportDate: new Date().toISOString().split('T')[0],
    notes: '',
    isEmergencyImportant: false,
    visibility: 'consent_only',
    file: null,
    fileName: '',
    filePreview: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchProfileData = async () => {
    try {
      const [profileRes, compRes] = await Promise.all([
        api.get('/profile/me'),
        api.get('/profile/completeness')
      ]);

      const data = profileRes.data.user;
      setProfile({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        gender: data.gender || 'male',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
        cityArea: data.cityArea || 'New Delhi',
        avatar: data.avatar || '',
        emergencyContact: data.emergencyContact || { name: '', relationship: 'spouse', phone: '' },
        preferredLanguage: data.preferredLanguage || 'en',
        notificationPreferences: data.notificationPreferences || {
          channels: { inApp: true, email: true, sms: true },
          types: { appointments: true, queue: true, reminders: true, bloodAlerts: true, emergency: true }
        },
        privacySettings: data.privacySettings || {
          shareWithConsultingDoctors: true,
          showInDonorDirectory: true,
          allowEmergencyBreakGlass: true
        },
        patientHealth: {
          bloodGroup: data.patientHealth?.bloodGroup || 'O+',
          bloodGroupSource: data.patientHealth?.bloodGroupSource || 'self_declared',
          heightCm: data.patientHealth?.heightCm || 170,
          weightKg: data.patientHealth?.weightKg || 70,
          allergies: data.patientHealth?.allergies || [],
          existingConditions: data.patientHealth?.existingConditions || [],
          currentMedicines: data.patientHealth?.currentMedicines || [],
          pastSurgeries: data.patientHealth?.pastSurgeries || []
        },
        donorSettings: {
          willingToDonate: data.donorSettings?.willingToDonate ?? true,
          lastDonationDate: data.donorSettings?.lastDonationDate ? data.donorSettings.lastDonationDate.split('T')[0] : ''
        },
        doctorDetails: profileRes.data.doctorDetails || null
      });

      setCompleteness(compRes.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/profile/me', profile);
      showToast('Profile updated successfully!');
      if (res.data.completeness) {
        setCompleteness(res.data.completeness);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setChangingPass(true);
    try {
      await api.put('/profile/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      showToast('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/profile/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartCare_Profile_${profile.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Profile data exported successfully.');
    } catch (err) {
      showToast('Failed to export profile data', 'error');
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await api.get('/reports/my');
      setReports(res.data.reports || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load medical reports', 'error');
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && user?.role === 'patient') {
      fetchReports();
    }
  }, [activeTab, user]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error');
      return;
    }
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : '';
    setUploadData(prev => ({
      ...prev,
      file,
      fileName: file.name,
      filePreview: preview,
      title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    }));
  };

  const handleReportUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      showToast('Please select a report file (PDF or image)', 'error');
      return;
    }
    if (!uploadData.title.trim() || !uploadData.issuingFacility.trim()) {
      showToast('Title and Issuing Facility are required', 'error');
      return;
    }

    setUploadSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reportFile', uploadData.file);
      formData.append('title', uploadData.title.trim());
      formData.append('reportType', uploadData.reportType);
      formData.append('issuingFacility', uploadData.issuingFacility.trim());
      formData.append('doctorName', uploadData.doctorName.trim());
      formData.append('reportDate', uploadData.reportDate);
      formData.append('notes', uploadData.notes.trim());
      formData.append('isEmergencyImportant', uploadData.isEmergencyImportant);
      formData.append('visibility', uploadData.isEmergencyImportant ? 'emergency_share' : uploadData.visibility);

      await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('Report uploaded & synced to Health Timeline successfully!');
      setShowUploadModal(false);
      setUploadData({
        title: '',
        reportType: 'blood_test',
        issuingFacility: '',
        doctorName: '',
        reportDate: new Date().toISOString().split('T')[0],
        notes: '',
        isEmergencyImportant: false,
        visibility: 'consent_only',
        file: null,
        fileName: '',
        filePreview: ''
      });
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload report', 'error');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this medical report? It will also be removed from your Health Timeline.')) return;
    try {
      await api.delete(`/reports/${reportId}`);
      showToast('Report deleted.');
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete report', 'error');
    }
  };

  const handleToggleEmergencyShare = async (report) => {
    try {
      const newEmergencyState = !report.isEmergencyImportant;
      const newVis = newEmergencyState ? 'emergency_share' : 'consent_only';
      await api.put(`/reports/${report._id}/visibility`, {
        isEmergencyImportant: newEmergencyState,
        visibility: newVis
      });
      showToast(`Report updated: ${newEmergencyState ? 'Marked for emergency sharing' : 'Consent-only'}`);
      fetchReports();
    } catch (err) {
      showToast('Failed to update report settings', 'error');
    }
  };

  const handleChangeVisibility = async (report, newVis) => {
    try {
      await api.put(`/reports/${report._id}/visibility`, {
        visibility: newVis,
        isEmergencyImportant: newVis === 'emergency_share'
      });
      showToast(`Report visibility set to ${newVis.replace('_', ' ')}`);
      fetchReports();
    } catch (err) {
      showToast('Failed to update visibility', 'error');
    }
  };

  // Tag add / remove helpers
  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    if (!profile.patientHealth.allergies.includes(newAllergy.trim())) {
      setProfile(prev => ({
        ...prev,
        patientHealth: { ...prev.patientHealth, allergies: [...prev.patientHealth.allergies, newAllergy.trim()] }
      }));
    }
    setNewAllergy('');
  };

  const removeAllergy = (idx) => {
    setProfile(prev => ({
      ...prev,
      patientHealth: {
        ...prev.patientHealth,
        allergies: prev.patientHealth.allergies.filter((_, i) => i !== idx)
      }
    }));
  };

  const addCondition = () => {
    if (!newCondition.trim()) return;
    if (!profile.patientHealth.existingConditions.includes(newCondition.trim())) {
      setProfile(prev => ({
        ...prev,
        patientHealth: {
          ...prev.patientHealth,
          existingConditions: [...prev.patientHealth.existingConditions, newCondition.trim()]
        }
      }));
    }
    setNewCondition('');
  };

  const removeCondition = (idx) => {
    setProfile(prev => ({
      ...prev,
      patientHealth: {
        ...prev.patientHealth,
        existingConditions: prev.patientHealth.existingConditions.filter((_, i) => i !== idx)
      }
    }));
  };

  const addMedicine = () => {
    if (!newMedicine.name.trim()) return;
    setProfile(prev => ({
      ...prev,
      patientHealth: {
        ...prev.patientHealth,
        currentMedicines: [...prev.patientHealth.currentMedicines, { ...newMedicine }]
      }
    }));
    setNewMedicine({ name: '', dosage: '', frequency: '' });
  };

  const removeMedicine = (idx) => {
    setProfile(prev => ({
      ...prev,
      patientHealth: {
        ...prev.patientHealth,
        currentMedicines: prev.patientHealth.currentMedicines.filter((_, i) => i !== idx)
      }
    }));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
        <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 relative"></div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
          {/* Avatar and Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-xl border-2 border-teal-500 relative flex-shrink-0">
              <img
                src={
                  profile.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0d9488&color=fff&size=128`
                }
                alt={profile.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">{profile.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {user?.role?.replace('_', ' ')}
                </span>
                {isDoctor && profile.doctorDetails?.isVerified && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified Doctor</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                <span>{profile.email}</span>
                <span>•</span>
                <span>{profile.cityArea}</span>
              </p>
            </div>
          </div>

          {/* Completeness Ring */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center space-x-4 self-start md:self-auto">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-teal-500 transition-all duration-1000"
                  strokeDasharray={`${completeness.score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-black text-xs text-slate-900 dark:text-white">
                {completeness.score}%
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Profile Completeness
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {completeness.score >= 80 ? 'Well Configured' : 'Needs Setup'}
              </span>
            </div>
          </div>
        </div>

        {/* Missing Fields Prompt Chips */}
        {completeness.prompts?.length > 0 && (
          <div className="px-6 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center flex-wrap gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Suggestions:</span>
            {completeness.prompts.slice(0, 3).map((prompt, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-semibold"
              >
                + {prompt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
            activeTab === 'personal'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Personal Info</span>
        </button>

        {isPatient && (
          <>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
                activeTab === 'health'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Health & Donor</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
                activeTab === 'reports'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Medical Reports</span>
            </button>
          </>
        )}

        {isDoctor && (
          <button
            onClick={() => setActiveTab('professional')}
            className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
              activeTab === 'professional'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Credentials</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
            activeTab === 'notifications'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alert Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
            activeTab === 'privacy'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy & Data</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-2xl transition flex items-center space-x-1.5 ${
            activeTab === 'security'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Security</span>
        </button>
      </div>

      {/* Tab 1: Personal Info */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Basic Identification</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Email (Account Identifier)</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Phone Number (SMS queue alerts)</label>
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Gender</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">City / Residential Area (for radius matching)</label>
                <input
                  type="text"
                  value={profile.cityArea}
                  onChange={(e) => setProfile({ ...profile, cityArea: e.target.value })}
                  placeholder="e.g. South Delhi, Connaught Place"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Preferred Language</label>
                <select
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile({ ...profile, preferredLanguage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact Sub-section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Phone className="w-4 h-4 text-rose-500" />
                <span>Primary Emergency Contact</span>
              </h3>
              <p className="text-xs text-slate-500">
                Contacted automatically if triage triggers Emergency Break-Glass access or acute hospital admission.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={profile.emergencyContact.name}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      emergencyContact: { ...profile.emergencyContact, name: e.target.value }
                    })
                  }
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Relationship</label>
                <select
                  value={profile.emergencyContact.relationship}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      emergencyContact: { ...profile.emergencyContact, relationship: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend / Relative</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  value={profile.emergencyContact.phone}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      emergencyContact: { ...profile.emergencyContact, phone: e.target.value }
                    })
                  }
                  placeholder="+91-9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Personal Details'}</span>
          </button>
        </form>
      )}

      {/* Tab 2: Health & Donor Profile (Patients Only) */}
      {isPatient && activeTab === 'health' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Self-Reported Health Snapshot</h3>
                <p className="text-xs text-slate-500">
                  Pre-populates the emergency triage form so consulting clinicians have instant context.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Self-Reported
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  Blood Group & Rh Factor{' '}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${
                      profile.patientHealth.bloodGroupSource === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {profile.patientHealth.bloodGroupSource === 'verified' ? 'Verified ✓' : 'Self-Declared'}
                  </span>
                </label>
                <select
                  value={profile.patientHealth.bloodGroup}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      patientHealth: { ...profile.patientHealth, bloodGroup: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-rose-600"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={profile.patientHealth.heightCm}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      patientHealth: { ...profile.patientHealth, heightCm: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={profile.patientHealth.weightKg}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      patientHealth: { ...profile.patientHealth, weightKg: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Allergies Tag List */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-semibold block text-xs mb-1">Drug & Environmental Allergies</label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                  className="text-xs flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.patientHealth.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 text-xs font-semibold"
                  >
                    <span>{allergy}</span>
                    <button type="button" onClick={() => removeAllergy(idx)} className="text-rose-400 hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-semibold block text-xs mb-1">Chronic Medical Conditions</label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Asthma, CAD"
                  className="text-xs flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={addCondition}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.patientHealth.existingConditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 text-xs font-semibold"
                  >
                    <span>{cond}</span>
                    <button type="button" onClick={() => removeCondition(idx)} className="text-cyan-400 hover:text-cyan-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medicines */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="font-semibold block text-xs">Currently Prescribed Regular Medicines</label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Drug Name"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  placeholder="Dosage (e.g. 10mg)"
                  value={newMedicine.dosage}
                  onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g. Once daily)"
                  value={newMedicine.frequency}
                  onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={addMedicine}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-xl font-bold"
                >
                  Add Medicine
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {profile.patientHealth.currentMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-teal-700 dark:text-teal-300">{med.name}</strong> ({med.dosage}) —{' '}
                      <span className="text-slate-500">{med.frequency}</span>
                    </div>
                    <button type="button" onClick={() => removeMedicine(idx)} className="text-rose-500 hover:text-rose-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Donor Preferences Sub-section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>LifeShare Voluntary Donor Preferences</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.donorSettings.willingToDonate}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      donorSettings: { ...profile.donorSettings, willingToDonate: e.target.checked }
                    })
                  }
                  className="w-4 h-4 rounded text-teal-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  I am willing to donate blood in emergency blood shortages matching my blood group.
                </span>
              </label>

              <div>
                <label className="font-semibold block mb-1">Last Blood Donation Date</label>
                <input
                  type="date"
                  value={profile.donorSettings.lastDonationDate}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      donorSettings: { ...profile.donorSettings, lastDonationDate: e.target.value }
                    })
                  }
                  className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Health Profile'}</span>
          </button>
        </form>
      )}

      {/* Tab 3: Doctor Credentials (Doctors Only) */}
      {isDoctor && activeTab === 'professional' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Medical Credentials & Council Record</h3>
              <p className="text-xs text-slate-500">
                Verified by Hospital Admin under state Medical Council regulations.
              </p>
            </div>
            {profile.doctorDetails?.isVerified ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Council Reg ✓</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Pending Verification
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Medical Council Registration #</label>
              <input
                type="text"
                disabled
                value={profile.doctorDetails?.medicalCouncilRegNumber || 'MCI-DL-2015-84920'}
                className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-600 dark:text-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Clinical Specialization</label>
              <input
                type="text"
                disabled
                value={profile.doctorDetails?.specialty || 'Cardiology'}
                className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Experience (Years)</label>
              <input
                type="text"
                disabled
                value={`${profile.doctorDetails?.experienceYears || 12} Years`}
                className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Consultation Fee (₹)</label>
              <input
                type="text"
                disabled
                value={`₹${profile.doctorDetails?.consultationFee || 800}`}
                className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          {/* Qualifications List */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="font-semibold block text-xs">Degrees & Institutional Accreditations</label>
            <div className="space-y-2">
              {(
                profile.doctorDetails?.qualifications || [
                  { degree: 'MBBS', institution: 'All India Institute of Medical Sciences (AIIMS)', year: 2012 },
                  { degree: 'MD (General Medicine)', institution: 'Maulana Azad Medical College', year: 2015 },
                  { degree: 'DM (Cardiology)', institution: 'AIIMS New Delhi', year: 2018 }
                ]
              ).map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-teal-700 dark:text-teal-300 text-sm block">{q.degree}</strong>
                    <span className="text-slate-500">
                      {q.institution} • Class of {q.year}
                    </span>
                  </div>
                  <Award className="w-5 h-5 text-teal-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Alert Preferences (Channel x Type Matrix) */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Notification & Alert Channels</h3>
              <p className="text-xs text-slate-500">
                Control how and where SmartCare alerts reach you across In-App, Email, and SMS.
              </p>
            </div>

            {/* Channels Row */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border text-xs">
              <label className="flex items-center space-x-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.inApp}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: { ...profile.notificationPreferences.channels, inApp: e.target.checked }
                      }
                    })
                  }
                  className="rounded text-teal-600"
                />
                <span>In-App Dashboard</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.email}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: { ...profile.notificationPreferences.channels, email: e.target.checked }
                      }
                    })
                  }
                  className="rounded text-teal-600"
                />
                <span>Email Notifications</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.sms}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: { ...profile.notificationPreferences.channels, sms: e.target.checked }
                      }
                    })
                  }
                  className="rounded text-teal-600"
                />
                <span>SMS Alert Service</span>
              </label>
            </div>

            {/* Alert Categories */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Alert Categories</h4>

              <div className="space-y-2 text-xs">
                <label className="flex items-start justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Appointments & Token Confirmations</strong>
                    <span className="text-[11px] text-slate-400">Digital token generation, slot reschedule, and check-in confirmation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences.types.appointments}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences,
                          types: { ...profile.notificationPreferences.types, appointments: e.target.checked }
                        }
                      })
                    }
                    className="rounded text-teal-600 mt-1"
                  />
                </label>

                <label className="flex items-start justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Live Queue & "Leave Now" Alerts</strong>
                    <span className="text-[11px] text-slate-400">Turn countdown notifications, doctor calling token, and travel departures</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences.types.queue}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences,
                          types: { ...profile.notificationPreferences.types, queue: e.target.checked }
                        }
                      })
                    }
                    className="rounded text-teal-600 mt-1"
                  />
                </label>

                <label className="flex items-start justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Blood Shortage Emergency Alerts</strong>
                    <span className="text-[11px] text-slate-400">Urgent hospital shortages matching your exact or compatible blood group</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences.types.bloodAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences,
                          types: { ...profile.notificationPreferences.types, bloodAlerts: e.target.checked }
                        }
                      })
                    }
                    className="rounded text-teal-600 mt-1"
                  />
                </label>

                <label className="flex items-start justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Clinical Emergency & Break-Glass Alerts</strong>
                    <span className="text-[11px] text-slate-400">Notifies you immediately whenever emergency triage or break-glass access occurs</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences.types.emergency}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences,
                          types: { ...profile.notificationPreferences.types, emergency: e.target.checked }
                        }
                      })
                    }
                    className="rounded text-teal-600 mt-1"
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Alert Preferences'}</span>
          </button>
        </form>
      )}

      {/* Tab 5: Privacy & Data Export */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Healthcare Privacy Controls</h3>
              <p className="text-xs text-slate-500">
                You retain complete sovereign ownership of your health records under digital privacy compliance.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <strong className="block text-slate-800 dark:text-slate-100">Share with Consulting Specialists</strong>
                  <span className="text-[11px] text-slate-400">Allow consulting doctors to view Health Timeline after consent grant</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacySettings.shareWithConsultingDoctors}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      privacySettings: { ...profile.privacySettings, shareWithConsultingDoctors: e.target.checked }
                    })
                  }
                  className="rounded text-teal-600 mt-1"
                />
              </label>

              <label className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <strong className="block text-slate-800 dark:text-slate-100">Show in LifeShare Donor Network</strong>
                  <span className="text-[11px] text-slate-400">Allows blood officers to match your group during critical hospital blood emergencies</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacySettings.showInDonorDirectory}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      privacySettings: { ...profile.privacySettings, showInDonorDirectory: e.target.checked }
                    })
                  }
                  className="rounded text-teal-600 mt-1"
                />
              </label>

              <label className="flex items-start justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <strong className="block text-slate-800 dark:text-slate-100">Emergency Break-Glass Authorization</strong>
                  <span className="text-[11px] text-slate-400">Allows life-saving 24h read-only access to allergies and history during unconscious/acute ER triage</span>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacySettings.allowEmergencyBreakGlass}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      privacySettings: { ...profile.privacySettings, allowEmergencyBreakGlass: e.target.checked }
                    })
                  }
                  className="rounded text-teal-600 mt-1"
                />
              </label>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Update Privacy Preferences
            </button>
          </div>

          {/* Export Data Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Download My Complete Health Profile</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Export all your records, prescriptions, donor stats, and emergency details in standardized JSON.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Medical Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Medical Reports */}
      {isPatient && activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Upload Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <FileText className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Emergency-Ready Medical Reports</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Upload diagnostic reports, ECGs, scans, and discharge summaries to your profile. Tag critical files so emergency doctors can access them instantly during trauma or resuscitation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center space-x-2 flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Report</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by title, lab, doctor, or condition..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={reportFilterEmergencyOnly}
                  onChange={(e) => setReportFilterEmergencyOnly(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Emergency-Tagged Only</span>
                </span>
              </label>
            </div>

            {/* Category Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'blood_test', label: 'Blood Tests' },
                { id: 'ecg', label: 'ECG / Cardiac' },
                { id: 'discharge_summary', label: 'Discharge Summaries' },
                { id: 'x_ray', label: 'X-Rays' },
                { id: 'mri_ct', label: 'MRI / CT Scans' },
                { id: 'prescription', label: 'Prescriptions' },
                { id: 'vaccination', label: 'Vaccines' },
                { id: 'other', label: 'Other' }
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setReportFilterType(chip.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                    reportFilterType === chip.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Grid */}
          {reportsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
              <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Medical Reports Uploaded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add your recent blood work, ECG graphs, or discharge summaries so consulting and emergency physicians have your complete health context.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition"
              >
                Upload First Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports
                .filter(r => {
                  if (reportFilterType !== 'all' && r.reportType !== reportFilterType) return false;
                  if (reportFilterEmergencyOnly && !r.isEmergencyImportant) return false;
                  if (reportSearch) {
                    const q = reportSearch.toLowerCase();
                    return (
                      r.title?.toLowerCase().includes(q) ||
                      r.issuingFacility?.toLowerCase().includes(q) ||
                      r.doctorName?.toLowerCase().includes(q) ||
                      r.notes?.toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map(report => (
                  <div
                    key={report._id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                          {report.reportType.replace('_', ' ')}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {report.isEmergencyImportant && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-bold flex items-center space-x-1 animate-pulse">
                              <span>🚨</span>
                              <span>Emergency Priority</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                              report.visibility === 'emergency_share'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : report.visibility === 'consent_only'
                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {report.visibility === 'emergency_share'
                              ? 'Emergency Shared'
                              : report.visibility === 'consent_only'
                              ? 'Consent Only'
                              : 'Private'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Facility */}
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{report.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                        <span>{report.issuingFacility}</span>
                        {report.doctorName && <span>• Dr. {report.doctorName}</span>}
                        <span>• {new Date(report.reportDate).toLocaleDateString()}</span>
                      </p>

                      {report.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl mt-2.5 italic">
                          "{report.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewReport(report);
                          setPreviewZoom(1);
                        }}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold rounded-xl transition flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        {/* Quick Toggle Emergency Flag */}
                        <button
                          type="button"
                          onClick={() => handleToggleEmergencyShare(report)}
                          title="Toggle Emergency Break-Glass Sharing"
                          className={`p-1.5 rounded-xl border transition ${
                            report.isEmergencyImportant
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:border-rose-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        {/* Visibility Selector */}
                        <select
                          value={report.visibility}
                          onChange={(e) => handleChangeVisibility(report, e.target.value)}
                          className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold"
                        >
                          <option value="emergency_share">Emergency Share</option>
                          <option value="consent_only">Consent Only</option>
                          <option value="private">Private</option>
                        </select>

                        {/* Delete Report */}
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(report._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Compliance & Regulatory Notice */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-start space-x-3">
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-700 dark:text-slate-300 font-bold mb-0.5">
                Clinical Data Protection & Audit Policy
              </strong>
              Medical records stored in SmartCare and summarized by clinical AI are handled strictly for clinical workflow support. Reports marked as private remain concealed even under emergency break-glass protocols. Every emergency view triggers a signed entry in your Access Log.
            </div>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-600 rounded-xl">
                  <Upload className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base">Upload Medical Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportUploadSubmit} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-teal-500/40 hover:border-teal-500 dark:border-teal-500/30 rounded-2xl p-5 text-center bg-teal-50/30 dark:bg-teal-950/20 transition">
                <input
                  type="file"
                  id="report-file-input"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadData.fileName ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">{uploadData.fileName}</p>
                    <label
                      htmlFor="report-file-input"
                      className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      Choose Different File
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-teal-600 mx-auto" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Drag & drop PDF, JPG, or PNG here
                    </p>
                    <p className="text-[11px] text-slate-400">Max size 10MB per file</p>
                    <div className="flex items-center justify-center space-x-2 pt-1">
                      <label
                        htmlFor="report-file-input"
                        className="px-3 py-1.5 bg-teal-600 text-white rounded-xl font-bold cursor-pointer hover:bg-teal-700 transition"
                      >
                        Browse Files
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Report Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12-Lead ECG Report"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Report Type *</label>
                  <select
                    value={uploadData.reportType}
                    onChange={(e) => {
                      const t = e.target.value;
                      const isEmergency = ['ecg', 'discharge_summary', 'blood_test'].includes(t);
                      setUploadData({
                        ...uploadData,
                        reportType: t,
                        isEmergencyImportant: isEmergency || uploadData.isEmergencyImportant,
                        visibility: isEmergency ? 'emergency_share' : uploadData.visibility
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="blood_test">Blood Test / CBC</option>
                    <option value="ecg">ECG / Cardiology</option>
                    <option value="discharge_summary">Discharge Summary</option>
                    <option value="x_ray">X-Ray Scan</option>
                    <option value="mri_ct">MRI / CT Scan</option>
                    <option value="prescription">Prescription</option>
                    <option value="vaccination">Vaccination Record</option>
                    <option value="other">Other Diagnostic Document</option>
                  </select>
                </div>
              </div>

              {/* Lab / Facility & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Issuing Hospital / Lab *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Diagnostics"
                    value={uploadData.issuingFacility}
                    onChange={(e) => setUploadData({ ...uploadData, issuingFacility: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Doctor Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={uploadData.doctorName}
                    onChange={(e) => setUploadData({ ...uploadData, doctorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="font-semibold block mb-1">Report Date</label>
                <input
                  type="date"
                  value={uploadData.reportDate}
                  onChange={(e) => setUploadData({ ...uploadData, reportDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold block mb-1">Key Notes / Parameters (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. HbA1c 7.1, normal sinus rhythm, severe allergy noted"
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Emergency Priority Toggle */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-rose-900 dark:text-rose-200">
                  <input
                    type="checkbox"
                    checked={uploadData.isEmergencyImportant}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        isEmergencyImportant: e.target.checked,
                        visibility: e.target.checked ? 'emergency_share' : uploadData.visibility
                      })
                    }
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Tag as "Important for Emergencies"</span>
                </label>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-6">
                  Recommended for cardiac reports, chronic condition summaries, and allergy tests so ER doctors can inspect them immediately.
                </p>
              </div>

              {/* Visibility Controls */}
              <div className="space-y-1.5">
                <label className="font-semibold block">Visibility & Access Control</label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report-vis"
                      value="emergency_share"
                      checked={uploadData.visibility === 'emergency_share'}
                      onChange={(e) => setUploadData({ ...uploadData, visibility: e.target.value })}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <strong className="block text-slate-800 dark:text-slate-200">Share in emergencies (Recommended)</strong>
                      <span className="text-[11px] text-slate-500">Accessible by verified doctors in emergency break-glass triage.</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report-vis"
                      value="consent_only"
                      checked={uploadData.visibility === 'consent_only'}
                      onChange={(e) => setUploadData({ ...uploadData, visibility: e.target.value })}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <strong className="block text-slate-800 dark:text-slate-200">Share with consent only</strong>
                      <span className="text-[11px] text-slate-500">Requires explicit consent token approval for clinical visits.</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="report-vis"
                      value="private"
                      checked={uploadData.visibility === 'private'}
                      onChange={(e) =>
                        setUploadData({
                          ...uploadData,
                          visibility: e.target.value,
                          isEmergencyImportant: false
                        })
                      }
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <strong className="block text-slate-800 dark:text-slate-200">Private</strong>
                      <span className="text-[11px] text-slate-500">Concealed from doctors even during emergency break-glass access.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {uploadSubmitting ? 'Uploading...' : 'Save & Sync to Timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{previewReport.title}</span>
                  {previewReport.isEmergencyImportant && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      Emergency Tagged
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewReport.issuingFacility} • {new Date(previewReport.reportDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <a
                  href={previewReport.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950/60 min-h-[350px]">
              {previewReport.fileMimeType?.includes('pdf') ? (
                <iframe
                  src={previewReport.fileUrl}
                  title={previewReport.title}
                  className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow"
                />
              ) : (
                <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
                  <img
                    src={previewReport.fileUrl}
                    alt={previewReport.title}
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center' }}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg transition-transform duration-200"
                  />
                </div>
              )}
            </div>

            {/* Footer notes */}
            {previewReport.notes && (
              <div className="p-3.5 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Report Notes: </span>
                <span className="text-slate-500">{previewReport.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Security */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Password & Account Security</h3>
            <p className="text-xs text-slate-500">Ensure your account uses a strong, unique password.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
            <div>
              <label className="font-semibold block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition"
            >
              {changingPass ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
