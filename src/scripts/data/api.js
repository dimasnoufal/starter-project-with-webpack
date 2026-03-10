import CONFIG from '../config';
import Auth from '../utils/auth';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
};

function getAuthHeaders() {
  const token = Auth.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register({ name, email, password }) {
  const response = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return response.json();
}

export async function login({ email, password }) {
  const response = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function getAllStories({ page = 1, size = 20, location = 1 } = {}) {
  try {
    const url = new URL(ENDPOINTS.STORIES);
    url.searchParams.set('page', page);
    url.searchParams.set('size', size);
    url.searchParams.set('location', location);

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (err) {
    console.error('getAllStories error', err);
    return { error: true, message: err.message };
  }
}

export async function getStoryDetail(id) {
  const response = await fetch(ENDPOINTS.STORY_DETAIL(id), {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function addStory({ description, photo, lat, lon }) {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat !== undefined && lat !== null) formData.append('lat', lat);
  if (lon !== undefined && lon !== null) formData.append('lon', lon);

  const response = await fetch(ENDPOINTS.STORIES, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  return response.json();
}

export async function addStoryAsGuest({ description, photo, lat, lon }) {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat !== undefined && lat !== null) formData.append('lat', lat);
  if (lon !== undefined && lon !== null) formData.append('lon', lon);

  const response = await fetch(ENDPOINTS.STORIES_GUEST, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}