import { GradientElement } from "gradient-element";

class GradientWorkbench extends GradientElement {
  mount() {
    const cards = [...this.children];
    this.innerHTML = `<div class="row g-4 align-items-stretch"></div>`;
    const row = this.firstElementChild;
    cards.forEach((card, index) => {
      const col = document.createElement("div");
      col.className = index === 0 ? "col-12 col-xl-8" : "col-12 col-xl-4";
      col.append(card);
      row.append(col);
    });
  }
}

customElements.define("gradient-workbench", GradientWorkbench);
export { GradientWorkbench };
