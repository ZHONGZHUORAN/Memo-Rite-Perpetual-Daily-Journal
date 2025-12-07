
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, JournalEvent, ViewMode, DAYS_IN_MONTH } from './types';
import { subscribeToAuth, getEventsForDay, addEvent, updateEvent, deleteEvent, getEventCounts, logout } from './services/firebase';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Printer } from './components/Printer';
import { Note } from './components/Note';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { LayoutGrid, List, ChevronLeft, ChevronRight, Menu, LogOut, Sun, Moon, Palette, ZoomIn, ZoomOut } from 'lucide-react';

// Main Inner Component to use Theme Context
const MainApp: React.FC = () => {
  const { isDarkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [eventCounts, setEventCounts] = useState<Record<number, number>>({});
  const [maxZIndex, setMaxZIndex] = useState(10);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  
  // Define Preset Colors
  const presetColors = [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#a855f7', // Purple
    '#f97316', // Orange
    '#52525b', // Zinc
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

  // Hash Router Logic for Day
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const dayMatch = hash.match(/day=(\d+)/);
      if (dayMatch) {
        const d = parseInt(dayMatch[1], 10);
        if (d >= 1 && d <= DAYS_IN_MONTH) setCurrentDay(d);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update Hash when day changes
  const changeDay = (day: number) => {
    let d = day;
    if (d > DAYS_IN_MONTH) d = 1;
    if (d < 1) d = DAYS_IN_MONTH;
    window.location.hash = `day=${d}`;
  };

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuth((u: any) => {
      setUser(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const data = await getEventsForDay(user.uid, currentDay);
    const sorted = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(sorted);
    
    const counts = await getEventCounts(user.uid);
    setEventCounts(counts);
  }, [user, currentDay]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- Canvas Interaction Logic ---
  
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'board') return;

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const scaleBy = 1.1;
      const newZoom = e.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
      const clampedZoom = Math.min(Math.max(newZoom, 0.2), 3);
      setZoom(clampedZoom);
    } else {
      // Pan with scrollwheel (optional, mostly for touchpad users)
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== 'board') return;
    // Only start panning if clicking directly on the container (background)
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.2));

  // --- End Canvas Logic ---

  const handlePrint = async (text: string) => {
    if (!user) return;
    
    // Calculate position: Center of the Viewport, accounting for Pan and Zoom
    // Screen Center
    const viewportWidth = boardRef.current?.clientWidth || window.innerWidth;
    const viewportHeight = boardRef.current?.clientHeight || window.innerHeight;
    
    // Avoid the very bottom where printer is (roughly bottom 30%)
    const targetScreenX = viewportWidth / 2;
    const targetScreenY = viewportHeight * 0.4; 

    // Convert to Canvas Coordinates
    const canvasX = (targetScreenX - pan.x) / zoom;
    const canvasY = (targetScreenY - pan.y) / zoom;

    // Add some random scatter
    const scatter = 40;
    const finalX = canvasX + (Math.random() * scatter - scatter/2) - 128; // -128 to center the note (width ~256)
    const finalY = canvasY + (Math.random() * scatter - scatter/2);

    const newEvent: Omit<JournalEvent, 'id'> = {
      userId: user.uid,
      day: currentDay,
      text,
      timestamp: new Date().toISOString(),
      position: {
        x: finalX,
        y: finalY
      },
      zIndex: maxZIndex + 1
    };

    setMaxZIndex(prev => prev + 1);

    const savedEvent = await addEvent(user.uid, newEvent);
    setEvents(prev => [savedEvent as JournalEvent, ...prev]);
    setEventCounts(prev => ({ ...prev, [currentDay]: (prev[currentDay] || 0) + 1 }));
  };

  const handleUpdateNote = async (updated: JournalEvent) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    if (user) await updateEvent(user.uid, updated);
  };

  const handleDeleteNote = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (user) await deleteEvent(user.uid, id);
    setEventCounts(prev => ({ ...prev, [currentDay]: Math.max(0, (prev[currentDay] || 1) - 1) }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    const note = events.find(e => e.id === id);
    if (!note) return;

    // Adjust delta by zoom level
    const newPosition = {
      x: note.position.x + (delta.x / zoom),
      y: note.position.y + (delta.y / zoom),
    };

    const updatedNote = { ...note, position: newPosition };
    setEvents(prev => prev.map(e => e.id === id ? updatedNote : e));
    
    if (user) await updateEvent(user.uid, updatedNote);
  };

  const bringToFront = (id: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, zIndex: newZ } : e));
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-pixel text-2xl dark:bg-gray-900 dark:text-white">Loading...</div>;
  if (!user) return <Auth />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#e5e7eb] dark:bg-black transition-colors duration-300">
      <Sidebar 
        currentDay={currentDay}
        onSelectDay={changeDay}
        eventCounts={eventCounts}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Top Navigation */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 z-20 shadow-sm transition-colors duration-300 relative">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded dark:text-white">
              <Menu size={20} />
            </button>
            
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 transition-colors">
              <button onClick={() => changeDay(currentDay - 1)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-shadow hover:shadow-sm dark:text-gray-300">
                <ChevronLeft size={18} />
              </button>
              <div className="px-6 font-pixel text-2xl w-24 text-center dark:text-white">
                {currentDay} <span className="text-sm text-gray-500 dark:text-gray-400 font-sans">th</span>
              </div>
              <button onClick={() => changeDay(currentDay + 1)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-shadow hover:shadow-sm dark:text-gray-300">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg hidden sm:flex">
              <button 
                onClick={() => setViewMode('board')}
                className={`p-2 rounded transition-all ${viewMode === 'board' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Board View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>

            {/* Zoom Controls (Visible only in Board View) */}
            {viewMode === 'board' && (
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg hidden md:flex items-center">
                <button onClick={zoomOut} className="p-2 text-gray-500 hover:text-black dark:hover:text-white" title="Zoom Out">
                  <ZoomOut size={18} />
                </button>
                <span className="text-xs font-mono w-12 text-center text-gray-500 dark:text-gray-400">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} className="p-2 text-gray-500 hover:text-black dark:hover:text-white" title="Zoom In">
                  <ZoomIn size={18} />
                </button>
              </div>
            )}

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block"></div>

            {/* Theme Controls */}
            <div className="relative">
              <button 
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 text-gray-400 hover:text-[var(--primary)] transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Change Theme Color"
              >
                <Palette size={18} />
              </button>
              {showColorPicker && (
                <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 w-64">
                   <div className="text-sm font-medium mb-3 dark:text-gray-300">Theme Color</div>
                   <div className="grid grid-cols-4 gap-3 mb-4">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => { setThemeColor(color); }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-black dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                     <label className="text-xs text-gray-500 dark:text-gray-400">Custom Hex Code</label>
                     <div className="flex gap-2">
                       <input 
                          type="color" 
                          value={themeColor} 
                          onChange={(e) => setThemeColor(e.target.value)} 
                          className="h-9 w-9 p-1 rounded cursor-pointer bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                       />
                       <input 
                          type="text" 
                          value={themeColor} 
                          onChange={(e) => setThemeColor(e.target.value)} 
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white font-mono uppercase"
                       />
                     </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleDarkMode} 
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

            <button onClick={() => logout()} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div 
          className="flex-1 relative overflow-hidden bg-[#e5e7eb] dark:bg-[#1a1a1a] select-none"
          ref={boardRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
             cursor: isPanning ? 'grabbing' : (viewMode === 'board' ? 'grab' : 'default'),
             // Apply dynamic background grid here
             backgroundImage: `radial-gradient(${isDarkMode ? '#374151' : '#d1d5db'} 1px, transparent 1px)`,
             backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
             backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
             
             {viewMode === 'list' ? (
               <div className="absolute inset-0 overflow-y-auto custom-scrollbar" onPointerDown={(e) => e.stopPropagation()}>
                 <div className="max-w-2xl mx-auto py-10 px-4 mb-[300px]"> 
                   {events.length === 0 && (
                     <div className="text-center text-gray-400 mt-20 font-pixel text-xl">
                       No memories recorded for the {currentDay}th yet.
                     </div>
                   )}
                   {events.map(event => (
                      <Note 
                        key={event.id}
                        event={event}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        isBoardView={false}
                        maxZIndex={0}
                        bringToFront={() => {}}
                      />
                   ))}
                 </div>
               </div>
             ) : (
               // Infinite Board View Wrapper
               // We translate this container to simulate pan, but 0,0 is the origin.
               <div 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                  }}
               > 
                  <div className="pointer-events-auto">
                    {events.map(event => (
                      <Note 
                        key={event.id}
                        event={event}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        isBoardView={true}
                        maxZIndex={maxZIndex}
                        bringToFront={() => bringToFront(event.id)}
                        scale={zoom}
                      />
                    ))}
                  </div>
               </div>
             )}
          </DndContext>

        </div>

        {/* Footer Printer Area */}
        <div className="relative z-30 pointer-events-none">
          <div className="absolute bottom-0 w-full flex justify-center pb-6 pt-12 bg-gradient-to-t from-gray-900/10 dark:from-black/50 to-transparent">
             <Printer onPrint={handlePrint} />
          </div>
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
};

export default App;
