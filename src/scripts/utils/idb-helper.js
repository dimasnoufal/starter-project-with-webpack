import { openDB } from 'idb';

const DB_NAME = 'storyshare-db';
const DB_VERSION = 2;
const SAVED_STORIES_STORE = 'saved-stories';
const OFFLINE_QUEUE_STORE = 'offline-queue';

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Saved stories store
      if (!db.objectStoreNames.contains(SAVED_STORIES_STORE)) {
        const store = db.createObjectStore(SAVED_STORIES_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('name', 'name');
      }
      // Offline queue store for pending story submissions
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        db.createObjectStore(OFFLINE_QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });
}

// ---------- Saved Stories ----------

export async function saveStory(story) {
  const db = await getDB();
  return db.put(SAVED_STORIES_STORE, {
    ...story,
    savedAt: new Date().toISOString(),
  });
}

export async function getSavedStories() {
  const db = await getDB();
  return db.getAll(SAVED_STORIES_STORE);
}

export async function getSavedStory(id) {
  const db = await getDB();
  return db.get(SAVED_STORIES_STORE, id);
}

export async function deleteSavedStory(id) {
  const db = await getDB();
  return db.delete(SAVED_STORIES_STORE, id);
}

export async function isStorySaved(id) {
  const story = await getSavedStory(id);
  return !!story;
}

// ---------- Offline Queue ----------

export async function addToOfflineQueue(storyData) {
  const db = await getDB();
  return db.add(OFFLINE_QUEUE_STORE, {
    ...storyData,
    queuedAt: new Date().toISOString(),
    synced: false,
  });
}

export async function getOfflineQueue() {
  const db = await getDB();
  return db.getAll(OFFLINE_QUEUE_STORE);
}

export async function removeFromOfflineQueue(id) {
  const db = await getDB();
  return db.delete(OFFLINE_QUEUE_STORE, id);
}

export async function clearOfflineQueue() {
  const db = await getDB();
  return db.clear(OFFLINE_QUEUE_STORE);
}
