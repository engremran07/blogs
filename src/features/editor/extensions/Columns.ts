import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: () => ReturnType;
    };
  }
}

const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  isolating: true,

  parseHTML() {
    return [{ tag: "div.editor-column" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "editor-column" }),
      0,
    ];
  },
});

const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2}",
  isolating: true,

  parseHTML() {
    return [{ tag: "div.editor-columns" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "editor-columns" }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumns:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: [
                { type: "column", content: [{ type: "paragraph" }] },
                { type: "column", content: [{ type: "paragraph" }] },
              ],
            })
            .run(),
    };
  },
});

export { Columns, Column };
