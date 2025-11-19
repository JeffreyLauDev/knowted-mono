import React, { useEffect, useRef, useState } from 'react';

interface EditableTimestampContentProps {
  content: string;
  onEdit: (value: string) => void;
  onTimestampClick: (timestamp: string, e: React.MouseEvent) => void;
  placeholder?: string;
  isSharedMode?: boolean;
}

const EditableTimestampContent = ({
  content,
  onEdit,
  onTimestampClick,
  placeholder,
  isSharedMode = false
}: EditableTimestampContentProps): JSX.Element => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const cleanContent = (text: string): string => {
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      .replace(/^\n+|\n+$/g, '');
  };

  useEffect(() => {
    setEditValue(content || placeholder || '');
  }, [content, placeholder]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on scrollHeight with some padding
      const newHeight = Math.max(textarea.scrollHeight, 60); // Minimum height of 60px
      textarea.style.height = `${Math.min(newHeight, 300)}px`; // Maximum height of 300px
    }
  }, [editValue, isEditing]);

  const handleClick = (): void => {
    if (isSharedMode) {
      return; // Prevent editing in shared mode
    }
    setIsEditing(true);
    // Small delay to ensure state update before focusing
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, 0);
  };

  const handleBlur = (): void => {
    // Small delay to allow for potential focus changes
    setTimeout(() => {
      setIsEditing(false);
      const cleanedValue = cleanContent(editValue);
      if (cleanedValue !== content) {
        onEdit(cleanedValue);
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(content || placeholder || '');
      setIsEditing(false);
    }
  };

  const handleTimestampClick = (e: React.MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('timestamp')) {
      e.preventDefault();
      e.stopPropagation();
      onTimestampClick(target.textContent || '', e);
    }
  };

  // Prevent click event from bubbling when clicking on the content div
  const handleContentClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    handleClick();
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-sm text-black rounded p-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none w-full"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          minHeight: '60px',
          maxHeight: '300px'
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={handleContentClick}
      className={`text-sm text-black whitespace-pre-wrap rounded p-2 -m-2 ${
        isSharedMode ? 'cursor-default' : 'cursor-text hover:bg-gray-50'
      }`}
      style={{
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap'
      }}
    >
      <div onClick={handleTimestampClick}>
        {editValue || placeholder || (isSharedMode ? 'No content' : 'Click to edit...')}
      </div>
    </div>
  );
};

export default EditableTimestampContent;
