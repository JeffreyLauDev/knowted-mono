import React, { useEffect, useRef, useState } from 'react';

interface ChapterItem {
  time: string;
  title: string;
}

interface ChapterProps {
  time: string;
  title: string;
  onTimeClick: (time: string) => void;
  onTitleChange: (time: string, newTitle: string) => void;
  onDelete?: (time: string) => void;
  onBlur?: (currentChapters: ChapterItem[]) => void;
  currentChapters: ChapterItem[];
}

const Chapter: React.FC<ChapterProps> = ({
  time,
  title,
  onTimeClick,
  onTitleChange,
  onDelete,
  onBlur,
  currentChapters
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only update editTitle if we're not currently editing
    // This prevents the input from being reset while the user is typing
    if (!isEditing) {
      setEditTitle(title);
    }
  }, [title, isEditing]);

  const handleTimeClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onTimeClick(time);
  };

  const handleTitleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditTitle(e.target.value);
  };

  const handleTitleBlur = (): void => {
    if (editTitle.trim() !== title) {
      onTitleChange(time, editTitle.trim());
      // Call the onBlur callback to trigger immediate save with updated chapters
      if (onBlur) {
        // Create updated chapters array with the new title
        const updatedChapters = currentChapters.map((chapter) =>
          chapter.time === time ? { ...chapter, title: editTitle.trim() } : chapter
        );
        onBlur(updatedChapters);
      }
    } else {
      // Even if no change, call onBlur with current chapters
      if (onBlur) {
        onBlur(currentChapters);
      }
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(time);
    }
  };

  return (
    <div
      className="flex items-center hover:bg-gray-50 rounded transition-colors duration-150 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTitleClick}
    >
      {/* Time - Clickable for video player */}
      <button
        onClick={handleTimeClick}
        className="text-left cursor-pointer hover:underline text-sm text-primary py-1 rounded-md font-medium min-w-[60px] mr-4 transition-colors duration-150"
      >
        {time}
      </button>

      {/* Title - Editable on click */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="w-full text-sm text-gray-900 font-normal leading-relaxed bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500 px-1 py-1"
            autoFocus
          />
        ) : (
          <span className="text-sm text-gray-900 font-normal leading-relaxed cursor-text">
            {title}
          </span>
        )}
      </div>

      {/* Delete button - only show on hover */}
      {isHovered && onDelete && (
        <button
          onClick={handleDelete}
          className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors duration-150 opacity-0 group-hover:opacity-100"
          title="Delete chapter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Chapter;
