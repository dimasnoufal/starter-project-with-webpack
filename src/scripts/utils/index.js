export function showFormattedDate(date, locale = 'id-ID', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function showAlert(message, type = 'success') {
  const existing = document.querySelector('.alert-toast');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.className = `alert-toast alert-${type}`;
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  alert.textContent = message;

  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

export function showLoading(container) {
  container.innerHTML = `
    <div class="loading-container" role="status" aria-label="Memuat data...">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Memuat data...</p>
    </div>`;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
