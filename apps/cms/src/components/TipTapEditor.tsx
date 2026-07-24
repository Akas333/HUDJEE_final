'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered } from 'lucide-react'

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const TipTapEditor = ({ content, onChange }: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // You can add a custom Math extension here later for LaTeX rendering
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[150px] p-4 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 flex-wrap">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('strike') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default TipTapEditor
