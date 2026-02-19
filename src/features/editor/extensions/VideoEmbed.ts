import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attrs: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: "" },
      width: { default: "100%" },
      height: { default: "auto" },
      frameborder: { default: "0" },
      allowfullscreen: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.video-wrapper",
        getAttrs: (el) => {
          const iframe = (el as HTMLElement).querySelector("iframe");
          if (!iframe) return false;
          return {
            src: iframe.getAttribute("src"),
            title: iframe.getAttribute("title") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "video-wrapper" }),
      [
        "iframe",
        {
          src: node.attrs.src,
          title: node.attrs.title || "",
          frameborder: "0",
          allowfullscreen: "true",
          loading: "lazy",
          style: "position:absolute;top:0;left:0;width:100%;height:100%",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs })
            .run(),
    };
  },
});
