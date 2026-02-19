import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pullQuote: {
      setPullQuote: () => ReturnType;
      togglePullQuote: () => ReturnType;
      unsetPullQuote: () => ReturnType;
    };
  }
}

export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "blockquote.pull-quote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { class: "pull-quote" }),
      0,
    ];
  },

  addCommands() {
    return {
      setPullQuote:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
      togglePullQuote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      unsetPullQuote:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
