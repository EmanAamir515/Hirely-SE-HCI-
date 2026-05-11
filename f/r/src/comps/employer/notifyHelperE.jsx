/**
 * notifyHelper.js
 * Thin wrapper around POST /api/notifications
 * Call this from any component that needs to create a notification.
 */

const NODE_API = 'http://localhost:5000';

/**
 * @param {string} token        – JWT from localStorage
 * @param {number} userId       – recipient's user ID
 * @param {string} message      – notification text
 */
export async function sendNotification(token, userId, message) {
  try {
    await fetch(`${NODE_API}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, message }),
    });
  } catch (err) {
    // Non-critical — swallow silently so the main action still succeeds
    console.warn('Notification send failed:', err);
  }
}