import LoginPresenter from './login-presenter';
import { isValidEmail, showAlert } from '../../utils/index';

export default class LoginPage {
  #presenter = null;

  async render() {
    return `
      <section class="auth-section container">
        <article class="auth-card">
          <h1 class="auth-title">Masuk ke StoryShare</h1>
          <p class="auth-subtitle">Masuk untuk mulai berbagi cerita Anda</p>

          <form id="login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                class="form-input"
                placeholder="contoh@email.com"
                autocomplete="email"
                required
                aria-describedby="email-error"
              />
              <span id="email-error" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                class="form-input"
                placeholder="Minimal 8 karakter"
                autocomplete="current-password"
                required
                minlength="8"
                aria-describedby="password-error"
              />
              <span id="password-error" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <button type="submit" class="btn btn-primary btn-full" id="submit-btn">
              Masuk
            </button>
          </form>

          <p class="auth-footer">
            Belum punya akun? <a href="#/register">Daftar sekarang</a>
          </p>
        </article>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new LoginPresenter({ view: this });
    this._setupForm();
  }

  _setupForm() {
    const form = document.querySelector('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this._clearErrors();

      const email = form.email.value.trim();
      const password = form.password.value;

      let hasError = false;

      if (!email) {
        this._showFieldError('email-error', 'Email tidak boleh kosong.');
        hasError = true;
      } else if (!isValidEmail(email)) {
        this._showFieldError('email-error', 'Format email tidak valid.');
        hasError = true;
      }

      if (!password) {
        this._showFieldError('password-error', 'Password tidak boleh kosong.');
        hasError = true;
      } else if (password.length < 8) {
        this._showFieldError('password-error', 'Password minimal 8 karakter.');
        hasError = true;
      }

      if (hasError) return;

      this.setSubmitLoading(true);
      await this.#presenter.login({ email, password });
      this.setSubmitLoading(false);
    });
  }

  _showFieldError(id, message) {
    const el = document.querySelector(`#${id}`);
    if (el) el.textContent = message;
  }

  _clearErrors() {
    document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
  }

  setSubmitLoading(loading) {
    const btn = document.querySelector('#submit-btn');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Memproses...' : 'Masuk';
  }

  onLoginSuccess(message) {
    showAlert(message || 'Berhasil masuk!', 'success');
    setTimeout(() => { window.location.hash = '#/'; }, 500);
  }

  onLoginError(message) {
    showAlert(message || 'Login gagal. Periksa email dan password Anda.', 'error');
  }
}
