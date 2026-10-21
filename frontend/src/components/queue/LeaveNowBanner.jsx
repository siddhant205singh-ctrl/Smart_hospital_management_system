import React, { useState } from 'react';
import { Car, Clock, ShieldCheck, Navigation, BellRing } from 'lucide-react';
import api from '../../services/api';

export default function LeaveNowBanner({
  appointmentId,
  estimatedTurnTime,
  travelTimeMinutes = 30,
  checkInBufferMinutes = 15,
  onTravelTimeUpdated
}) {
  const [editingTravel, setEditingTravel] = useState(false);
  const [newTravelTime, setNewTravelTime] = useState(travelTimeMinutes);
  const [updating, setUpdating] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsAlertSent, setSmsAlertSent] = useState(false);

  const turnDate = estimatedTurnTime ? new Date(estimatedTurnTime) : new Date(Date.now() + 45 * 60000);
  const departureDate = new Date(turnDate.getTime() - (travelTimeMinutes + checkInBufferMinutes) * 60000);
  const now = new Date();
  const minutesUntilDeparture = Math.floor((departureDate - now) / 60000);

  const isUrgentLeave = minutesUntilDeparture <= 15;

  const handleSaveTravelTime = async () => {
    setUpdating(true);
    try {
      await api.put(`/appointments/${appointmentId}/travel-time`, { minutes: newTravelTime });
      if (onTravelTimeUpdated) onTravelTimeUpdated(newTravelTime);
      setEditingTravel(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleTestSms = async () => {
    setSmsSending(true);
    try {
      await api.post('/notifications/test-sms', {
        phone: '+919810123456',
        tokenNumber: 3,
        patientsAhead: 1,
        estWaitMinutes: Math.max(5, minutesUntilDeparture + travelTimeMinutes)
      });
      setSmsAlertSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div
      className={`p-5 rounded-3xl border transition-all duration-300 ${
        isUrgentLeave
          ? 'bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-amber-400 dark:border-amber-600'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      } shadow-lg`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Indicator & Time */}
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
              isUrgentLeave ? 'bg-gradient-to-br from-amber-500 to-rose-500' : 'bg-teal-600'
            }`}
          >
            <Car className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded-full ${
                  isUrgentLeave
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                }`}
              >
                {isUrgentLeave ? '⚡ Action Needed: Leave Now' : 'Arrival Planner'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Turn at: {turnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {minutesUntilDeparture <= 0
                ? 'You should be on your way right now!'
                : `Depart in approximately ${minutesUntilDeparture} minutes`}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ideal Departure Time: <strong className="text-slate-800 dark:text-slate-200">{departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> (includes {travelTimeMinutes}m drive + {checkInBufferMinutes}m triage buffer)
            </p>
          </div>
        </div>

        {/* Right: Travel time setting & SMS alert demo */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {editingTravel ? (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min="5"
                max="180"
                value={newTravelTime}
                onChange={(e) => setNewTravelTime(e.target.value)}
                className="w-16 px-2 py-1 text-xs border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-600 text-center font-bold"
              />
              <span className="text-xs text-slate-500">mins</span>
              <button
                onClick={handleSaveTravelTime}
                disabled={updating}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTravel(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTravel(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
            >
              <Navigation className="w-3.5 h-3.5 text-teal-600" />
              <span>Adjust Travel Time ({travelTimeMinutes}m)</span>
            </button>
          )}

          <button
            onClick={handleTestSms}
            disabled={smsSending}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1 shadow-sm ${
              smsAlertSent
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{smsAlertSent ? 'SMS Dispatched ✓' : 'Send SMS Alert to Phone'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
