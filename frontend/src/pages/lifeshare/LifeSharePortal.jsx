import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import EligibilityCountdown from '../../components/lifeshare/EligibilityCountdown';
import {
  Droplet,
  Heart,
  ShieldCheck,
  Award,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Upload,
  ArrowRight,
  Download,
  Printer,
  X,
  Shield,
  Star,
  Crown,
  Medal,
  Check
} from 'lucide-react';

export default function LifeSharePortal() {
  const { user } = useAuth();
  const [donorData, setDonorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState(null);

  // Donor Registration Form
  const [regForm, setRegForm] = useState({
    bloodGroup: 'O+',
    gender: 'male',
    dateOfBirth: '1990-05-14',
    weightKg: 70,
    preferredCity: 'New Delhi',
    voluntaryDeclarationAccepted: false
  });

  // Family Link Form
  const [familyForm, setFamilyForm] = useState({
    familyMemberName: '',
    relationship: 'spouse',
    bloodGroup: 'B+',
    dateOfBirth: '1992-08-20',
    verificationDocumentUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=500&q=80'
  });

  const fetchDonor = () => {
    if (!user) return;
    setLoading(true);
    api.get('/donors/me')
      .then(res => setDonorData(res.data))
      .catch(err => {
        console.log('Not registered as donor yet:', err.message);
        setDonorData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDonor();
  }, [user]);

  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    if (!regForm.voluntaryDeclarationAccepted) {
      alert('You must accept the voluntary, unpaid blood donation declaration under NBTC guidelines.');
      return;
    }
    try {
      await api.post('/donors/register', regForm);
      setShowRegisterModal(false);
      fetchDonor();
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLinkFamily = async (e) => {
    e.preventDefault();
    try {
      await api.post('/family-links', familyForm);
      setShowFamilyModal(false);
      fetchDonor();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to link family member');
    }
  };

  const handleOpenCertificate = async () => {
    try {
      const res = await api.get('/donors/certificate');
      setCertificateData(res.data.certificate);
      setShowCertificateModal(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate certificate');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading LifeShare Registry...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-teal-600 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <Droplet className="w-5 h-5 fill-white text-white" />
            </span>
            <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              Voluntary Unpaid Blood Donor Program
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">
            LifeShare: Donate Blood, Save Lives
          </h1>
          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed">
            A 100% voluntary blood donation system under NBTC guidelines. Donors earn non-monetary recognition badges, downloadable certificates, and qualify their loved ones for Donor Family Fast-Track during clinical emergencies.
          </p>
        </div>
      </div>

      {donorData?.donor ? (
        <div className="space-y-8">
          {/* Eligibility & Countdown Widget */}
          <EligibilityCountdown
            donor={donorData.donor}
            daysUntilEligible={donorData.daysUntilEligible}
            isCurrentlyEligible={donorData.isCurrentlyEligible}
          />

          {/* Non-Monetary Recognition & Badges Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Voluntary Donor Recognition & Commendations</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Milestone badges and official certificates acknowledging your voluntary, unpaid gift of life.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCertificate}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>View Thank-You Certificate</span>
              </button>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  Verified Donations
                </span>
                <span className="text-3xl font-black text-rose-950 dark:text-white mt-1 block">
                  {donorData.donor.totalDonations} Units
                </span>
                <span className="text-[11px] text-rose-700 dark:text-rose-300">Logged by Blood Bank Officers</span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                  Estimated Lives Impacted
                </span>
                <span className="text-3xl font-black text-teal-950 dark:text-white mt-1 block">
                  ~{donorData.donor.livesImpacted || donorData.donor.totalDonations * 3} Lives
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-300">Components fractionated</span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Program Standing
                </span>
                <span className="text-2xl font-black text-indigo-950 dark:text-white mt-1 block">
                  {donorData.donor.totalDonations >= 10 ? 'Champion Donor' : donorData.donor.totalDonations >= 3 ? 'Dedicated Donor' : 'Active Donor'}
                </span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300">100% Voluntary & Unpaid</span>
              </div>
            </div>

            {/* Milestone Badges Grid */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Earned Milestone Badges:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { name: 'First Blood Gift', icon: 'Award', min: 1, desc: '1st donation' },
                  { name: 'Dedicated Life Saver', icon: 'Heart', min: 3, desc: '3 donations' },
                  { name: 'Bronze Shield Donor', icon: 'Shield', min: 5, desc: '5 donations' },
                  { name: 'Silver Pillar Donor', icon: 'Medal', min: 7, desc: '7 donations' },
                  { name: 'Gold Star Donor', icon: 'Star', min: 10, desc: '10 donations' },
                  { name: 'Champion of Humanity', icon: 'Crown', min: 15, desc: '15+ donations' }
                ].map((badge, idx) => {
                  const isEarned = donorData.donor.totalDonations >= badge.min;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition ${
                        isEarned
                          ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-sm'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center ${
                        isEarned ? 'bg-amber-500 text-white shadow' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {badge.icon === 'Crown' ? <Crown className="w-5 h-5" /> :
                         badge.icon === 'Star' ? <Star className="w-5 h-5" /> :
                         badge.icon === 'Medal' ? <Medal className="w-5 h-5" /> :
                         badge.icon === 'Shield' ? <Shield className="w-5 h-5" /> :
                         badge.icon === 'Heart' ? <Heart className="w-5 h-5" /> :
                         <Award className="w-5 h-5" />}
                      </div>
                      <strong className="block text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                        {badge.name}
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        {isEarned ? '✓ Earned' : `Requires ${badge.min} units`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Donor Family Fast-Track Status Card */}
          <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-teal-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Donor Family Fast-Track: ACTIVE</span>
                  </span>
                </div>
                <h3 className="text-xl font-bold">Priority Clinical Support For You & Linked Family</h3>
                <p className="text-xs text-teal-200 max-w-2xl leading-relaxed">
                  As an active voluntary blood donor, when you or a pre-verified linked family member requires blood at any network hospital, fast-track benefits are activated immediately.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <strong className="block font-bold text-teal-300">1. Processing Fee Waived</strong>
                <span className="text-[11px] text-slate-300">Component testing & cross-match fee is waived (₹0).</span>
              </div>

              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <strong className="block font-bold text-teal-300">2. No Replacement Pressure</strong>
                <span className="text-[11px] text-slate-300">Family is exempt from providing replacement blood donors.</span>
              </div>

              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <strong className="block font-bold text-teal-300">3. Pre-Verified Paperwork</strong>
                <span className="text-[11px] text-slate-300">Pre-verified donor link bypasses manual queue bureaucracy.</span>
              </div>

              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <strong className="block font-bold text-teal-300">4. Real-Time ER Notification</strong>
                <span className="text-[11px] text-slate-300">Blood Bank Officer receives an urgent fast-track queue alert.</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-start space-x-2">
              <Shield className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Strict Clinical Allocation Governance:</strong> Fast-Track streamlines paperwork and waives administrative fees. Blood unit allocation is always determined strictly by medical urgency and clinical need first.
              </span>
            </div>
          </div>

          {/* Linked Family Members for Fast-Track */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-rose-500" />
                  <span>Linked Family Members (Fast-Track Eligible)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pre-verified family members receive immediate Donor Family Fast-Track blood processing in clinical emergencies.
                </p>
              </div>

              <button
                onClick={() => setShowFamilyModal(true)}
                className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Link Family Member</span>
              </button>
            </div>

            {donorData.familyLinks && donorData.familyLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {donorData.familyLinks.map((f) => (
                  <div
                    key={f._id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{f.familyMemberName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {f.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">
                      Relationship: <strong>{f.relationship}</strong> (Blood: {f.bloodGroup || 'Not specified'})
                    </p>
                    <span className="text-[10px] text-teal-600 font-semibold block">
                      Fast-Track Eligible ✓
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No family members linked yet. You can link up to 4 immediate family members.</p>
            )}
          </div>
        </div>
      ) : (
        /* Unregistered Donor View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-md text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <Droplet className="w-9 h-9 fill-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Join the LifeShare Registry</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sign up as a voluntary, unpaid blood donor. Monitor your eligibility countdown, earn milestone recognition badges, download your official thank-you certificate, and qualify your loved ones for Donor Family Fast-Track blood access during crises.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Register in 1-Minute
          </button>
        </div>
      )}

      {/* Official Thank-You Certificate Modal */}
      {showCertificateModal && certificateData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
          <div className="relative bg-white text-slate-900 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl border-4 border-amber-500/50 space-y-6">
            <button
              type="button"
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Header */}
            <div className="text-center space-y-2 border-b pb-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow">
                <Crown className="w-8 h-8" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">
                Official Commendation of Voluntary Service
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                Certificate of Appreciation
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {certificateData.certificateNumber}
              </p>
            </div>

            {/* Certificate Body */}
            <div className="text-center space-y-4 py-2">
              <p className="text-xs text-slate-600">This certificate of distinction is proudly presented to</p>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-teal-800 underline decoration-amber-400 decoration-2">
                {certificateData.donorName}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                In sincere gratitude for demonstrating exceptional civic duty and humanitarian compassion through{' '}
                <strong>{certificateData.totalDonations} verified voluntary blood donations</strong> (Blood Group: <strong>{certificateData.bloodGroup}</strong>), saving up to <strong>{certificateData.livesImpacted} precious lives</strong>.
              </p>
            </div>

            {/* Certificate Footer */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
              <div>
                <span className="font-semibold block text-slate-800">Date of Recognition:</span>
                <span>{certificateData.issuedDate}</span>
              </div>

              <div className="text-center sm:text-right">
                <span className="font-semibold block text-slate-800">{certificateData.accreditationBody}</span>
                <span className="text-[10px] text-slate-400">NBTC Voluntary Unpaid Charter</span>
              </div>
            </div>

            {/* Print Toolbar */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Voluntary Donor Registration</h3>
              <button onClick={() => setShowRegisterModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleRegisterDonor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Blood Group</label>
                  <select
                    value={regForm.bloodGroup}
                    onChange={e => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={e => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={regForm.dateOfBirth}
                    onChange={e => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Weight (kg, min 45kg)</label>
                  <input
                    type="number"
                    min="45"
                    required
                    value={regForm.weightKg}
                    onChange={e => setRegForm({ ...regForm, weightKg: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Preferred City / Area</label>
                <input
                  type="text"
                  required
                  value={regForm.preferredCity}
                  onChange={e => setRegForm({ ...regForm, preferredCity: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2">
                <label className="flex items-start space-x-2 cursor-pointer text-[11px] leading-tight text-rose-950 dark:text-rose-200">
                  <input
                    type="checkbox"
                    checked={regForm.voluntaryDeclarationAccepted}
                    onChange={e => setRegForm({ ...regForm, voluntaryDeclarationAccepted: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I affirm that I am registering as a <strong>100% voluntary, unpaid blood donor</strong> under National Blood Transfusion Council (NBTC) guidelines. I understand blood is never bought or sold, and that Fast-Track perks are non-monetary clinical fee waivers during emergency need.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition"
              >
                Confirm Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Link Family Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg">Link Immediate Family Member</h3>
              <button onClick={() => setShowFamilyModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleLinkFamily} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Family Member Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={familyForm.familyMemberName}
                  onChange={e => setFamilyForm({ ...familyForm, familyMemberName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Relationship</label>
                  <select
                    value={familyForm.relationship}
                    onChange={e => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Blood Group (if known)</label>
                  <select
                    value={familyForm.bloodGroup}
                    onChange={e => setFamilyForm({ ...familyForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Blood Bank Officers verify government-issued ID links before emergency fast-track benefits can be claimed.
              </p>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition"
              >
                Submit Family Link for Verification
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
