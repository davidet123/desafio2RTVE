document.addEventListener("DOMContentLoaded", () => {
  const wrappers = document.querySelectorAll(".compare-wrapper");

  wrappers.forEach(wrapper => {
    const overlay = wrapper.querySelector(".compare-overlay");
    const slider = wrapper.querySelector(".compare-slider");
    const baseImg = wrapper.querySelector(".base");
    const overlayImg = wrapper.querySelector(".overlay-img");
    
    let dragging = false;

    // Ajustar la imagen overlay al mismo tamaño que la base
    const adjustOverlayImage = () => {
      if (baseImg && overlayImg) {
        // Hacemos que la imagen overlay tenga el mismo tamaño que la base
        overlayImg.style.width = baseImg.offsetWidth + "px";
        overlayImg.style.height = baseImg.offsetHeight + "px";
      }
    };

    const move = (clientX) => {
      const rect = wrapper.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const percent = (x / rect.width) * 100;

      overlay.style.width = percent + "%";
      slider.style.left = percent + "%";
    };

    // Iniciar arrastre
    const startDrag = (e) => {
      e.preventDefault();
      dragging = true;
      move(e.type === 'mousedown' ? e.clientX : e.touches[0].clientX);
    };

    // Eventos
    wrapper.addEventListener("mousedown", startDrag);
    wrapper.addEventListener("touchstart", startDrag);

    window.addEventListener("mouseup", () => dragging = false);
    window.addEventListener("touchend", () => dragging = false);
    
    window.addEventListener("mousemove", e => {
      if (dragging) {
        e.preventDefault();
        move(e.clientX);
      }
    });
    
    window.addEventListener("touchmove", e => {
      if (dragging) {
        e.preventDefault();
        move(e.touches[0].clientX);
      }
    });

    // Ajustar al cargar y al redimensionar
    window.addEventListener("load", adjustOverlayImage);
    window.addEventListener("resize", adjustOverlayImage);
    
    // Ajuste inicial
    adjustOverlayImage();
  });
});