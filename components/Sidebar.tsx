
import React from 'react';
import { DAYS_IN_MONTH } from '../types';

interface SidebarProps {
  currentDay: number;
  onSelectDay: (day: number) => void;
  eventCounts: Record<number, number>;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentDay, onSelectDay, eventCounts, isOpen, onToggle }) => {
  const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:w-80 md:flex-shrink-0 flex flex-col
        `}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white font-pixel tracking-wide">DAYS LOG</h2>
          <button onClick={onToggle} className="md:hidden text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-5 gap-2">
            {days.map((day) => {
              const count = eventCounts[day] || 0;
              const isActive = currentDay === day;
              
              return (
                <button
                  key={day}
                  onClick={() => {
                    onSelectDay(day);
                    if (window.innerWidth < 768) onToggle();
                  }}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative
                    ${isActive 
                      ? 'bg-[var(--primary)] text-white shadow-lg scale-105 z-10' 
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className={`font-pixel text-xl ${isActive ? 'text-white' : 'text-gray-900 dark:text-gray-200'}`}>{day}</span>
                  {count > 0 && (
                    <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  {count > 0 && !isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full opacity-60"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center font-mono">
          Perpetual Calendar System
        </div>
      </aside>
    </>
  );
};
