import { GradientElement } from "gradient-element";
import { libraryCss } from "utils";

class LibraryControls extends GradientElement {
  mount() {
    this.innerHTML = `
      <div class="row g-3 align-items-end mb-3">
        <div class="col-md-3">
          <label class="form-label">Class prefix</label>
          <input class="form-control prefix-input" value="gr-" spellcheck="false">
        </div>
        <div class="col-md-5">
          <label class="form-label">Permalink domain</label>
          <input class="form-control domain-input" spellcheck="false">
        </div>
        <div class="col-md-auto">
          <button class="btn btn-lux rounded-pill copy-library" type="button">
            <i class="bi bi-clipboard me-1"></i> Copy library CSS
          </button>
        </div>
      </div>
    `;
    this.refs = {
      prefix: this.querySelector(".prefix-input"),
      domain: this.querySelector(".domain-input"),
      copy: this.querySelector(".copy-library"),
    };
    this.concern.on(this.refs.prefix, "input", event => this.commit(draft => { draft.prefix = event.target.value || "gr-"; }));
    this.concern.on(this.refs.domain, "input", event => this.commit(draft => { draft.domain = event.target.value || "gradientlab.local"; }));
    this.concern.on(this.refs.copy, "click", () => {
      const css = libraryCss(this.state.library, this.state.prefix);
      if (!css) return this.app.toast("Library is empty.");
      this.app.copyText(css, "Copied library CSS.");
    });
    this.watchState(state => this.render(state));
  }

  render(state) {
    this.refs.prefix.value = state.prefix;
    this.refs.domain.value = state.domain;
  }
}

customElements.define("library-controls", LibraryControls);
export { LibraryControls };
