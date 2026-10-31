"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import clsx from "clsx";
import { cleanPastedHtml } from "@/lib/word-paste";

/**
 * Tiptap editor for editorials, full texts, pages and policies. The HTML goes
 * into a hidden input so it posts with the surrounding form; the server
 * sanitises it again before saving (item 79). Pasting from Word is cleaned.
 *
 * The visual editor only knows paragraphs, headings, lists, quotations,
 * emphasis and links. Text with tables, footnotes, sidenotes or [TO CONFIRM]
 * marks opens in HTML mode instead, so saving never drops that markup.
 */

/** Markup the visual editor would silently remove. */
export function needsHtmlMode(html: string): boolean {
  return /<(table|figure|img|span|mark|sup|sub|abbr|cite|q|small|code|h4)\b|\sclass=|<li\b[^>]*\sid=/i.test(html);
}
export function RichTextEditor({
  name,
  initialHtml,
  label,
  placeholder = "Start writing, or paste from Word…",
  onChange,
  minHeight,
}: {
  name: string;
  initialHtml: string;
  label: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  minHeight?: string;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [mode, setMode] = useState<"visual" | "html">(needsHtmlMode(initialHtml) ? "html" : "visual");
  const update = (next: string) => {
    setHtml(next);
    onChange?.(next);
  };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editorProps: {
      transformPastedHTML: cleanPastedHtml,
      attributes: {
        class: "prose-jhts font-reading text-[1rem] leading-relaxed",
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => update(e.isEmpty ? "" : e.getHTML()),
  });

  const toVisual = () => {
    editor?.commands.setContent(html, { emitUpdate: false });
    update(editor && !editor.isEmpty ? editor.getHTML() : "");
    setMode("visual");
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="admin-label">{label}</span>
        <div
          role="group"
          aria-label={`${label}: editing mode`}
          className="border-rule flex rounded-[2px] border text-[0.76rem]"
        >
          {mode === "html" && needsHtmlMode(html) ? (
            <ConfirmDialog
              title="Switch to the visual editor?"
              description="This text has tables, footnotes, sidenotes or [TO CONFIRM] marks that the visual editor can’t keep. They will be removed when you save."
              confirmLabel="Switch and remove them"
              tone="danger"
              trigger={
                <button type="button" className="text-muted hover:text-fg px-2 py-0.5">
                  Visual
                </button>
              }
              onConfirm={toVisual}
            />
          ) : (
            <button
              type="button"
              aria-pressed={mode === "visual"}
              onClick={() => (mode === "html" ? toVisual() : undefined)}
              className={clsx("px-2 py-0.5", mode === "visual" ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              Visual
            </button>
          )}
          <button
            type="button"
            aria-pressed={mode === "html"}
            onClick={() => setMode("html")}
            className={clsx("px-2 py-0.5", mode === "html" ? "bg-fg text-bg" : "text-muted hover:text-fg")}
          >
            HTML
          </button>
        </div>
      </div>
      {mode === "html" ? (
        <>
          <textarea
            aria-label={label}
            value={html}
            onChange={(e) => update(e.target.value)}
            spellCheck={false}
            className="admin-input min-h-[18rem] font-mono text-[0.8rem] leading-relaxed"
            style={minHeight ? { minHeight } : undefined}
          />
          {needsHtmlMode(html) && (
            <p className="text-muted mt-1 text-[0.78rem]">
              HTML mode: this text has tables, notes or [TO CONFIRM] marks that the visual editor can’t keep. Unsafe
              markup is removed when you save.
            </p>
          )}
        </>
      ) : null}
      <div
        className={clsx("editor-surface border-rule bg-bg mt-1.5 rounded-[2px] border", mode === "html" && "hidden")}
      >
        {editor && <Toolbar editor={editor} />}
        <div style={minHeight ? { minHeight } : undefined}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const buttons: { label: string; text: string; active?: boolean; disabled?: boolean; run: () => void }[] = [
    { label: "Bold", text: "B", active: state.bold, run: () => chain().toggleBold().run() },
    { label: "Italic", text: "I", active: state.italic, run: () => chain().toggleItalic().run() },
    { label: "Heading", text: "H2", active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", text: "H3", active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { label: "Bulleted list", text: "•", active: state.ul, run: () => chain().toggleBulletList().run() },
    { label: "Numbered list", text: "1.", active: state.ol, run: () => chain().toggleOrderedList().run() },
    { label: "Quotation", text: "“”", active: state.quote, run: () => chain().toggleBlockquote().run() },
    {
      label: state.link ? "Remove link" : "Add link",
      text: "↗",
      active: state.link,
      run: () => {
        if (state.link) return chain().unsetLink().run();
        const href = window.prompt("Link address (https://…)");
        if (href && /^(https?:\/\/|mailto:|\/)/.test(href)) chain().extendMarkRange("link").setLink({ href }).run();
      },
    },
    { label: "Undo", text: "↶", disabled: !state.canUndo, run: () => chain().undo().run() },
    { label: "Redo", text: "↷", disabled: !state.canRedo, run: () => chain().redo().run() },
  ];
  return (
    <div role="toolbar" aria-label="Formatting" className="border-rule flex flex-wrap gap-0.5 border-b px-2 py-1.5">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          title={b.label}
          // Visible letters such as "H2" stay in the name (WCAG 2.5.3, label in name).
          aria-label={b.text.length > 1 && /[a-z0-9]/i.test(b.text) ? `${b.text} ${b.label}` : b.label}
          aria-pressed={b.active ?? undefined}
          disabled={b.disabled}
          onClick={b.run}
          className={clsx(
            "min-w-8 rounded-[2px] px-2 py-1 text-[0.85rem] transition-colors disabled:opacity-40",
            b.active ? "bg-fg text-bg" : "text-muted hover:bg-surface hover:text-fg",
            b.text === "B" && "font-bold",
            b.text === "I" && "font-reading italic",
          )}
        >
          {b.text}
        </button>
      ))}
    </div>
  );
}
