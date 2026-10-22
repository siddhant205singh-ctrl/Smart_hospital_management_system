import React, { useState } from 'react';
import { Shield, Sparkles, QrCode, Download, Award, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CommunityCardWallet({ card, donor, userName }) {
  const [showQrModal, setShowQrModal] = useState(false);

  if (!card) {
    return (
      <div className="p-6 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-rose-200 dark:border-rose-900/40 text-center">
        <Award className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-base text-slate-900 dark:text-white">Community Health Card Locked</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          Complete 3 voluntary, unpaid blood donations to unlock your Bronze Tier Card with 10% welfare discounts on outpatient diagnostics and pharmacy!
        </p>
        <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold text-rose-600 shadow-sm border border-rose-200 dark:border-rose-800">
          <span>Current Donations: {donor?.totalDonations || 0} / 3</span>
        </div>
      </div>
    );
  }

  // Tier color styling
  const tierThemes = {
    Bronze: {
      gradient: 'from-amber-700 via-amber-600 to-amber-800',
      text: 'text-amber-100',
      badge: 'bg-amber-800/80 text-amber-200 border-amber-500/50',
      discount: '10%'
    },
    Silver: {
      gradient: 'from-slate-600 via-slate-500 to-slate-700',
      text: 'text-slate-100',
      badge: 'bg-slate-700/80 text-slate-200 border-slate-400/50',
      discount: '20%'
    },
    Gold: {
      gradient: 'from-amber-500 via-yellow-500 to-amber-600',
      text: 'text-yellow-50',
      badge: 'bg-amber-900/60 text-yellow-200 border-yellow-300/50',
      discount: '30%'
    },
    Platinum: {
      gradient: 'from-teal-600 via-cyan-600 to-indigo-700',
      text: 'text-cyan-50',
      badge: 'bg-teal-900/70 text-cyan-200 border-cyan-400/50',
      discount: '50%'
    }
  };

  const theme = tierThemes[card.tier] || tierThemes.Gold;

  return (
    <div>
      {/* Wallet Pass Style Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} p-5 sm:p-7 text-white shadow-2xl border border-white/20 transition-transform duration-300 hover:scale-[1.01]`}>
        {/* Ambient background watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <Shield className="w-56 h-56" />
        </div>

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-extrabold bg-black/25 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                LifeShare Network
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/80">
                Non-Monetary Pass
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">SmartCare Community Card</h2>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider border shadow-sm backdrop-blur-md ${theme.badge} flex items-center space-x-1`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{card.tier} Tier ({card.discountPercentage}% OFF)</span>
          </div>
        </div>

        {/* Card Number & Chip Row */}
        <div className="my-4 sm:my-6 relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/70 block">Card Number</span>
            <span className="font-mono text-base sm:text-2xl font-bold tracking-wider drop-shadow-sm">
              {card.cardNumber}
            </span>
          </div>

          {/* QR Code Preview */}
          <div
            onClick={() => setShowQrModal(true)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-white p-1 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition flex-shrink-0"
            title="Click to expand QR Code"
          >
            <img src={card.qrCodeUrl} alt="Card QR" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Card Footer: Name & Validity */}
        <div className="flex items-end justify-between border-t border-white/20 pt-4 relative z-10 text-xs">
          <div>
            <span className="text-[10px] uppercase text-white/70 block">Valued Voluntary Donor</span>
            <span className="font-bold text-sm tracking-wide">{userName || card.userId?.name || 'Rahul Sharma'}</span>
            <span className="block text-[10px] text-white/80">Blood Group: {donor?.bloodGroup || 'O+'} • {card.totalLifetimeDonationsAtIssue} Donations</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-white/70 block">Valid Until</span>
            <span className="font-mono font-semibold text-xs">
              {new Date(card.validUntil).toLocaleDateString([], { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Welfare Perks Bar */}
      <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Valid for Outpatient Diagnostics, Pharmacy & Preventive Health Packages</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-300 font-semibold text-xs flex items-center space-x-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Show QR</span>
          </button>
          <a
            href={card.qrCodeUrl}
            download={`SmartCare_CommunityCard_${card.cardNumber}.png`}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Pass</span>
          </a>
        </div>
      </div>

      {/* Modal for full QR display at receptionist counter */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Scan for OPD Discount</h3>
            <p className="text-xs text-slate-500 mt-1">Show this QR to the receptionist at checkout</p>
            <div className="my-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl inline-block border">
              <img src={card.qrCodeUrl} alt="Full QR" className="w-52 h-52 object-contain" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{card.cardNumber}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Active Tier: {card.tier} ({card.discountPercentage}% Off Outpatient Services)
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
