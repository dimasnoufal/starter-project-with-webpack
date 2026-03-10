import { register } from '../../data/api';

export default class RegisterPresenter {
  #view = null;

  constructor({ view }) {
    this.#view = view;
  }

  async register({ name, email, password }) {
    const response = await register({ name, email, password });

    if (response.error) {
      this.#view.onRegisterError(response.message);
      return;
    }

    this.#view.onRegisterSuccess(response.message);
  }
}
