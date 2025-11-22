import React, { useState } from 'react';
import { BosphorusScene } from './components/BosphorusScene';
import { SceneMode } from './types';
import { Github, Sun, Moon, MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<SceneMode>(SceneMode.DAY);
  const [showInfo, setShowInfo] = useState(true);

  const toggleMode = () => {
    setMode(prev => prev === SceneMode.DAY ? SceneMode.NIGHT : SceneMode.DAY);
  };

  return (
    <div className="relative w-full h-screen bg-slate-900">
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <BosphorusScene mode={mode} />
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl text-white max-w-xs">
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Voxel Istanbul</h1>
            <p className="text-blue-200 text-sm font-medium mb-2">Bosphorus Strait Simulation</p>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <MapPin size={12} />
              <span>41.0082° N, 28.9784° E</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={toggleMode}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-white/20 transition-all text-white shadow-lg group"
              title={mode === SceneMode.DAY ? "Switch to Night" : "Switch to Day"}
            >
              {mode === SceneMode.DAY ? (
                <Moon size={20} className="group-hover:text-yellow-300 transition-colors" />
              ) : (
                <Sun size={20} className="group-hover:text-orange-400 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-center pointer-events-auto">
           <button 
             onClick={() => setShowInfo(!showInfo)}
             className={`
               bg-black/30 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-full 
               transition-all hover:bg-black/50 text-sm font-medium
               ${showInfo ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4'}
             `}
           >
             {showInfo ? "Interactive 3D Scene • Drag to Rotate • Scroll to Zoom" : "Show Controls"}
           </button>
        </div>
      </div>

      {/* Labels Overlay (Static for demo) */}
      {showInfo && (
        <>
          <div className="absolute top-1/2 left-10 pointer-events-none text-white/80 text-sm font-bold tracking-widest -rotate-90 origin-left">
            EUROPE
          </div>
          <div className="absolute top-1/2 right-10 pointer-events-none text-white/80 text-sm font-bold tracking-widest rotate-90 origin-right">
            ASIA
          </div>
        </>
      )}
    </div>
  );
};

export default App;
