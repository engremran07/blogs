import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "success" | "error";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (el) => {
          if (el.classList.contains("callout-warning")) return "warning";
          if (el.classList.contains("callout-success")) return "success";
          if (el.classList.contains("callout-error")) return "error";
          return "info";
        },
        renderHTML: (attrs) => ({ class: `callout callout-${attrs.type}` }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div.callout" },
      { tag: "div.callout-info" },
      { tag: "div.callout-warning" },
      { tag: "div.callout-success" },
      { tag: "div.callout-error" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `callout callout-${node.attrs.type}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
