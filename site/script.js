const header = document.querySelector('[data-header]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 24)
}

function markShotState(img) {
  const shot = img.closest('[data-shot]')
  if (!shot) return
  shot.classList.toggle('is-loaded', img.complete && img.naturalWidth > 0)
  shot.classList.toggle('is-error', img.complete && img.naturalWidth === 0)
}

document.querySelectorAll('[data-shot] img').forEach((img) => {
  img.addEventListener('load', () => markShotState(img), { once: true })
  img.addEventListener('error', () => markShotState(img), { once: true })
  markShotState(img)
})

const revealItems = document.querySelectorAll('.reveal')
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'))
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
  revealItems.forEach((item) => observer.observe(item))
}

if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`)
    document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`)
  }, { passive: true })
}

updateHeader()
window.addEventListener('scroll', updateHeader, { passive: true })
