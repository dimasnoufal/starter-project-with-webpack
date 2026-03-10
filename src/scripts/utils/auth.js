import CONFIG from '../config';

const Auth = {
  putAccessToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  },

  getAccessToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  removeAccessToken() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
  },

  putUserInfo(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  getUserInfo() {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  removeUserInfo() {
    localStorage.removeItem(CONFIG.USER_KEY);
  },

  isLoggedIn() {
    return !!this.getAccessToken();
  },

  logout() {
    this.removeAccessToken();
    this.removeUserInfo();
  },
};

export default Auth;
