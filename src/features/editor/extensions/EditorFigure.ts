import { Node, mergeAttributes } from "@tiptap/core";

export type ImageAlign = "left" | "center" | "right" | "full";
export type ImageSize = "small" | "medium" | "large" | "full";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    editorFigure: {
      setFigure: (attrs: {
        src: string;
        alt?: string;
        caption?: string;
        align?: ImageAlign;
        size?: ImageSize;
      }) => ReturnType;
    };
  }
}

export const EditorFigure = Node.create({
  name: "editorFigure",
  group: "block",
  content: "inline*",
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      align: {
        default: "center",
        parseHTML: (el) => {
          if (el.classList.contains("img-align-left")) return "left";
          if (el.classList.contains("img-align-right")) return "right";
          if (el.classList.contains("img-align-full")) return "full";
          return "center";
        },
      },
      size: {
        default: "large",
        parseHTML: (el) => {
          if (el.classList.contains("img-small")) return "small";
          if (el.classList.contains("img-medium")) return "medium";
          if (el.classList.contains("img-full")) return "full";
          return "large";
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure.editor-figure" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.align as ImageAlign;
    const size = node.attrs.size as ImageSize;
    const classes = [
      "editor-figure",
      `img-align-${align}`,
      `img-${size}`,
    ].join(" ");

    return [
      "figure",
      mergeAttributes(HTMLAttributes, { class: classes }),
      [
        "img",
        {
          src: node.attrs.src,
          alt: node.attrs.alt || "",
          loading: "lazy",
        },
      ],
      ["figcaption", {}, node.attrs.caption || ""],
    ];
  },

  addCommands() {
    return {
      setFigure:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run(),
    };
  },
});
