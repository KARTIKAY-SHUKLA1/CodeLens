import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

// Enhanced Pricing Component with Improved Colors
function Pricing({ user, onNavigate }) {
  const { isDark } = useTheme();
  
  return (
    <div className={`min-h-screen p-6 ${
      isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      <div className="max-w-4xl mx-auto">
        <h1 className={`text-3xl font-bold mb-8 text-center ${
          isDark ? 'text-slate-100' : 'text-slate-800'
        }`}>Pricing Plans</h1>
        
        {user && (
          <div className="text-center mb-8 p-4 bg-blue-500/15 border border-blue-500/30 rounded-xl">
            <p className="text-blue-400 font-medium">
              You're currently on the <span className="font-bold capitalize">{user.plan}</span> plan
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className={`rounded-xl p-6 border shadow-lg transition-all hover:shadow-xl ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>Free Plan</h3>
            <div className={`text-3xl font-bold mb-4 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              $0<span className={`text-base font-normal ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>/month</span>
            </div>
            <ul className={`space-y-3 mb-6 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                10 reviews per month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Basic language support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Standard analysis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Community support
              </li>
            </ul>
            {user && user.plan === 'free' ? (
              <div className={`px-4 py-3 rounded-lg text-center text-sm font-medium ${
                isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                Current Plan
              </div>
            ) : (
              <button className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                isDark 
                  ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}>
                Free Plan
              </button>
            )}
          </div>
          
          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-teal-500/10 rounded-xl p-6 border border-blue-500/30 shadow-lg hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-violet-500 text-xs rounded-full text-white font-medium shadow-lg">
                Recommended
              </span>
            </div>
            <h3 className={`text-xl font-bold mb-4 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>Pro Plan</h3>
            <div className={`text-3xl font-bold mb-4 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              $19<span className={`text-base font-normal ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>/month</span>
            </div>
            <ul className={`space-y-3 mb-6 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Unlimited reviews
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                All 15+ languages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Advanced AI analysis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Export reports (PDF, JSON)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Collaborative reviews
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Advanced security scanning
              </li>
            </ul>
            <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500 rounded-lg font-semibold hover:from-blue-600 hover:via-violet-600 hover:to-teal-600 transition-all text-white shadow-lg hover:shadow-xl transform hover:scale-105">
              {user && user.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
            {user && user.plan !== 'pro' && (
              <p className={`text-center text-xs mt-2 ${
                isDark ? 'text-slate-500' : 'text-slate-600'
              }`}>
                Cancel anytime, no hidden fees
              </p>
            )}
          </div>
        </div>
        
        {/* Feature Comparison */}
        <div className="mt-12">
          <h2 className={`text-2xl font-bold mb-6 text-center ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            Compare Plans
          </h2>
          <div className={`rounded-xl border overflow-hidden shadow-lg ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
                <tr>
                  <th className={`text-left p-4 font-semibold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>Feature</th>
                  <th className={`text-center p-4 font-semibold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>Free</th>
                  <th className={`text-center p-4 font-semibold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>Pro</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Monthly Reviews</td>
                  <td className="text-center p-4">10</td>
                  <td className="text-center p-4 text-emerald-400 font-semibold">Unlimited</td>
                </tr>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Language Support</td>
                  <td className="text-center p-4">5 languages</td>
                  <td className="text-center p-4 text-emerald-400 font-semibold">15+ languages</td>
                </tr>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Export Reports</td>
                  <td className="text-center p-4">—</td>
                  <td className="text-center p-4 text-emerald-400">✓</td>
                </tr>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Priority Support</td>
                  <td className="text-center p-4">—</td>
                  <td className="text-center p-4 text-emerald-400">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;