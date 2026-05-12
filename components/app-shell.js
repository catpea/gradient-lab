import { GradientElement } from "gradient-element";

class AppShell extends GradientElement {
  mount() {
    const children = [...this.childNodes];
    this.innerHTML = `<main class="app-shell container py-4 py-xl-5"></main>`;
    this.querySelector("main").append(...children);
  }
}

customElements.define("app-shell", AppShell);
export { AppShell };
