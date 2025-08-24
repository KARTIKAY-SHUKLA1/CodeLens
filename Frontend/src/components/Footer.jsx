import React from 'react';
import { Code, Github, Users, CheckCircle } from 'lucide-react';
import { useTheme } from './ThemeProvider';

// Enhanced Footer with Improved Colors
function Footer() {
  const { isDark } = useTheme();

  return (
    <footer className={`px-6 py-16 ${
      isDark 
        ? 'bg-gray-900 border-t border-gray-800' 
        : 'bg-white border-t border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                CodeLens
              </span>
            </div>
            <p className={`text-lg mb-6 max-w-md ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Transform your code quality with intelligent AI reviews. Built for developers.
            </p>
            <div className="flex items-center gap-4">
              <button className={`p-2 rounded-lg ${
                isDark 
                  ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              } transition-all`}>
                <Github className="w-5 h-5" />
              </button>
              <button className={`p-2 rounded-lg ${
                isDark 
                  ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              } transition-all`}>
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Product */}
          <div>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Product
            </h3>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'API Docs', 'Changelog'].map((item) => (
                <li key={item}>
                  <button className={`text-sm ${
                    isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  } transition-colors`}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Support
            </h3>
            <ul className="space-y-3">
              {['Help Center', 'Contact', 'Status', 'Community'].map((item) => (
                <li key={item}>
                  <button className={`text-sm ${
                    isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  } transition-colors`}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className={`pt-8 border-t ${
          isDark ? 'border-gray-800' : 'border-gray-200'
        } flex flex-col md:flex-row justify-between items-center gap-4`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            © 2025 CodeLens. Built with AI for better code.
          </p>
          <div className="flex items-center gap-6">
            <button className={`text-sm ${
              isDark 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            } transition-colors`}>
              Privacy
            </button>
            <button className={`text-sm ${
              isDark 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            } transition-colors`}>
              Terms
            </button>
            <button className={`text-sm ${
              isDark 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            } transition-colors`}>
              Security
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Simple Footer Component for Home Page
function SimpleFooter() {
  const { isDark } = useTheme();
  
  return (
    <footer className={`px-6 py-12 border-t ${
      isDark 
        ? 'bg-slate-800/50 border-slate-700' 
        : 'bg-white/80 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 via-violet-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>CodeLens</span>
          </div>
          <div className={`flex items-center gap-6 text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <a href="#" className={`transition-colors ${
              isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}>Privacy</a>
            <a href="#" className={`transition-colors ${
              isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}>Terms</a>
            <a href="#" className={`transition-colors ${
              isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}>Support</a>
            <a href="#" className={`flex items-center gap-1 transition-colors ${
              isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}>
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
        <div className={`mt-8 pt-8 border-t text-center text-sm ${
          isDark 
            ? 'border-slate-700 text-slate-500' 
            : 'border-slate-200 text-slate-600'
        }`}>
          © 2025 CodeLens. Built with AI for better code.
        </div>
      </div>
    </footer>
  );
}

export { Footer, SimpleFooter };