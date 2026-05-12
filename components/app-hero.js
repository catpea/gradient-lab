import { GradientElement } from "gradient-element";

class AppHero extends GradientElement {
  mount() {
    this.innerHTML = `
      <section class="hero-card p-4 p-xl-5 mb-4">
        <div class="row align-items-end g-4">
          <div class="col-lg-8">
            <div class="soft-pill d-inline-flex align-items-center gap-2 mb-3">
              <i class="bi bi-eyedropper"></i>
              Image-sampled CSS gradient studio
            </div>
            <h1 class="display-5 fw-semibold mb-3">Sample gradients the way nature composes color.</h1>
            <p class="lead text-lux-muted mb-0">
              Drop a close-up photo, draw slash-lines through the interesting color movement, then refine the sampled stops into reusable Bootstrap-ready CSS classes.
            </p>
          </div>
          <div class="col-lg-4">
            <div class="d-flex flex-wrap justify-content-lg-end gap-2">
              <span class="soft-pill"><i class="bi bi-bezier2 me-1"></i> draggable paths</span>
              <span class="soft-pill"><i class="bi bi-palette2 me-1"></i> 2–16 stops</span>
              <span class="soft-pill"><i class="bi bi-code-slash me-1"></i> copy CSS</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}

customElements.define("app-hero", AppHero);
export { AppHero };
