import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ThemeA11yContext = createContext();

export const ThemeA11yProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('smartcare_dark') === 'true';
  });
  const [largeFont, setLargeFont] = useState(() => {
    return localStorage.getItem('smartcare_large_font') === 'true';
  });
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('smartcare_lang') || 'en';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('smartcare_dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (largeFont) {
      document.documentElement.classList.add('large-font');
    } else {
      document.documentElement.classList.remove('large-font');
    }
    localStorage.setItem('smartcare_large_font', largeFont);
  }, [largeFont]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleLargeFont = () => setLargeFont(prev => !prev);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('smartcare_lang', lang);
  };

  return (
    <ThemeA11yContext.Provider value={{
      darkMode,
      toggleDarkMode,
      largeFont,
      toggleLargeFont,
      currentLanguage,
      changeLanguage
    }}>
      {children}
    </ThemeA11yContext.Provider>
  );
};

export const useThemeA11y = () => useContext(ThemeA11yContext);
