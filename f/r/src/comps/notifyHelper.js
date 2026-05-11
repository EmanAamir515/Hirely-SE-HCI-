export const sendNotification = async (token, userId, message) => {
  try {
    const response = await fetch('http://localhost:5000/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, message })
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { success: false };
  }
};