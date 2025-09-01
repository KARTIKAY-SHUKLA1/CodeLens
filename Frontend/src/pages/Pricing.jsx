import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { getSubscriptionStatus, createCheckoutSession, getBillingPortal, cancelSubscription } from '../config/api';

// Enhanced Pricing Component with Stripe Integration
function Pricing({ user, onNavigate }) {
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState('');

  // Fetch subscription status on component mount
  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
  try {
    const data = await getSubscriptionStatus(); // ✅ uses api.js helper
    if (data.success) {
      setSubscriptionStatus(data.subscription);
    } else {
      setSubscriptionStatus(null);
    }
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    setSubscriptionStatus(null);
  }
};

const handleUpgradeToPro = async () => {
  if (!user) {
    onNavigate && onNavigate('home');
    return;
  }

  if (user.plan === 'pro' || (subscriptionStatus && subscriptionStatus.status === 'active')) {
    return;
  }

  setIsLoading(true);
  setError('');

  try {
    const data = await createCheckoutSession({
      planType: 'pro',
      successUrl: `${window.location.origin}/dashboard?upgraded=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`
    });

    if (data.success && data.sessionUrl) {
      window.location.href = data.sessionUrl; // ✅ Stripe redirect
    } else {
      throw new Error(data.message || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    setError(error.message || 'Failed to start checkout process');
  } finally {
    setIsLoading(false);
  }
};


  const handleManageBilling = async () => {
  if (!user) return;

  setIsLoading(true);
  setError('');

  try {
    const data = await openBillingPortal();

    if (data.success && data.portalUrl) {
      window.location.href = data.portalUrl; // ✅ Stripe Billing Portal
    } else {
      throw new Error(data.message || 'Failed to access billing portal');
    }
  } catch (error) {
    console.error('Billing portal error:', error);
    setError(error.message || 'Failed to access billing portal');
  } finally {
    setIsLoading(false);
  }
};


  // Check if user is on Pro plan (either from user object or subscription status)
  const isProUser = user?.plan === 'pro' || 
                   (subscriptionStatus && subscriptionStatus.status === 'active' && subscriptionStatus.tier === 'pro');

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
              You're currently on the <span className="font-bold capitalize">{isProUser ? 'Pro' : 'Free'}</span> plan
            </p>
            {subscriptionStatus && subscriptionStatus.cancelAtPeriodEnd && (
              <p className="text-orange-400 text-sm mt-1">
                Your subscription will end on {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message from URL params */}
        {new URLSearchParams(window.location.search).get('upgraded') === 'true' && (
          <div className="mb-6 p-4 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">Successfully upgraded to Pro! Welcome to CodeLens Pro.</p>
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
            {!isProUser ? (
              <div className={`px-4 py-3 rounded-lg text-center text-sm font-medium ${
                isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                Current Plan
              </div>
            ) : (
              <button 
                disabled
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors opacity-50 cursor-not-allowed ${
                  isDark 
                    ? 'bg-slate-600 text-slate-300' 
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                Downgrade Not Available
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
            
            {isProUser ? (
              <div className="space-y-2">
                <div className="w-full px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg font-semibold text-center text-green-400">
                  Current Plan
                </div>
                <button
                  onClick={handleManageBilling}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Manage Billing
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleUpgradeToPro}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500 rounded-lg font-semibold hover:from-blue-600 hover:via-violet-600 hover:to-teal-600 transition-all text-white shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : user ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Upgrade to Pro
                  </>
                ) : (
                  'Sign in to Upgrade'
                )}
              </button>
            )}
            
            {!isProUser && user && (
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
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Advanced Security Scanning</td>
                  <td className="text-center p-4">—</td>
                  <td className="text-center p-4 text-emerald-400">✓</td>
                </tr>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className="p-4">Collaborative Reviews</td>
                  <td className="text-center p-4">—</td>
                  <td className="text-center p-4 text-emerald-400">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className={`text-2xl font-bold mb-6 text-center ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            } border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`font-semibold mb-2 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>Can I cancel my subscription anytime?</h3>
              <p className={`text-sm ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Yes, you can cancel your Pro subscription at any time. You'll continue to have Pro access until the end of your billing period.
              </p>
            </div>
            <div className={`rounded-lg p-4 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            } border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`font-semibold mb-2 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>What payment methods do you accept?</h3>
              <p className={`text-sm ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                We accept all major credit and debit cards through Stripe's secure payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;