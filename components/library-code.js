import { GradientElement } from "gradient-element";
import { libraryCss } from "utils";

class LibraryCode extends GradientElement {
  mount() {
    this.innerHTML = `
      <div class="collapse" id="libraryCodeCollapse">
        <textarea class="form-control codebox library-css" readonly></textarea>
      </div>
      <button class="btn btn-soft btn-sm rounded-pill" type="button" data-bs-toggle="collapse" data-bs-target="#libraryCodeCollapse" aria-expanded="false" aria-controls="libraryCodeCollapse">
        <i class="bi bi-code-square me-1"></i> Show library code
      </button>
    `;
    this.refs = { textarea: this.querySelector(".library-css") };
    this.watchState(state => this.render(state));
  }

  render(state) {
    this.refs.textarea.value = libraryCss(state.library, state.prefix) || "/* Add gradients to generate .gr-1, .gr-2, .gr-3... classes. */";
  }
}

customElements.define("library-code", LibraryCode);
export { LibraryCode };
