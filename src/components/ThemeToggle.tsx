import { useState, useEffect } from 'preact/hooks';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  
  const toggleTheme = () => {
    const root = document.documentElement;
    const newIsDark = !isDark;
    
    root.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    setIsDark(newIsDark);
  };

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
    >
      {isDark ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
    </Button>
  );
};

export default ThemeToggle; 