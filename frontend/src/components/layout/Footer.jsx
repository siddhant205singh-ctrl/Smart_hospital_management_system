import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, PhoneCall, Droplet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">HealthMS</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-xs">
              {t('footer.mission')}
            </p>
            <div className="flex items-center space-x-1.5 text-rose-600 font-medium">
              <Droplet className="w-4 h-4 fill-rose-500" />
              <span>{t('footer.lifeShareNetwork')}</span>
            </div>
          </div>

          {/* Col 2: Hospital Partners */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">{t('footer.connectedHospitals')}</h4>
            <ul className="space-y-2">
              <li>Apollo Indraprastha Medical Center (New Delhi)</li>
              <li>Fortis Memorial Research Institute (Gurugram)</li>
              <li>Max Super Speciality Hospital (Saket, New Delhi)</li>
              <li className="text-teal-600 dark:text-teal-400 font-medium">{t('footer.seamlessReferrals')}</li>
            </ul>
          </div>

          {/* Col 3: Emergency & Helplines */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">{t('footer.emergencyHotlines')}</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-rose-600 font-bold">
                <PhoneCall className="w-4 h-4" />
                <span>{t('footer.nationalEmergency')}</span>
              </div>
              <p>{t('footer.apolloTrauma')}</p>
              <p>{t('footer.fortisEmergency')}</p>
              <p>{t('footer.maxCardiac')}</p>
            </div>
          </div>

          {/* Col 4: Regulatory & Ethics */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">{t('footer.ethicsTitle')}</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              {t('footer.ethicsDesc')}
            </p>
            <Link to="/legal-policy" className="mt-2 inline-block text-teal-600 hover:underline font-medium">
              {t('footer.readCharter')}
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <p>{t('footer.copyright')}</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <Link to="/legal-policy" className="hover:text-teal-600">{t('footer.privacy')}</Link>
            <Link to="/legal-policy" className="hover:text-teal-600">{t('footer.terms')}</Link>
            <Link to="/legal-policy" className="hover:text-teal-600">{t('footer.nbtc')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}