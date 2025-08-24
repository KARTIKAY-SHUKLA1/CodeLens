// src/components/LanguageSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Code, Check, Zap } from 'lucide-react';
import { getLanguageConfig, getSupportedLanguages, getLanguagesByCategory } from '../utils/languageConfig';

const LanguageSelector = ({ 
  selectedLanguage, 
  onLanguageChange, 
  detectedLanguage = null,
  showDetected = true,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const languages = getSupportedLanguages();
  const categories = getLanguagesByCategory();
  const selectedConfig = getLanguageConfig(selectedLanguage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter languages based on search and category
  const filteredLanguages = languages.filter(lang => {
    const matchesSearch = lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lang.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || 
                           Object.entries(categories).some(([categoryName, langIds]) => 
                             categoryName === activeCategory && langIds.includes(lang.id)
                           );

    return matchesSearch && matchesCategory;
  });

  const handleLanguageSelect = (languageId) => {
    onLanguageChange(languageId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleDetectedLanguageAccept = () => {
    if (detectedLanguage) {
      onLanguageChange(detectedLanguage);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Detected Language Banner */}
      {showDetected && detectedLanguage && detectedLanguage !== selectedLanguage && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              Detected: <span className="font-medium">{getLanguageConfig(detectedLanguage).displayName}</span>
            </span>
          </div>
          <button
            onClick={handleDetectedLanguageAccept}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-md transition-colors"
          >
            Use This
          </button>
        </div>
      )}

      {/* Language Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-lg transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${selectedConfig.bgColor} ${selectedConfig.borderColor} border rounded-lg flex items-center justify-center text-lg`}>
            {selectedConfig.icon}
          </div>
          <div className="text-left">
            <div className={`font-medium ${selectedConfig.color}`}>
              {selectedConfig.displayName}
            </div>
            <div className="text-xs text-gray-400">
              {selectedConfig.extensions.join(', ')}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-1 mt-3 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === 'all' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {Object.keys(categories).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    activeCategory === category 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No languages found matching "{searchTerm}"
              </div>
            ) : (
              filteredLanguages.map((language) => {
                const isSelected = language.id === selectedLanguage;
                const isDetected = language.id === detectedLanguage;
                
                return (
                  <button
                    key={language.id}
                    onClick={() => handleLanguageSelect(language.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left ${
                      isSelected ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 ${language.bgColor} ${language.borderColor} border rounded-lg flex items-center justify-center text-sm flex-shrink-0`}>
                      {language.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${language.color}`}>
                          {language.displayName}
                        </span>
                        {isDetected && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            Detected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {language.features.join(' • ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Info Footer */}
          {filteredLanguages.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-750">
              <div className="text-xs text-gray-400 text-center">
                {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''} available
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;