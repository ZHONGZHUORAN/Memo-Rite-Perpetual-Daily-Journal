import React, { createContext, useContext, useState, useEffect } from 'react';

// We now support any string (hex) for color
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  themeColor: string; // Hex code
  setThemeColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Default to true (Dark Mode) if not set in local storage
    const saved = localStorage.getItem('theme_mode');
    return saved !== null ? saved === 'dark' : true;
  });
  
  // Default to red hex if not set
  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('theme_color') || '#ef4444';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('theme_color', themeColor);
  }, [themeColor]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleDarkMode, 
      themeColor, 
      setThemeColor,
    }}>
      <div style={{ '--primary': themeColor } as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};