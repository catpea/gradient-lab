import { GradientElement } from "gradient-element";

class ToastZone extends GradientElement {
  mount() {
    this.innerHTML = `<div class="toast-lite"><i class="bi bi-check2-circle me-2 text-lux-gold"></i><span></span></div>`;
    this.refs = { toast: this.querySelector(".toast-lite"), message: this.querySelector("span") };
    this.timer = null;
  }

  show(message) {
    this.refs.message.textContent = message;
    this.refs.toast.classList.add("show");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refs.toast.classList.remove("show"), 1800);
  }
}

customElements.define("toast-zone", ToastZone);
export { ToastZone };
