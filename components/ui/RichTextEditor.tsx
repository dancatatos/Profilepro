"use client";

import type { ReactNode } from "react";
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RichTextNode } from "@/types";

/* A deliberately constrained extension set — no font family, no arbitrary
   colours or sizes, so text stays on-brand and the stored JSON is safe. */
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    blockquote: false,
    codeBlock: false,
    code: false,
    strike: false,
    horizontalRule: false,
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
];

function TBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      /* preventDefault keeps the editor selection while clicking the toolbar */
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-electric-500/20 text-electric-300"
          : "text-white/55 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const divider = <span className="mx-0.5 h-5 w-px self-center bg-white/10" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 p-1.5">
      <TBtn
        label="Body text"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        Body
      </TBtn>
      <TBtn
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        Heading
      </TBtn>
      <TBtn
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        Subhead
      </TBtn>
      {divider}
      <TBtn
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        label="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </TBtn>
      {divider}
      <TBtn
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </TBtn>
      {divider}
      <TBtn
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </TBtn>
    </div>
  );
}

/**
 * Constrained rich-text editor. The toolbar exposes only emphasis, lists,
 * alignment and size *tiers* — no font family, colour picker or px sizes.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: RichTextNode;
  onChange: (doc: RichTextNode) => void;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value as JSONContent,
    immediatelyRender: false,
    editorProps: { attributes: { class: "rt-content" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextNode),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
