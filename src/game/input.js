export function createInput(surface, onCastStart, onCastEnd) {
  const state = { pointerX: 0.5, left: false, right: false, casting: false };

  const aim = (event) => {
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width) return;
    state.pointerX = Math.max(0.06, Math.min(0.94, (event.clientX - bounds.left) / bounds.width));
  };
  const pointerDown = (event) => {
    event.preventDefault();
    aim(event);
    surface.setPointerCapture?.(event.pointerId);
    if (!state.casting) {
      state.casting = true;
      onCastStart();
    }
  };
  const pointerUp = (event) => {
    aim(event);
    if (state.casting) {
      state.casting = false;
      onCastEnd();
    }
  };
  const keyDown = (event) => {
    if (event.code === "ArrowLeft") state.left = true;
    if (event.code === "ArrowRight") state.right = true;
    if (event.code === "Space" && !state.casting) {
      event.preventDefault();
      state.casting = true;
      onCastStart();
    }
  };
  const keyUp = (event) => {
    if (event.code === "ArrowLeft") state.left = false;
    if (event.code === "ArrowRight") state.right = false;
    if (event.code === "Space" && state.casting) {
      event.preventDefault();
      state.casting = false;
      onCastEnd();
    }
  };

  surface.addEventListener("pointermove", aim);
  surface.addEventListener("pointerdown", pointerDown);
  surface.addEventListener("pointerup", pointerUp);
  surface.addEventListener("pointercancel", pointerUp);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  return {
    state,
    destroy() {
      surface.removeEventListener("pointermove", aim);
      surface.removeEventListener("pointerdown", pointerDown);
      surface.removeEventListener("pointerup", pointerUp);
      surface.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    },
  };
}
