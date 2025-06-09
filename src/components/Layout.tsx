import React, { ReactNode } from 'react';
import { Zap, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Energy AI Predictor</h1>
          </div>
          <div className="flex items-center space-x-6">
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
                    Help
                  </a>
                </li>
              </ul>
            </nav>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-slate-400 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300" />
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} Energy AI Predictor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};