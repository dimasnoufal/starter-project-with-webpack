import { login } from '../../data/api';
import Auth from '../../utils/auth';

export default class LoginPresenter {
  #view = null;

  constructor({ view }) {
    this.#view = view;
  }

  async login({ email, password }) {
    const response = await login({ email, password });

    if (response.error) {
      this.#view.onLoginError(response.message);
      return;
    }

    const { token, userId, name } = response.loginResult;
    Auth.putAccessToken(token);
    Auth.putUserInfo({ userId, name });

    this.#view.onLoginSuccess(response.message);
  }
}
