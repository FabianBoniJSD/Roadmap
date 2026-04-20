import clsx from 'clsx';
import React from 'react';
import { getRichTextPlainText, sanitizeRichTextHtml } from '@/utils/richText';

interface RichTextContentProps {
  value?: string | null;
  emptyText?: string;
  className?: string;
  as?: 'div' | 'span';
}

const RichTextContent: React.FC<RichTextContentProps> = ({
  value,
  emptyText,
  className,
  as = 'div',
}) => {
  const Tag = as;
  const plainText = getRichTextPlainText(value);

  if (!plainText) {
    if (!emptyText) return null;
    return <Tag className={className}>{emptyText}</Tag>;
  }

  return (
    <Tag
      className={clsx('rich-text-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }}
    />
  );
};

export default RichTextContent;
