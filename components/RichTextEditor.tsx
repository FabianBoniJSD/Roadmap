import clsx from 'clsx';
import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';

const ReactQuill = dynamic(async () => (await import('react-quill')).default, {
  ssr: false,
  loading: () => <div className="rich-text-editor-loading">Editor wird geladen…</div>,
});

const toolbarOptions = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['clean'],
];

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'blockquote',
  'link',
];

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  className,
}) => {
  const modules = useMemo(
    () => ({
      toolbar: toolbarOptions,
      history: {
        delay: 400,
        maxStack: 100,
        userOnly: true,
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  return (
    <div
      className={clsx(
        'rich-text-editor-shell',
        error && 'rich-text-editor-shell-error',
        disabled && 'rich-text-editor-shell-disabled',
        className
      )}
    >
      <ReactQuill
        id={id}
        theme="snow"
        value={value}
        onChange={(nextValue: string) => {
          onChange(nextValue === '<p><br></p>' ? '' : nextValue);
        }}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
      />
    </div>
  );
};

export default RichTextEditor;
