import RegisterPresenter from './register-presenter';
import { isValidEmail, showAlert } from '../../utils/index';

export default class RegisterPage {
  #presenter = null;

  async render() {
    return `
      <section class="auth-section container">
        <article class="auth-card">
          <h1 class="auth-title">Daftar ke StoryShare</h1>
          <p class="auth-subtitle">Buat akun baru untuk mulai berbagi cerita</p>

          <form id="register-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="name" class="form-label">Nama</label>
              <input
                type="text"
                id="name"
                name="name"
                class="form-input"
                placeholder="Nama lengkap Anda"
                autocomplete="name"
                required
                aria-describedby="name-error"
              />
              <span id="name-error" class="form-error" role="alert" aria-live="polite"></span>
            </div>

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
                autocomplete="new-password"
                required
                minlength="8"
                aria-describedby="password-error"
              />
              <span id="password-error" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <button type="submit" class="btn btn-primary btn-full" id="submit-btn">
              Daftar
            </button>
          </form>

          <p class="auth-footer">
            Sudah punya akun? <a href="#/login">Masuk sekarang</a>
          </p>
        </article>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new RegisterPresenter({ view: this });
    this._setupForm();
  }

  _setupForm() {
    const form = document.querySelector('#register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this._clearErrors();

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;

      let hasError = false;

      if (!name || name.length < 2) {
        this._showFieldError('name-error', 'Nama minimal 2 karakter.');
        hasError = true;
      }

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
      await this.#presenter.register({ name, email, password });
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
    btn.textContent = loading ? 'Memproses...' : 'Daftar';
  }

  onRegisterSuccess(message) {
    showAlert(message || 'Pendaftaran berhasil! Silakan masuk.', 'success');
    setTimeout(() => { window.location.hash = '#/login'; }, 1000);
  }

  onRegisterError(message) {
    showAlert(message || 'Pendaftaran gagal. Silakan coba lagi.', 'error');
  }
}
