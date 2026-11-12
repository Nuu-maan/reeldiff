type OverlayWindow = Window & {
  __reeldiffPointer?: { x: number; y: number };
  __reeldiff?: { show(): void; hide(): void; caption(text: string | null): void };
};

export function installOverlay(mask: string) {
  const w = window as OverlayWindow;

  const maskSheet = new CSSStyleSheet();
  maskSheet.replaceSync(`${mask} { filter: blur(8px) !important; }`);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, maskSheet];

  let root: HTMLElement | null = null;
  let cursor: HTMLElement | null = null;
  let caption: HTMLElement | null = null;
  let captionText: string | null = null;

  const place = () => {
    const p = w.__reeldiffPointer;
    if (!cursor || !p) return;
    cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;
    cursor.classList.add("placed");
  };

  const build = () => {
    root = document.createElement("reeldiff-overlay");
    const shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
      .cursor { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0; }
      .cursor.placed { opacity: 1; }
      .cursor svg { position: absolute; left: -3px; top: -2px; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .35)); transition: scale 120ms cubic-bezier(.23,1,.32,1); transform-origin: 3px 2px; }
      .cursor.down svg { scale: .88; }
      .ring { position: absolute; left: -18px; top: -18px; width: 36px; height: 36px; border-radius: 50%; background: rgb(0 0 0 / .14); opacity: 0; scale: .4; }
      .cursor.down .ring { animation: ring 450ms cubic-bezier(.23,1,.32,1); }
      @keyframes ring { from { opacity: 1; scale: .4; } to { opacity: 0; scale: 1.4; } }
      .caption { position: absolute; left: 50%; bottom: 40px; translate: -50% 8px; max-width: min(720px, calc(100% - 64px)); padding: 12px 18px; border-radius: 14px; background: rgb(23 23 23 / .92); color: #fff; font: 500 20px/1.35 ui-sans-serif, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity 200ms cubic-bezier(.23,1,.32,1), translate 200ms cubic-bezier(.23,1,.32,1); }
      .caption.on { opacity: 1; translate: -50% 0; }
    </style>
    <div class="caption"></div>
    <div class="cursor"><div class="ring"></div><svg width="22" height="26" viewBox="0 0 22 26"><path d="M3 2.5v19.2c0 .9 1.1 1.3 1.7.6l4.6-5.1h7.2c.9 0 1.3-1.1.7-1.7L4.7 1.8C4.1 1.2 3 1.6 3 2.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`;
    cursor = shadow.querySelector(".cursor");
    caption = shadow.querySelector(".caption");
  };

  const renderCaption = () => {
    if (!caption) return;
    if (captionText) caption.textContent = captionText;
    caption.classList.toggle("on", Boolean(captionText));
  };

  addEventListener(
    "mousemove",
    (event) => {
      w.__reeldiffPointer = { x: event.clientX, y: event.clientY };
      place();
    },
    true,
  );
  addEventListener("mousedown", () => cursor?.classList.add("down"), true);
  addEventListener("mouseup", () => setTimeout(() => cursor?.classList.remove("down"), 120), true);

  w.__reeldiff = {
    show() {
      if (!root) build();
      if (root && !root.isConnected) document.documentElement.append(root);
      place();
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
