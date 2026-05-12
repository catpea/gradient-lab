import { GradientElement } from "gradient-element";
import { escapeHtml } from "utils";

class LuxCard extends GradientElement {
  static observedAttributes = ["title", "icon", "subtitle"];

  mount() {
    const children = [...this.childNodes];
    const title = this.getAttribute("title") ?? "Card";
    const icon = this.getAttribute("icon") ?? "bi-stars";
    const subtitle = this.getAttribute("subtitle") ?? "";
    this.innerHTML = `
      <div class="card lux-card h-100">
        <div class="card-header d-flex align-items-start justify-content-between gap-3 px-4 py-3">
          <div>
            <div class="d-flex align-items-center gap-2 fw-semibold">
              <i class="bi ${icon} text-lux-gold"></i>
              <span>${escapeHtml(title)}</span>
            </div>
            ${subtitle ? `<div class="small text-lux-muted mt-1">${escapeHtml(subtitle)}</div>` : ""}
          </div>
        </div>
        <div class="card-body p-4"></div>
      </div>
    `;
    this.querySelector(".card-body").append(...children);
  }
}

customElements.define("lux-card", LuxCard);
export { LuxCard };
