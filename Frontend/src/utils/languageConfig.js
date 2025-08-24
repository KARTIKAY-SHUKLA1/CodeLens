// src/utils/languageConfig.js
const languages = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    displayName: 'JavaScript',
    extensions: ['.js', '.jsx'],
    category: 'Web',
    features: ['ES6+', 'Node.js', 'React'],
    icon: '🟨',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    detectionPattern: /^(function|const|let|var|class|=>|\s*\/\/|\s*\/\*)/mi
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    displayName: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    category: 'Web',
    features: ['Type Safety', 'Modern JS', 'React'],
    icon: '🔷',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    detectionPattern: /^(interface|type|enum|declare|import.*from)/mi
  },
  python: {
    id: 'python',
    name: 'Python',
    displayName: 'Python',
    extensions: ['.py', '.pyx'],
    category: 'General',
    features: ['Data Science', 'AI/ML', 'Web'],
    icon: '🐍',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    detectionPattern: /^(def|class|import|from|if __name__|#|\s*"""|\s*''')/mi
  },
  java: {
    id: 'java',
    name: 'Java',
    displayName: 'Java',
    extensions: ['.java'],
    category: 'Enterprise',
    features: ['OOP', 'Enterprise', 'Android'],
    icon: '☕',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    detectionPattern: /^(public|private|protected|class|interface|import|package)/mi
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    displayName: 'C++',
    extensions: ['.cpp', '.cc', '.cxx'],
    category: 'System',
    features: ['Performance', 'System', 'Gaming'],
    icon: '⚡',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    detectionPattern: /^(#include|using namespace|int main|class|struct|template)/mi
  },
  go: {
    id: 'go',
    name: 'Go',
    displayName: 'Go',
    extensions: ['.go'],
    category: 'System',
    features: ['Concurrency', 'Cloud', 'Microservices'],
    icon: '🚀',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    detectionPattern: /^(package|import|func|type|var|const)/mi
  },
  php: {
    id: 'php',
    name: 'PHP',
    displayName: 'PHP',
    extensions: ['.php'],
    category: 'Web',
    features: ['Web Development', 'Laravel', 'WordPress'],
    icon: '🌐',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    detectionPattern: /^(<\?php|namespace|use|class|function)/mi
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    displayName: 'Ruby',
    extensions: ['.rb'],
    category: 'Web',
    features: ['Ruby on Rails', 'Web Apps', 'Scripting'],
    icon: '💎',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    detectionPattern: /^(class|def|module|require|include)/mi
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    displayName: 'C#',
    extensions: ['.cs'],
    category: 'Microsoft',
    features: ['.NET', 'Desktop Apps', 'Web APIs'],
    icon: '🔵',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    detectionPattern: /^(using|namespace|class|interface|public|private)/mi
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    displayName: 'Swift',
    extensions: ['.swift'],
    category: 'Mobile',
    features: ['iOS', 'macOS', 'App Development'],
    icon: '🦉',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    detectionPattern: /^(import|class|struct|enum|func|var|let)/mi
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    displayName: 'Kotlin',
    extensions: ['.kt', '.kts'],
    category: 'Mobile',
    features: ['Android', 'JVM', 'Multiplatform'],
    icon: '🎯',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30',
    detectionPattern: /^(package|import|class|interface|fun|val|var)/mi
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    displayName: 'Rust',
    extensions: ['.rs'],
    category: 'System',
    features: ['Memory Safety', 'Performance', 'Web Assembly'],
    icon: '🦀',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    detectionPattern: /^(use|fn|struct|enum|impl|mod|pub)/mi
  }
};

const categories = {
  'Web': ['javascript', 'typescript', 'php', 'ruby'],
  'Mobile': ['swift', 'kotlin', 'java'],
  'System': ['cpp', 'go', 'rust'],
  'General': ['python'],
  'Enterprise': ['java', 'csharp'],
  'Microsoft': ['csharp']
};

export const getLanguageConfig = (languageId) => {
  return languages[languageId] || {
    id: languageId || 'plaintext',
    name: 'Plain Text',
    displayName: 'Plain Text',
    extensions: ['.txt'],
    category: 'Other',
    features: ['Text'],
    icon: '📄',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    detectionPattern: /.*/
  };
};

export const getSupportedLanguages = () => {
  return Object.values(languages);
};

export const getLanguagesByCategory = () => {
  return categories;
};

export const detectLanguageFromCode = (code) => {
  if (!code || code.trim().length === 0) {
    return 'plaintext';
  }

  const trimmedCode = code.trim();
  
  for (const [languageId, config] of Object.entries(languages)) {
    if (config.detectionPattern && config.detectionPattern.test(trimmedCode)) {
      return languageId;
    }
  }
  
  return 'plaintext';
};

export const getLanguageFromExtension = (filename) => {
  if (!filename) return 'plaintext';
  
  const extension = filename.toLowerCase().split('.').pop();
  
  for (const [languageId, config] of Object.entries(languages)) {
    if (config.extensions.some(ext => ext.toLowerCase() === `.${extension}`)) {
      return languageId;
    }
  }
  
  return 'plaintext';
};

export const isLanguageSupported = (languageId) => {
  return languages.hasOwnProperty(languageId);
};