import React, { useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import useClickOutside from '../hooks/useClickOutside';

interface SettingsMenuProps {
  onClose: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose }) => {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, onClose);

  return (
    <div
      ref={menuRef}
      className="absolute top-full mt-2 right-0 w-64 bg-brand-surface rounded-lg shadow-2xl border border-border-color z-50 text-brand-text"
    >
      <div className="p-4 border-b border-border-color">
        <h3 className="font-semibold">{t('settingsTitle')}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-brand-text-secondary">{t('theme')}</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${theme === 'light' ? 'bg-brand-primary text-white' : 'bg-overlay-bg/10 hover:bg-overlay-bg/20'}`}
            >
              {t('themeLight')}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-brand-primary text-white' : 'bg-overlay-bg/10 hover:bg-overlay-bg/20'}`}
            >
              {t('themeDark')}
            </button>
          </div>
        </div>
        <div>
            <label htmlFor="language-select" className="text-sm font-medium text-brand-text-secondary">{t('language')}</label>
            <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
                className="mt-2 block w-full px-3 py-1.5 bg-brand-surface border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            >
                <option value="en">English</option>
                <option value="he">עברית</option>
            </select>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
