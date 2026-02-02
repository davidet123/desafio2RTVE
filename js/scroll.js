function initScroll() {
  const steps = document.querySelectorAll('.step');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const step = Number(entry.target.dataset.step);
        if (scenes[step]) scenes[step]();
      }
    });
  }, { threshold: 0.6 });

  steps.forEach(step => observer.observe(step));
}
