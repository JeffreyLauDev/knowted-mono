import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MeetingSummaryDisplay from '../MeetingSummaryDisplay';

// Mock BlockNote components
jest.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    tryParseMarkdownToBlocks: jest.fn().mockResolvedValue([]),
    replaceBlocks: jest.fn(),
    blocksToMarkdownLossy: jest.fn().mockResolvedValue(''),
  }),
}));

jest.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({ editable }: { editable: boolean }) => (
    <div data-testid="block-note-editor" data-editable={editable}>
      Block Note Editor
    </div>
  ),
}));

describe('MeetingSummaryDisplay', () => {
  const defaultProps = {
    summary: 'Test summary content',
    chapters: '00:02 Greetings\n00:18 Introductions\n01:41 Discussion on online ordering',
    onSave: jest.fn(),
    onSaveChapters: jest.fn(),
    onSaveComplete: jest.fn(),
    editable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the summary editor', () => {
    render(<MeetingSummaryDisplay {...defaultProps} />);
    
    expect(screen.getByTestId('block-note-editor')).toBeInTheDocument();
    expect(screen.getByTestId('block-note-editor')).toHaveAttribute('data-editable', 'true');
  });

  it('renders chapters section with editable textarea when editable is true', () => {
    render(<MeetingSummaryDisplay {...defaultProps} />);
    
    expect(screen.getByText('Chapters')).toBeInTheDocument();
    expect(screen.getByText('+ Add Chapter')).toBeInTheDocument();
    
    const textarea = screen.getByPlaceholderText('Add chapters in format: 00:00 Chapter Title (one per line)');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(defaultProps.chapters);
  });

  it('renders chapters as read-only list when editable is false', () => {
    render(<MeetingSummaryDisplay {...defaultProps} editable={false} />);
    
    expect(screen.getByText('Chapters')).toBeInTheDocument();
    expect(screen.queryByText('+ Add Chapter')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add chapters in format: 00:00 Chapter Title (one per line)')).not.toBeInTheDocument();
    
    // Should show parsed chapters
    expect(screen.getByText('00:02')).toBeInTheDocument();
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('00:18')).toBeInTheDocument();
    expect(screen.getByText('Introductions')).toBeInTheDocument();
  });

  it('calls onSaveChapters when chapters text changes', async () => {
    render(<MeetingSummaryDisplay {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add chapters in format: 00:00 Chapter Title (one per line)');
    
    fireEvent.change(textarea, { target: { value: '00:00 New Chapter\n01:00 Another Chapter' } });
    
    await waitFor(() => {
      expect(defaultProps.onSaveChapters).toHaveBeenCalledWith('00:00 New Chapter\n01:00 Another Chapter');
    }, { timeout: 3000 }); // Wait for debounce
  });

  it('adds new chapter when Add Chapter button is clicked', () => {
    render(<MeetingSummaryDisplay {...defaultProps} />);
    
    const addButton = screen.getByText('+ Add Chapter');
    fireEvent.click(addButton);
    
    const textarea = screen.getByPlaceholderText('Add chapters in format: 00:00 Chapter Title (one per line)');
    expect(textarea.value).toContain('00:00 New Chapter');
  });

  it('shows preview when editing chapters', () => {
    render(<MeetingSummaryDisplay {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add chapters in format: 00:00 Chapter Title (one per line)');
    
    // Focus the textarea to start editing
    fireEvent.focus(textarea);
    
    expect(screen.getByText('Preview:')).toBeInTheDocument();
    expect(screen.getByText('00:02')).toBeInTheDocument();
    expect(screen.getByText('Greetings')).toBeInTheDocument();
  });

  it('hides chapters section when no chapters and not editable', () => {
    render(<MeetingSummaryDisplay {...defaultProps} chapters="" editable={false} />);
    
    expect(screen.queryByText('Chapters')).not.toBeInTheDocument();
  });

  it('shows chapters section when no chapters but editable', () => {
    render(<MeetingSummaryDisplay {...defaultProps} chapters="" editable={true} />);
    
    expect(screen.getByText('Chapters')).toBeInTheDocument();
    expect(screen.getByText('+ Add Chapter')).toBeInTheDocument();
  });
});
