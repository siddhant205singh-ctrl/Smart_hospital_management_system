import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, Clock, Volume2, Building2 } from 'lucide-react';

export default function WaitingRoomDisplayPage() {
  const [feeds, setFeeds] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchFeed = () => {
    // Default Apollo & Cardiology
    api.get('/queue/display/675d00000000000000000001/675d00000000000000000004')
      .then(res => setFeeds(res.data.feeds || []))
      .catch(() => {
        // Fallback demo feed
        setFeeds([
          {
            doctorName: 'Dr. Anita Desai',
            roomNumber: 'OPD-101',
            status: 'in_consultation',
            currentToken: 1,
            tokenCode: 'CARD-001',
            isCalling: false,
            nextTokens: [{ token: 2, code: 'CARD-002' }, { token: 3, code: 'CARD-003' }, { token: 4, code: 'CARD-004' }]
          },
          {
            doctorName: 'Dr. Rajesh Verma',
            roomNumber: 'OPD-102',
            status: 'available',
            currentToken: 2,
            tokenCode: 'ORTH-002',
            isCalling: true,
            nextTokens: [{ token: 3, code: 'ORTH-003' }, { token: 4, code: 'ORTH-004' }]
          },
          {
            doctorName: 'Dr. Meera Nambiar',
            roomNumber: 'OPD-103',
            status: 'available',
            currentToken: 5,
            tokenCode: 'PED-005',
            isCalling: false,
            nextTokens: [{ token: 6, code: 'PED-006' }]
          }
        ]);
      });
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl shadow-teal-500/30 flex-shrink-0">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">SmartCare OPD Display</h1>
            <p className="text-xs text-teal-400 font-semibold">Apollo Indraprastha Medical Center • Live Queue Hub</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-2xl sm:text-4xl font-mono font-black tracking-wider text-teal-400">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Big Token Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        {feeds.map((feed, idx) => (
          <div
            key={idx}
            className={`rounded-3xl p-6 border transition-all duration-500 ${
              feed.isCalling
                ? 'bg-gradient-to-br from-amber-600/30 via-slate-900 to-slate-900 border-amber-400 shadow-2xl animate-pulse'
                : 'bg-slate-900/90 border-slate-800 shadow-xl'
            }`}
          >
            {/* Doctor & Room */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider block">
                  Room: {feed.roomNumber}
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{feed.doctorName}</h3>
              </div>

              {feed.isCalling && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-xs font-black animate-bounce">
                  <Volume2 className="w-4 h-4" />
                  <span>CALLING</span>
                </div>
              )}
            </div>

            {/* Big Active Token Number */}
            <div className="py-8 text-center">
              <span className="text-xs uppercase font-bold text-slate-400 block">Now Consulting</span>
              <span className="text-7xl sm:text-8xl font-black text-white tracking-tight my-2 block drop-shadow-md">
                #{feed.currentToken}
              </span>
              <span className="text-sm font-mono font-bold text-teal-400 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800">
                {feed.tokenCode}
              </span>
            </div>

            {/* Next Up Tokens */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Next in Line:</span>
              <div className="flex space-x-1.5">
                {feed.nextTokens && feed.nextTokens.length > 0 ? (
                  feed.nextTokens.slice(0, 3).map((n, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-bold font-mono">
                      #{n.token}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">None</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Ticker */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center space-x-2 text-teal-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>SmartCare Predictive Arrival Engine</span>
        </span>
        <span className="hidden sm:inline">Please arrive 15 minutes before your estimated turn time. For assistance, visit the Help Desk.</span>
        <span className="font-mono text-slate-300">Display Station #01</span>
      </div>
    </div>
  );
}
