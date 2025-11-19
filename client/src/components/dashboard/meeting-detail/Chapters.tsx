import React, { useRef, useState } from 'react';
import Chapter from './Chapter';

interface ChapterItem {
  time: string;
  title: string;
}

interface ChaptersProps {
  chapters: ChapterItem[];
  onTimeClick: (time: string) => void;
  onChaptersChange: (chapters: ChapterItem[]) => void;
  onChaptersBlur?: (currentChapters: ChapterItem[]) => void;
  editable?: boolean;
}

const Chapters: React.FC<ChaptersProps> = ({
  chapters,
  onTimeClick,
  onChaptersChange,
  onChaptersBlur,
  editable = true
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newChapter, setNewChapter] = useState({ time: '', title: '' });
  const timeInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (time: string, newTitle: string): void => {
    const updatedChapters = chapters.map((chapter) =>
      chapter.time === time ? { ...chapter, title: newTitle } : chapter
    );
    onChaptersChange(sortChaptersByTime(updatedChapters));
  };

  const handleDelete = (time: string): void => {
    const updatedChapters = chapters.filter((chapter) => chapter.time !== time);
    onChaptersChange(sortChaptersByTime(updatedChapters));
  };

  const sortChaptersByTime = (chaptersToSort: ChapterItem[]): ChapterItem[] => {
    return [...chaptersToSort].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
  };

  const handleAddChapter = (): void => {
    if (newChapter.time && newChapter.title) {
      const updatedChapters = sortChaptersByTime([...chapters, { ...newChapter }]);
      onChaptersChange(updatedChapters);
      setNewChapter({ time: '', title: '' });
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleAddChapter();
    } else if (e.key === 'Escape') {
      setNewChapter({ time: '', title: '' });
      setIsAdding(false);
    }
  };

  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-9]|[0-5][0-9]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  const formatTimeInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatTimeInput(e.target.value);
    setNewChapter((prev) => ({ ...prev, time: formatted }));
  };

  return (
    <div >
      {/* Existing chapters */}
      {chapters.map((chapter, index) => (
        <Chapter
          key={`${chapter.time}-${index}`}
          time={chapter.time}
          title={chapter.title}
          onTimeClick={onTimeClick}
          onTitleChange={handleTitleChange}
          onDelete={editable ? handleDelete : undefined}
          onBlur={onChaptersBlur}
          currentChapters={chapters}
        />
      ))}

      {/* Add new chapter form */}
      {editable && (
        <>
          {isAdding ? (
            <div className="flex items-center py-2 px-3 border-2 border-dashed border-emerald-200 rounded-lg bg-emerald-50">
              <input
                ref={timeInputRef}
                type="text"
                value={newChapter.time}
                onChange={handleTimeInputChange}
                placeholder="00:00"
                className="font-mono text-sm text-emerald-600 bg-white px-3 py-1 rounded-md font-medium min-w-[60px] text-center mr-4 border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={5}
              />
              <input
                ref={titleInputRef}
                type="text"
                value={newChapter.title}
                onChange={(e) => setNewChapter((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Chapter title"
                className="flex-1 text-sm text-gray-900 font-normal leading-relaxed bg-white border border-emerald-200 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                onKeyDown={handleAddKeyDown}
              />
              <div className="ml-2 flex gap-2">
                <button
                  onClick={handleAddChapter}
                  disabled={!newChapter.time || !newChapter.title || !validateTimeFormat(newChapter.time)}
                  className="px-3 py-1 text-sm text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewChapter({ time: '', title: '' });
                    setIsAdding(false);
                  }}
                  className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsAdding(true);
                setTimeout(() => timeInputRef.current?.focus(), 0);
              }}
              className="w-full py-3 px-3 text-emerald-600 border-2 border-dashed border-emerald-300 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors duration-150 text-sm font-medium"
            >
              + Add Chapter
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Chapters;
