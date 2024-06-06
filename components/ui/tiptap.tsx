import React from 'react';
import {
  FontBoldIcon,
  FontItalicIcon,
  ListBulletIcon,
  ResetIcon,
  StrikethroughIcon,
} from '@radix-ui/react-icons';
import { Editor, EditorContent } from '@tiptap/react';

import { Toggle } from '@/components/ui/toggle';

interface Props {
  editor: Editor | null;
}

export const Tiptap = ({ editor }: Props) => {
  return (
    <div className="relative mt-4">
      <div className="rounded-t-base flex items-center justify-between border p-1">
        <div className="flex items-center justify-center gap-1">
          <Toggle
            pressed={editor?.isActive('bold')}
            onPressedChange={() => editor?.chain().focus().toggleBold().run()}
          >
            <FontBoldIcon className="size-4" />
          </Toggle>
          <Toggle
            pressed={editor?.isActive('italic')}
            onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
          >
            <FontItalicIcon className="size-4" />
          </Toggle>
          <Toggle
            pressed={editor?.isActive('strike')}
            onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
          >
            <StrikethroughIcon className="size-4" />
          </Toggle>
          <Toggle
            pressed={editor?.isActive('bulletList')}
            onPressedChange={() =>
              editor?.chain().focus().toggleBulletList().run()
            }
          >
            <ListBulletIcon className="size-4" />
          </Toggle>
        </div>
        <div className="flex items-center justify-center">
          <Toggle
            pressed={false}
            onPressedChange={() => editor?.chain().focus().undo().run()}
          >
            <ResetIcon className="size-4" />
          </Toggle>
          <Toggle
            pressed={false}
            onPressedChange={() => editor?.chain().focus().redo().run()}
          >
            <ResetIcon className="size-4 -scale-x-100" />
          </Toggle>
        </div>
      </div>
      <EditorContent
        placeholder="Enter your message"
        className="rounded-base font-base rounded-t-none border border-t-0 text-sm"
        editor={editor}
      />
    </div>
  );
};
