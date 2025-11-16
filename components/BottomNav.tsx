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
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-brand-border z-50">
      <div className="container mx-auto flex justify-around max-w-lg">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 ${
              activeScreen === item.id ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-light'
            }`}
          >
            <div className="w-6 h-6">{item.icon}</div>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
