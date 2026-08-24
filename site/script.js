const header = document.querySelector('[data-header]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const languageButtons = document.querySelectorAll('[data-language]')

function getSavedLanguage() {
  try {
    return window.localStorage.getItem('agent-learning-site-language')
  } catch {
    return null
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem('agent-learning-site-language', language)
  } catch {
    // Language switching still works when storage is unavailable.
  }
}

function setLanguage(language, { persist = false } = {}) {
  const nextLanguage = language === 'en' ? 'en' : 'zh'
  const languageKey = nextLanguage === 'en' ? 'en' : 'zh'
  const attributeKey = nextLanguage === 'en' ? 'en' : 'zh'

  document.documentElement.lang = nextLanguage === 'en' ? 'en' : 'zh-CN'
  document.documentElement.dataset.language = nextLanguage

  document.querySelectorAll('[data-zh][data-en]').forEach((element) => {
    element.textContent = element.dataset[languageKey]
  })

  document.querySelectorAll('[data-zh-content][data-en-content]').forEach((element) => {
    element.setAttribute('content', element.dataset[`${attributeKey}Content`])
  })

  document.querySelectorAll('[data-zh-alt][data-en-alt]').forEach((element) => {
    element.setAttribute('alt', element.dataset[`${attributeKey}Alt`])
  })

  document.querySelectorAll('[data-zh-aria-label][data-en-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', element.dataset[`${attributeKey}AriaLabel`])
  })

  languageButtons.forEach((button) => {
    const isActive = button.dataset.language === nextLanguage
    button.setAttribute('aria-pressed', String(isActive))
    button.setAttribute(
      'aria-label',
      button.dataset.language === 'zh'
        ? (nextLanguage === 'en' ? 'Switch to Chinese' : '当前语言：中文')
        : (nextLanguage === 'en' ? 'Current language: English' : '切换到英文'),
    )
  })

  if (persist) saveLanguage(nextLanguage)
}

languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.language, { persist: true }))
})

setLanguage(getSavedLanguage() === 'en' ? 'en' : 'zh')

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
