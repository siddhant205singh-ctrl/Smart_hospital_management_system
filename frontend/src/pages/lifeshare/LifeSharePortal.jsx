import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import CommunityCardWallet from '../../components/lifeshare/CommunityCardWallet';
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
  ArrowRight
} from 'lucide-react';

export default function LifeSharePortal() {
  const { user } = useAuth();
  const [donorData, setDonorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

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
      alert('You must accept the voluntary, unpaid blood donation declaration.');
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
      setFamilyForm({
        familyMemberName: '',
        relationship: 'spouse',
        bloodGroup: 'B+',
        dateOfBirth: '1992-08-20',
        verificationDocumentUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=500&q=80'
      });
      fetchDonor();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to link family member');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
            <Droplet className="w-4 h-4 fill-white" />
            <span>Voluntary Blood Donor Network</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">LifeShare Healthcare Welfare</h1>
          <p className="text-xs sm:text-sm text-rose-100 leading-relaxed">
            Protecting patients and rewarding unpaid blood donors with priority family blood access, no-replacement guarantees, and the Community Health Card.
          </p>
        </div>

        {!donorData?.donor && (
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-6 py-3 bg-white text-rose-600 hover:bg-rose-50 font-black text-xs rounded-2xl shadow-xl transition flex-shrink-0"
          >
            Become a Voluntary Donor →
          </button>
        )}
      </div>

      {donorData?.donor ? (
        <div className="space-y-8">
          {/* Eligibility & Countdown Widget */}
          <EligibilityCountdown
            donor={donorData.donor}
            daysUntilEligible={donorData.daysUntilEligible}
            isCurrentlyEligible={donorData.isCurrentlyEligible}
          />

          {/* Community Health Card (Apple/Google Wallet Pass) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span>Your Community Health Card</span>
                </h2>
                <p className="text-xs text-slate-500">Scan at network hospital OPDs for your earned welfare discount.</p>
              </div>
            </div>

            <CommunityCardWallet
              card={donorData.card}
              donor={donorData.donor}
              userName={user?.name}
            />
          </div>

          {/* Linked Family Members for Priority Blood Access */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-rose-500" />
                  <span>Verified Family Members (Priority Blood Access)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Linked family members receive immediate blood allocation priority with waived processing fees and zero replacement donor pressure.
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
                      Priority Access Active ✓
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
            Sign up as a voluntary, unpaid blood donor. Monitor your health gaps, earn verified donation badges, and unlock health card welfare discounts for outpatient hospital care.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Register in 1-Minute
          </button>
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Voluntary Donor Registration</h3>
            <p className="text-xs text-slate-500 mt-1">SmartCare LifeShare Voluntary Blood Donor Network</p>

            <form onSubmit={handleRegisterDonor} className="space-y-3.5 text-xs mt-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Blood Group</label>
                <select
                  value={regForm.bloodGroup}
                  onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="male">Male (90d gap)</option>
                    <option value="female">Female (120d gap)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="45"
                    required
                    value={regForm.weightKg}
                    onChange={(e) => setRegForm({ ...regForm, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={regForm.dateOfBirth}
                  onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Strict Compliance Affirmation Checkbox */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-2">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={regForm.voluntaryDeclarationAccepted}
                    onChange={(e) => setRegForm({ ...regForm, voluntaryDeclarationAccepted: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-[11px] text-rose-950 dark:text-rose-200 leading-tight">
                    I affirm that I am registering as a <strong>100% voluntary, unpaid blood donor</strong> under National Blood Transfusion Council (NBTC) guidelines. I understand blood is never bought or sold, and that Community Card perks are non-monetary outpatient welfare discounts.
                  </span>
                </label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  Confirm & Register
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 border rounded-xl font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Family Link Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Link Immediate Family Member</h3>
            <p className="text-xs text-slate-500 mt-1">Applies priority blood access and fee waiver for emergencies.</p>

            <form onSubmit={handleLinkFamily} className="space-y-3.5 text-xs mt-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Family Member Name</label>
                <input
                  type="text"
                  required
                  value={familyForm.familyMemberName}
                  onChange={(e) => setFamilyForm({ ...familyForm, familyMemberName: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Relationship</label>
                  <select
                    value={familyForm.relationship}
                    onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Blood Group</label>
                  <select
                    value={familyForm.bloodGroup}
                    onChange={(e) => setFamilyForm({ ...familyForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-[11px] text-slate-500">
                📄 Identity & Relationship Document Attached (Ration Card / Marriage Certificate sample attached).
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  Submit for Officer Verification
                </button>
                <button
                  type="button"
                  onClick={() => setShowFamilyModal(false)}
                  className="px-4 py-2.5 border rounded-xl font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
