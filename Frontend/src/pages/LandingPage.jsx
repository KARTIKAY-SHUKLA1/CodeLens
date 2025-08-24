import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, Code, Sparkles, Users, Download, Github, Star, 
  ArrowRight, CheckCircle, Zap, Shield, BarChart3 
} from 'lucide-react';
import { useTheme } from "../components/ThemeProvider";

// Enhanced Landing Page with Fixed Light/Dark Theme Colors
function LandingPage({ onNavigate, user, signIn, isLoading }) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const demoCode = [
    `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
    `def process_data(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result`,
    `public class UserService {
    private List<User> users;
    
    public User findUser(String id) {
        for (User user : users) {
            if (user.getId().equals(id)) {
                return user;
            }
        }
        return null;
    }
}`
  ];

  const languages = ['JavaScript', 'Python', 'Java'];
  const features = [
    {
      icon: <Code className="w-8 h-8 text-emerald-500" />,
      title: "Multi-Language Support",
      description: "Review code in JavaScript, Python, Java, C++, and more with language-specific insights."
    },
    {
      icon: <Sparkles className="w-8 h-8 text-violet-500" />,
      title: "AI-Powered Analysis",
      description: "Advanced AI provides detailed code reviews with performance, security, and best practice suggestions."
    },
    {
      icon: <Users className="w-8 h-8 text-cyan-500" />,
      title: "Collaborative Reviews",
      description: "Share reviews with your team, add comments, and track improvements over time."
    },
    {
      icon: <Download className="w-8 h-8 text-amber-500" />,
      title: "Export Reports",
      description: "Generate PDF reports, export to JSON, or create shareable links for your reviews."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-rose-500" />,
      title: "Quality Analytics",
      description: "Track code quality scores, monitor improvements, and identify patterns over time."
    },
    {
      icon: <Shield className="w-8 h-8 text-indigo-500" />,
      title: "Security Focused",
      description: "Identify security vulnerabilities, potential exploits, and recommend secure coding practices."
    }
  ];

  const stats = [
    { number: "50K+", label: "Lines Reviewed" },
    { number: "1.2K+", label: "Bugs Found" },
    { number: "15+", label: "Languages" },
    { number: "98%", label: "Accuracy" }
  ];

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-white via-gray-50 to-slate-100'
    } overflow-hidden`}>
      {/* Enhanced Hero Section */}
      <section className="relative px-6 py-24 overflow-hidden">
        {/* Animated background elements */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-r from-emerald-500/10 to-violet-600/10' 
            : 'bg-gradient-to-r from-emerald-100/50 to-violet-100/50'
        } blur-3xl transform -rotate-6 scale-150`}></div>
        <div className="absolute top-20 left-1/4 w-24 h-24 bg-violet-500/20 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-32 right-1/4 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-blue-500/20 rounded-full blur-lg animate-ping"></div>
        
        <div className={`max-w-7xl mx-auto text-center relative z-10 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${
            isDark 
              ? 'bg-gray-800/80 border-gray-600/50 text-gray-200' 
              : 'bg-white/95 border-gray-200/80 text-gray-700 shadow-md'
          } backdrop-blur-sm rounded-full text-sm mb-8 border`}>
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Powered by Advanced AI</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 leading-tight ${
            isDark 
              ? 'text-white'
              : 'text-gray-900'
          }`}>
            AI-Powered Code
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              Review Tool
            </span>
          </h1>
          
          <p className={`text-xl mb-12 max-w-3xl mx-auto leading-relaxed ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Transform your code quality with intelligent AI reviews. Get instant feedback, 
            security insights, and performance optimizations across multiple programming languages.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
            {user ? (
              <button 
                onClick={() => onNavigate('dashboard')}
                className="group px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-bold text-xl text-white hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/40 flex items-center gap-3 shadow-xl animate-pulse"
              >
                Go to Dashboard
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            ) : (
              <button 
                onClick={signIn}
                disabled={isLoading}
                className="group px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-bold text-xl text-white hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/40 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <Github className="w-6 h-6" />
                    Sign In with GitHub
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>
            )}
            <button className={`group px-10 py-5 ${
              isDark 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                : 'bg-white/90 border-gray-300 text-gray-800 hover:bg-white hover:shadow-xl'
            } backdrop-blur-sm rounded-2xl font-bold text-xl transition-all border-2 flex items-center gap-3 shadow-lg hover:scale-105`}>
              <Github className="w-6 h-6" />
              View on GitHub
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-emerald-500">{stat.number}</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className={`px-6 py-20 ${
        isDark 
          ? 'bg-gray-800/30 backdrop-blur-sm border-t border-gray-700' 
          : 'bg-white/70 backdrop-blur-sm border-t border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              See It In Action
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Watch CodeLens analyze code in real-time and provide intelligent suggestions
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Code Input */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {languages.map((lang, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveDemo(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeDemo === index
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className={`${
                isDark 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-300 shadow-md'
              } rounded-xl p-6 border`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className={`ml-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Input Code
                  </span>
                </div>
                <pre className={`text-sm leading-relaxed overflow-x-auto ${
                  isDark ? 'text-green-400' : 'text-green-700'
                }`}>
                  <code>{demoCode[activeDemo]}</code>
                </pre>
              </div>
            </div>

            {/* AI Review Output */}
            <div className={`${
              isDark 
                ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
                : 'bg-gradient-to-br from-white to-gray-50 border-gray-300 shadow-md'
            } rounded-xl p-6 border`}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <span className="text-violet-500 font-semibold">AI Review</span>
                <div className="ml-auto flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Score: 8.5/10
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs">×</span>
                  </div>
                  <div>
                    <div className="text-red-400 font-medium text-sm">Performance Issue</div>
                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Consider using Array.reduce() for better performance
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-400 text-xs">!</span>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-medium text-sm">Missing Documentation</div>
                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Add JSDoc comments for better maintainability
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-green-400 font-medium text-sm">Good Practice</div>
                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      Clear variable naming and structure
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Powerful Features
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Everything you need to write better code and improve your development workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className={`group p-6 ${
                isDark 
                  ? 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10' 
                  : 'bg-white/90 border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-lg'
              } backdrop-blur-sm rounded-xl border transition-all hover:transform hover:scale-105`}>
                <div className="mb-4">{feature.icon}</div>
                <h3 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className={`relative px-6 py-24 overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-gray-50'
      }`}>
        {/* Animated background elements */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-r from-emerald-600/5 via-violet-600/5 to-blue-600/5' 
            : 'bg-gradient-to-r from-emerald-100/30 via-violet-100/30 to-blue-100/30'
        }`}></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${
            isDark 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          } backdrop-blur-sm rounded-full text-sm mb-6 border`}>
            <Sparkles className="w-4 h-4" />
            <span>Join 10,000+ developers</span>
          </div>
          
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 leading-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Ready to Transform Your Code?
          </h2>
          <p className={`text-xl mb-12 max-w-2xl mx-auto leading-relaxed ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Join thousands of developers who are writing better code with CodeLens. 
            Start your free review today and see the difference AI can make.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            {user ? (
              <button 
                onClick={() => onNavigate('dashboard')}
                className="group px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-semibold text-xl text-white hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/30 flex items-center gap-3 shadow-xl"
              >
                <Zap className="w-6 h-6 animate-pulse" />
                Go to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button 
                onClick={signIn}
                disabled={isLoading}
                className="group px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-semibold text-xl text-white hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/30 flex items-center gap-3 disabled:opacity-50 shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 animate-pulse" />
                    Start Free Review
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            )}
          </div>
          
          {!user && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>No credit card required</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Free forever plan</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default LandingPage;