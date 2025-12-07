
import React, { useState } from 'react';

interface PrinterProps {
  onPrint: (text: string) => void;
}

export const Printer: React.FC<PrinterProps> = ({ onPrint }) => {
  const [input, setInput] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    setIsPrinting(true);
    
    // Animate and then actual submit
    setTimeout(() => {
      onPrint(input);
      setInput('');
      setIsPrinting(false);
    }, 800); // 800ms animation duration
  };

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000 select-none pointer-events-auto">
      {/* 3D Wrapper */}
      <div 
        className="relative bg-[var(--primary)] rounded-3xl p-6 pb-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-transform"
        style={{
             borderBottom: '8px solid rgba(0,0,0,0.3)', // Darker shade of primary
        }}
      >
        
        {/* Branding */}
        <div className="flex justify-between items-center mb-4 text-black/40">
           <div className="flex gap-2">
             <div className="w-2 h-8 bg-black/20 rounded-full"></div>
             <div className="w-2 h-8 bg-black/20 rounded-full"></div>
           </div>
           <div className="bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#333] shadow-inner">
             <span className="text-green-500 font-pixel tracking-widest text-xs uppercase glow-text">MEMO-RITE</span>
           </div>
           <div className="flex gap-2">
             <div className="w-2 h-8 bg-black/20 rounded-full"></div>
             <div className="w-2 h-8 bg-black/20 rounded-full"></div>
           </div>
        </div>

        {/* Paper Slot / Screen Area */}
        <div className="relative bg-[#111] rounded-lg p-1 border-4 border-[#333] shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* The "Screen" that accepts input */}
          <div className="relative min-h-[100px] bg-[#1a1a1a] rounded flex flex-col justify-between p-3">
             <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type here..."
                className="w-full bg-transparent text-gray-200 font-pixel text-xl resize-none outline-none placeholder-gray-600 h-20"
             />
             <div className="h-2 w-4 bg-green-500 animate-pulse self-end mt-1"></div>
          </div>
          
          {/* Printing Animation Overlay */}
          <div 
            className={`absolute top-0 left-0 w-full h-full bg-[#fdf6e3] dark:bg-gray-300 transition-transform duration-700 ease-in-out z-10 flex items-center justify-center
              ${isPrinting ? 'translate-y-0' : 'translate-y-full'}
            `}
          >
            <span className="font-pixel text-gray-400">Printing...</span>
          </div>
        </div>

        {/* Control Panel */}
        <div className="mt-6 flex items-center justify-between gap-4">
           
           <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center shadow-[0_4px_0_#000] active:shadow-none active:translate-y-[4px] cursor-pointer transition-all border border-gray-700" onClick={() => setInput('')}>
              <div className="text-red-500 font-bold text-lg">✕</div>
           </div>

           {/* Main Print Button */}
           <button 
             onClick={() => handleSubmit()}
             disabled={isPrinting}
             className="flex-1 h-14 bg-[#1a1a1a] rounded-xl flex items-center justify-center gap-3 shadow-[0_6px_0_#000] active:shadow-none active:translate-y-[6px] transition-all border-2 border-gray-800 hover:border-gray-600 group"
           >
             <span className="text-white font-pixel text-2xl tracking-widest group-hover:text-green-400 transition-colors">PRINT</span>
             <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
           </button>
        </div>
      </div>
      
      {/* Printer Shadow on Desk */}
      <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/20 blur-xl rounded-full"></div>
    </div>
  );
};
