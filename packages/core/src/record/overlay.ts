type OverlayWindow = Window & {
  __reeldiff?: { show(): void; hide(): void; caption(text: string | null): void };
};

export function installOverlay(mask: string) {
  const w = window as OverlayWindow;

  const maskSheet = new CSSStyleSheet();
  maskSheet.replaceSync(`${mask} { filter: blur(8px) !important; }`);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, maskSheet];

  let root: HTMLElement | null = null;
  let caption: HTMLElement | null = null;
  let captionText: string | null = null;

  const build = () => {
    root = document.createElement("reeldiff-overlay");
    const shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
      .caption { position: absolute; left: 50%; bottom: 40px; translate: -50% 8px; max-width: min(720px, calc(100% - 64px)); padding: 12px 18px; border-radius: 14px; background: rgb(23 23 23 / .92); color: #fff; font: 500 20px/1.35 ui-sans-serif, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity 200ms cubic-bezier(.23,1,.32,1), translate 200ms cubic-bezier(.23,1,.32,1); }
      .caption.on { opacity: 1; translate: -50% 0; }
    </style>
    <div class="caption"></div>`;
    caption = shadow.querySelector(".caption");
  };

  const renderCaption = () => {
    if (!caption) return;
    if (captionText) caption.textContent = captionText;
    caption.classList.toggle("on", Boolean(captionText));
  };

  w.__reeldiff = {
    show() {
      if (!root) build();
      if (root && !root.isConnected) document.documentElement.append(root);
      renderCaption();
    },
    hide() {
      root?.remove();
    },
    caption(text) {
      captionText = text;
      renderCaption();
    },
  };
}
