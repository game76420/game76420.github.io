document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((link) => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.nav').forEach((nav) => {
    const toggle = nav.querySelector('.nav-toggle');
    const menu = nav.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open', !expanded);
    });
  });

  document.querySelectorAll('.nav-menu .nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      const nav = link.closest('.nav');
      if (!nav) return;
      const toggle = nav.querySelector('.nav-toggle');
      const menu = nav.querySelector('.nav-menu');
      if (toggle && menu && toggle.getAttribute('aria-expanded') === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
      }
    });
  });

  const tabContainers = document.querySelectorAll('[data-tabs]');
  tabContainers.forEach((container) => {
    const buttons = container.querySelectorAll('[data-tab-btn]');
    const panels = container.querySelectorAll('[data-tab-panel]');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tabBtn;

        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.tabPanel !== target;
        });
      });
    });
  });
});

