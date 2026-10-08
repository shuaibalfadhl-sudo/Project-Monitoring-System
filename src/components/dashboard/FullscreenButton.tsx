'use client';

import { useState, useEffect } from 'react';

export default function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      const container = document.getElementById('hall-of-fame-container');
      
      if (!document.fullscreenElement) {
        if (container) {
          await container.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-bold text-sm shadow-sm"
      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    >
      {isFullscreen ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9L4 4m0 0v4m0-4h4m12 0L15 9m5-5v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m12 0l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Exit Fullscreen
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Fullscreen
        </>
      )}
    </button>
  );
}
