// Simple implementation of Chevron icons without relying on the Lucide library

const ChevronDown = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={`lucide lucide-chevron-down ${className}`}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronRight = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={`lucide lucide-chevron-right ${className}`}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// Make icons available globally
window.LucideIcons = {
  ChevronDown,
  ChevronRight
};
