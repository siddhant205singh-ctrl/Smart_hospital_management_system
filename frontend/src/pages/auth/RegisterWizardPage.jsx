import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import PasswordStrengthMeter from '../../components/auth/PasswordStrengthMeter';
import { 
  User, 
  Stethoscope, 
  Building2, 
  Droplet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Lock, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function RegisterWizardPage() {
  const { role: routeRole } = useParams();
  const navigate = useNavigate();

  // Normalize role
  const role = routeRole || 'patient';

  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailWarning, setEmailWarning] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: 'male',
    dateOfBirth: '',
    // Doctor specific
    medicalCouncilRegNumber: '',
    councilState: 'Delhi Medical Council',
    specialization: 'Cardiology',
    experienceYears: '5',
    hospitalId: '',
    // Hospital Admin specific
    designation: 'Medical Superintendent / Administrator',
    hospitalName: '',
    street: '',
    city: 'New Delhi',
    state: 'Delhi',
    zip: '110001',
    licenseNumber: '',
    bedsCount: '150',
    hasEmergencyDept: true,
    // Blood Bank Officer specific
    bloodBankLicenseNumber: '',
    qualification: 'Diploma / Degree in Medical Laboratory Technology',
    // Consent
    consentTerms: false,
    consentDataProcessing: false
  });

  // Upload Files state
  const [files, setFiles] = useState({
    gov_photo_id: null,
    medical_degree: null,
    council_registration_cert: null,
    hospital_license: null,
    authorization_letter: null,
    qualification_proof: null
  });

  // Fetch Hospitals for Doctor & Blood Officer affiliation
  useEffect(() => {
    if (role === 'doctor' || role === 'blood-bank-officer') {
      const fetchHospitals = async () => {
        setLoadingHospitals(true);
        try {
          const res = await api.get('/hospitals');
          const list = res.data.hospitals || res.data || [];
          setHospitals(list);
          if (list.length > 0) {
            setFormData(prev => ({ ...prev, hospitalId: list[0]._id }));
          }
        } catch (err) {
          console.error('[Fetch Hospitals Error]', err);
        } finally {
          setLoadingHospitals(false);
        }
      };
      fetchHospitals();
    }
  }, [role]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Soft warning check for hospital admin using free email provider
    if (role === 'hospital-admin' && name === 'email') {
      const domain = value.split('@')[1] || '';
      if (['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain.toLowerCase())) {
        setEmailWarning('Tip: Hospital institutional domains (e.g. admin@cityhospital.org) are verified faster than personal webmail.');
      } else {
        setEmailWarning('');
      }
    }
  };

  // Handle File Input Changes
  const handleFileChange = (field, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds 10MB limit.`);
        return;
      }
      setFiles(prev => ({ ...prev, [field]: file }));
      setErrorMessage('');
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'doctor': return { title: 'Doctor Credentialing Registration', icon: Stethoscope, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' };
      case 'hospital-admin': return { title: 'Hospital Admin Registration', icon: Building2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' };
      case 'blood-bank-officer': return { title: 'Blood Bank Officer Registration', icon: Droplet, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950' };
      default: return { title: 'Patient Registration', icon: User, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950' };
    }
  };

  const meta = getRoleTitle();
  const Icon = meta.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (!formData.consentTerms || !formData.consentDataProcessing) {
      setErrorMessage('Please accept the Terms of Service, Privacy Policy, and Health Data Processing consent.');
      return;
    }

    setSubmitting(true);
    try {
      if (role === 'patient') {
        // Patient JSON POST
        const res = await api.post('/auth/register/patient', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          consent: true
        });

        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&role=patient${res.data.devOtpCode ? `&devOtp=${res.data.devOtpCode}` : ''}`);
      } else {
        // Professional Roles: Multipart Form Data
        const form = new FormData();
        Object.keys(formData).forEach(key => {
          form.append(key, formData[key]);
        });

        // Append files
        if (role === 'doctor') {
          if (!files.gov_photo_id || !files.medical_degree || !files.council_registration_cert) {
            setErrorMessage('Please upload all 3 required verification documents.');
            setSubmitting(false);
            return;
          }
          form.append('gov_photo_id', files.gov_photo_id);
          form.append('medical_degree', files.medical_degree);
          form.append('council_registration_cert', files.council_registration_cert);

          const res = await api.post('/auth/register/doctor', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&role=doctor${res.data.devOtpCode ? `&devOtp=${res.data.devOtpCode}` : ''}`);
        } else if (role === 'hospital-admin') {
          if (!files.hospital_license || !files.authorization_letter) {
            setErrorMessage('Please upload both required documents: Hospital License and Authorization Letter.');
            setSubmitting(false);
            return;
          }
          form.append('hospital_license', files.hospital_license);
          form.append('authorization_letter', files.authorization_letter);

          const res = await api.post('/auth/register/hospital-admin', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&role=hospital_admin${res.data.devOtpCode ? `&devOtp=${res.data.devOtpCode}` : ''}`);
        } else if (role === 'blood-bank-officer') {
          if (!files.gov_photo_id || !files.authorization_letter) {
            setErrorMessage('Please upload Government Photo ID and Authorization Letter.');
            setSubmitting(false);
            return;
          }
          form.append('gov_photo_id', files.gov_photo_id);
          form.append('authorization_letter', files.authorization_letter);
          if (files.qualification_proof) {
            form.append('qualification_proof', files.qualification_proof);
          }

          const res = await api.post('/auth/register/blood-bank-officer', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&role=blood_bank_officer${res.data.devOtpCode ? `&devOtp=${res.data.devOtpCode}` : ''}`);
        }
      }
    } catch (err) {
      console.error('[Registration Submission Error]', err);
      setErrorMessage(err.response?.data?.error || 'Registration failed. Please check the inputs and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/register"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Role Selection</span>
        </Link>
        <span className="text-xs text-slate-400">Step 1 of 2: Application Details</span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Title Header */}
        <div className="flex items-center space-x-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {meta.title}
            </h1>
            <p className="text-xs text-slate-500">
              {role === 'patient' 
                ? 'Create your patient profile for instant OPD tokens & verified medical records'
                : 'Submit verified credentials. Applications undergo administrative document checks.'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section: Basic Identity */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Information</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {role === 'hospital-admin' ? 'Official Work Email *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@hospital.org"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {emailWarning && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{emailWarning}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mobile Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91-9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {role === 'patient' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section: Doctor Specific Professional Fields */}
          {role === 'doctor' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Medical Council & Hospital Affiliation</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Medical Council Reg. Number *</label>
                  <input
                    type="text"
                    name="medicalCouncilRegNumber"
                    required
                    placeholder="e.g. MCI-2024-8849"
                    value={formData.medicalCouncilRegNumber}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400">Must match your State Medical Council registration certificate</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Medical Council / State</label>
                  <input
                    type="text"
                    name="councilState"
                    value={formData.councilState}
                    onChange={handleInputChange}
                    placeholder="e.g. Delhi Medical Council"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Specialization *</label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Emergency Care">Emergency Care</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="1"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Affiliated Hospital *</label>
                  <select
                    name="hospitalId"
                    value={formData.hospitalId}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {hospitals.map(h => (
                      <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section: Hospital Admin Fields */}
          {role === 'hospital-admin' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hospital Facility Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Hospital / Medical Center Name *</label>
                  <input
                    type="text"
                    name="hospitalName"
                    required
                    placeholder="e.g. Metro Care Multi-Speciality Hospital"
                    value={formData.hospitalName}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Hospital Registration / License No. *</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    required
                    placeholder="e.g. HOSP-REG-2026-DL-091"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Street Address</label>
                  <input
                    type="text"
                    name="street"
                    placeholder="Plot 12, Institutional Area"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">City & State</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="New Delhi, Delhi"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Beds Capacity</label>
                  <input
                    type="number"
                    min="10"
                    name="bedsCount"
                    value={formData.bedsCount}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="hasEmergencyDept"
                  name="hasEmergencyDept"
                  checked={formData.hasEmergencyDept}
                  onChange={handleInputChange}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="hasEmergencyDept" className="font-medium text-slate-700 dark:text-slate-300">
                  This hospital operates a 24x7 Emergency / Trauma Department
                </label>
              </div>
            </div>
          )}

          {/* Section: Blood Bank Officer Fields */}
          {role === 'blood-bank-officer' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Blood Bank License & Affiliation</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Blood Bank License Number *</label>
                  <input
                    type="text"
                    name="bloodBankLicenseNumber"
                    required
                    placeholder="e.g. BLD-LIC-DL-7734"
                    value={formData.bloodBankLicenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="e.g. Chief Blood Bank Technical Officer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Affiliated Hospital Blood Bank *</label>
                <select
                  name="hospitalId"
                  value={formData.hospitalId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {hospitals.map(h => (
                    <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Section: Document Uploads for Professional Roles */}
          {role !== 'patient' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Verification Documents (PDF, JPG, PNG &lt; 10MB)</h2>
                <span className="text-[10px] text-teal-600 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Encrypted Storage</span>
                </span>
              </div>

              {role === 'doctor' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Govt. Photo ID *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('gov_photo_id', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.gov_photo_id && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.gov_photo_id.name}</span>}
                  </div>

                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Medical Degree (MBBS/MD) *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('medical_degree', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.medical_degree && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.medical_degree.name}</span>}
                  </div>

                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Council Registration Cert *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('council_registration_cert', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.council_registration_cert && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.council_registration_cert.name}</span>}
                  </div>
                </div>
              )}

              {role === 'hospital-admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <Building2 className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hospital License Document *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('hospital_license', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.hospital_license && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.hospital_license.name}</span>}
                  </div>

                  <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Authorization Letter *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('authorization_letter', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.authorization_letter && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.authorization_letter.name}</span>}
                  </div>
                </div>
              )}

              {role === 'blood-bank-officer' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Govt. Photo ID *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('gov_photo_id', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.gov_photo_id && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.gov_photo_id.name}</span>}
                  </div>

                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Appointment Letter *</span>
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('authorization_letter', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.authorization_letter && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.authorization_letter.name}</span>}
                  </div>

                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <FileText className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
                    <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Qualification Proof</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => handleFileChange('qualification_proof', e)}
                      className="text-[11px] text-slate-500 w-full"
                    />
                    {files.qualification_proof && <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {files.qualification_proof.name}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Password Policy & Confirmation */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Security</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <PasswordStrengthMeter password={formData.password} />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span className="text-[11px] text-rose-500 font-medium block mt-1">Passwords do not match</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Consent Checkboxes */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="consentTerms"
                name="consentTerms"
                required
                checked={formData.consentTerms}
                onChange={handleInputChange}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
              />
              <label htmlFor="consentTerms">
                I agree to the HealthMS <a href="/terms" className="text-teal-600 underline">Terms of Service</a> and <a href="/privacy" className="text-teal-600 underline">Privacy Policy</a>.
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="consentDataProcessing"
                name="consentDataProcessing"
                required
                checked={formData.consentDataProcessing}
                onChange={handleInputChange}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5"
              />
              <label htmlFor="consentDataProcessing">
                I consent to the secure processing and verification of my professional identity and healthcare credentials under Indian Digital Personal Data Protection Act (DPDP).
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Submitting Application & Generating OTP...' : 'Continue to Email Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-teal-600 hover:underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
