import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    styledSeparator: {
      setStyledSeparator: () => ReturnType;
    };
  }
}

export const StyledSeparator = Node.create({
  name: "styledSeparator",
  group: "block",
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "hr.styled-separator" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "hr",
      mergeAttributes(HTMLAttributes, { class: "styled-separator" }),
    ];
  },

  addCommands() {
    return {
      setStyledSeparator:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .run(),
    };
  },
});
