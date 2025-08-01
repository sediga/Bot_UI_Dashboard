// components/SectionWithBackground.jsx
const SectionWithBackground = ({ children, gradientId = "grad1", svgPath, className = "" }) => {
  return (
    <section className={`relative overflow-hidden min-h-[400px] py-6 ${className}`}>
      {/* Background SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 400"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <path
          d={svgPath || "M0,100 C150,200 350,0 500,100 C650,200 800,100 800,100 L800,400 L0,400 Z"}
          fill={`url(#${gradientId})`}
        />
      </svg>

      {/* Foreground Content */}
      <div className="relative z-10 max-w-10xl mx-auto px-2">
        {children}
      </div>
    </section>
  );
};

export default SectionWithBackground;
