"use client";

import { useTheme } from "next-themes";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  markdownShortcutPlugin,
  maxLengthPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  InsertTable,
  InsertThematicBreak,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { MAX_BODY_LEN } from "@/lib/announcement/validation";

type Props = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
};

function Toolbar() {
  return (
    <>
      <UndoRedo />
      <BlockTypeSelect />
      <BoldItalicUnderlineToggles />
      <CreateLink />
      <ListsToggle />
      <InsertTable />
      <InsertThematicBreak />
    </>
  );
}

export default function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="rounded-lg border border-input overflow-hidden min-w-0 [&_.mdxeditor]:text-sm">
      <MDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        className={resolvedTheme === "dark" ? "dark-theme" : undefined}
        contentEditableClassName="min-h-28 max-h-96 overflow-y-auto px-3 py-2 prose prose-sm dark:prose-invert max-w-none"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          markdownShortcutPlugin(),
          maxLengthPlugin(MAX_BODY_LEN),
          toolbarPlugin({ toolbarContents: () => <Toolbar /> }),
        ]}
      />
    </div>
  );
}
