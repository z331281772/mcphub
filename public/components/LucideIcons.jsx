// Lightweight implementation of Lucide icons without external dependencies
// Each icon component accepts:
// - size: number (default: 24) - Icon dimensions in pixels
// - className: string - Additional CSS classes

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

// Export icons to global scope for use in other components
window.LucideIcons = {
  ChevronDown,
  ChevronRight
};
