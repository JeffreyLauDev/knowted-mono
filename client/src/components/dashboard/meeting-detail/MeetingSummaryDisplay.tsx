
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MeetingSummaryDisplayProps {
  summary: string;
  onSave?: (content: string) => void | Promise<void>;
  onSaveComplete?: () => void;
  editable?: boolean;
  isSharedMode?: boolean;
}

const MeetingSummaryDisplay: React.FC<MeetingSummaryDisplayProps> = ({
  summary,
  onSave,
  onSaveComplete,
  editable = true,
  isSharedMode = false
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedBriefly, setShowSavedBriefly] = useState(false);
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  const editorRef = useRef<unknown>(null);
  const hasInitializedRef = useRef(false);

  // Creates a new editor instance
  const editor = useCreateBlockNote();

  // Store editor reference
  useEffect((): void => {
    editorRef.current = editor;
  }, [editor]);

  // Load initial content ONLY ONCE when component mounts
  useEffect(() => {
    if (!hasInitializedRef.current && summary && editor) {
      hasInitializedRef.current = true;
      editor.tryParseMarkdownToBlocks(summary).then((blocks) => {
        editor.replaceBlocks(editor.document, blocks);
      }).catch(() => {
        // Silently handle parsing errors
      });
    }
  }, [editor, summary]);

  // Create debounced save function that doesn't interfere with typing
  useEffect((): (() => void) => {
    if (onSave) {
      debouncedSaveRef.current = debounce(async (content: string) => {
        setIsSaving(true);
        try {
          const result = onSave(content);
          if (result instanceof Promise) {
            await result;
          }
          // Show brief "saved" indicator
          setShowSavedBriefly(true);
          setTimeout(() => setShowSavedBriefly(false), 1500);
          // Notify parent that saving is complete
          if (onSaveComplete) {
            onSaveComplete();
          }
        } catch (error) {
          console.error('Failed to save:', error);
        } finally {
          setIsSaving(false);
        }
      }, 2000); // Increased debounce to 2 seconds to be less intrusive
    }

    return (): void => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel();
      }
    };
  }, [onSave, onSaveComplete]);

  // Handle content changes - ONLY trigger save, never modify editor state
  const onChange = useCallback((): void => {
    if (editable && debouncedSaveRef.current) {
      // Get current content and save it
      editor.blocksToMarkdownLossy(editor.document).then((markdown) => {
        if (debouncedSaveRef.current) {
          debouncedSaveRef.current(markdown);
        }
      }).catch(() => {
        // Silently handle any errors in markdown conversion
      });
    }
  }, [editable, editor]);

  // Save on blur (when editor loses focus)
  const onBlur = useCallback(async (): Promise<void> => {
    if (editable && debouncedSaveRef.current) {
      // Cancel any pending debounced save and save immediately
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel();
      }

      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      if (onSave) {
        setIsSaving(true);
        try {
          const result = onSave(markdown);
          if (result instanceof Promise) {
            await result;
          }
          if (onSaveComplete) {
            onSaveComplete();
          }
        } catch (error) {
          console.error('Failed to save on blur:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }
  }, [editable, editor, onSave, onSaveComplete]);


  return (
    <div className="mx-auto p-0 font-sans leading-relaxed text-gray-800 bg-white">
      {/* Main Content Section */}
      <div className="my-4">
        <div className="relative">
          {/* BlockNote Editor Container */}
          <div className="my-2">
            <BlockNoteView
              editor={editor}
              onChange={onChange}
              onBlur={onBlur}
              editable={editable && !isSharedMode}
              theme="light"
            />
            {(!editable || isSharedMode) && (
              <div>

              </div>
            )}
            {/* Save status indicator */}
            {editable && !isSharedMode && (isSaving || showSavedBriefly) && (
              <div className="mt-2 px-2 py-1 rounded text-xs font-normal flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity duration-200">
                {isSaving && (
                  <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded border border-blue-500 animate-pulse">Saving changes...</span>
                )}
                {!isSaving && showSavedBriefly && (
                  <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded border border-emerald-500 animate-in fade-in duration-300">✓ Auto-saved</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingSummaryDisplay;
