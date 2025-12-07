
import React, { useState, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { JournalEvent } from '../types';
import { Clock, Trash2, Edit2, Check, X } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';

interface NoteProps {
  event: JournalEvent;
  onUpdate: (updated: JournalEvent) => void;
  onDelete: (id: string) => void;
  isBoardView: boolean;
  maxZIndex: number;
  bringToFront: () => void;
  scale?: number; // Add scale prop for board view
}

export const Note: React.FC<NoteProps> = ({ event, onUpdate, onDelete, isBoardView, maxZIndex, bringToFront, scale = 1 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(event.text);
  const [editTime, setEditTime] = useState(event.timestamp);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled: isEditing || !isBoardView, // Disable drag when editing
    data: { id: event.id }
  });

  // Adjust transform based on scale to keep cursor synced with note
  const adjustedTransform = transform ? {
    ...transform,
    x: transform.x / scale,
    y: transform.y / scale,
  } : null;

  const style = isBoardView ? {
    transform: CSS.Translate.toString(adjustedTransform),
    left: `${event.position.x}px`,
    top: `${event.position.y}px`,
    zIndex: event.zIndex || 1,
    position: 'absolute' as const,
  } : {};

  const handleSave = () => {
    onUpdate({
      ...event,
      text: editText,
      timestamp: editTime
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(event.text);
    setEditTime(event.timestamp);
    setIsEditing(false);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Generate a random slight rotation for natural look in board view
  const randomRotation = useRef(Math.random() * 4 - 2).current;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        rotate: isBoardView && !isDragging ? `${randomRotation}deg` : '0deg',
      }}
      className={`
        group relative w-64 bg-[#fdf6e3] dark:bg-zinc-700 text-gray-800 dark:text-gray-100 shadow-md transition-shadow
        ${isBoardView ? 'cursor-grab active:cursor-grabbing' : 'w-full mb-4'}
        ${isDragging ? 'shadow-2xl scale-105 z-50' : 'hover:shadow-xl'}
      `}
      {...listeners}
      {...attributes}
      onMouseDown={() => {
        if (isBoardView) bringToFront();
      }}
    >
      {/* Content Area */}
      <div className="p-4 pb-8 border-t-4 border-[var(--primary)]/20">
        
        {/* Header: Date & Actions */}
        <div className="flex justify-between items-start mb-2 opacity-60 text-xs font-mono border-b border-dashed border-gray-300 dark:border-gray-500 pb-1">
          {isEditing ? (
            <input
              type="datetime-local"
              value={editTime.substring(0, 16)} 
              onChange={(e) => setEditTime(e.target.value)}
              className="bg-white dark:bg-zinc-800 border px-1 rounded w-full text-black dark:text-white"
            />
          ) : (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDate(event.timestamp)}
            </span>
          )}
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
              <>
                 <button onClick={handleSave} className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900 p-1 rounded">
                  <Check size={12} />
                 </button>
                 <button onClick={handleCancel} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-1 rounded">
                  <X size={12} />
                 </button>
              </>
            ) : (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                  className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-1 rounded"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} 
                  className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-1 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Text Content */}
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-24 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-600 p-1 resize-none focus:outline-none font-medium text-black dark:text-white"
            autoFocus
          />
        ) : (
          <p className="font-pixel text-lg leading-tight whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
            {event.text}
          </p>
        )}
      </div>

      {/* Torn Edge Effect - color must match bg */}
      <div className="absolute bottom-[-10px] left-0 w-full h-[10px] torn-paper-bottom bg-[#fdf6e3] dark:bg-zinc-700"></div>
    </div>
  );
};
