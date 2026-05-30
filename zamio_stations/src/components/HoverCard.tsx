import React, { useState, useRef, useEffect } from 'react';

interface HoverCardProps {
  trigger: React.ReactNode;
  content: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const HoverCard: React.FC<HoverCardProps> = ({
  trigger,
  content,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const cardHeight = cardRef.current?.offsetHeight || 200;
      const cardWidth = cardRef.current?.offsetWidth || 250;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - cardHeight - 10;
          left = rect.left + (rect.width / 2) - (cardWidth / 2);
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + (rect.width / 2) - (cardWidth / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (cardHeight / 2);
          left = rect.left - cardWidth - 10;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (cardHeight / 2);
          left = rect.right + 10;
          break;
      }

      // Ensure card stays within viewport
      if (left < 0) left = 10;
      if (top < 0) top = 10;
      if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 10;
      if (top + cardHeight > window.innerHeight) top = window.innerHeight - cardHeight - 10;

      setCoords({ top, left });
      setIsVisible(true);
      setIsAnimating(true);
    }
  };

  const handleMouseLeave = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 200); // Delay hide for smooth exit
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isVisible && (
        <div
          ref={cardRef}
          className={`fixed z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 p-4 transition-all duration-200 ease-out transform ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
          style={{
            top: coords.top,
            left: coords.left,
            transform: 'translate(0, 0)', // Prevent jitter
          }}
        >
          <div className="space-y-2">
            {content.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                {item.icon && (
                  <div className="w-5 h-5 text-gray-600 dark:text-gray-400">
                    {item.icon}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Arrow pointer */}
          <div
            className={`absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
              position === 'top' ? 'border-t-white/90 dark:border-t-slate-900/90 top-full -mt-1 left-1/2 transform -translate-x-1/2' :
              position === 'bottom' ? 'border-b-white/90 dark:border-b-slate-900/90 bottom-full -mb-1 left-1/2 transform -translate-x-1/2' :
              position === 'left' ? 'border-l-white/90 dark:border-l-slate-900/90 left-full -ml-1 top-1/2 transform -translate-y-1/2' :
              'border-r-white/90 dark:border-r-slate-900/90 right-full -mr-1 top-1/2 transform -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default HoverCard;
