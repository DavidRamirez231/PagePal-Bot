
import React from 'react';
import type { Screen } from '../types';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  items: NavItem[];
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ items, activeScreen, setActiveScreen }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] pb-safe">
        {/* Advanced Glassmorphism Background - updated to use brand-surface for light mode support */}
        <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-2xl border-t border-brand-border shadow-[0_-5px_20px_rgba(0,0,0,0.1)]"></div>
        
        <div className="flex justify-around items-center relative z-10 h-[3.5rem] md:h-[4rem]">
        {items.map((item) => {
            const isActive = activeScreen === item.id;
            return (
                <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`group flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90`}
                >
                {/* Icon Container with Glow on Active */}
                <div className={`relative p-1.5 rounded-xl transition-all duration-500 ${isActive ? 'bg-brand-primary/10' : ''}`}>
                    <div className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-brand-primary scale-110 drop-shadow-[0_0_8px_rgba(var(--color-brand-primary),0.4)]' : 'text-brand-secondary group-hover:text-brand-light'}`}>
                        {item.icon}
                    </div>
                </div>
                
                {/* Label: Visible on active OR on group hover */}
                <span className={`text-[10px] font-semibold mt-0.5 transition-all duration-300 ${isActive ? 'text-brand-primary translate-y-0 opacity-100' : 'text-brand-secondary translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                    {item.label}
                </span>
                </button>
            )
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
