const axios = require('axios');

async function fetchBotProfile(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await axios.get(url, {
    timeout: 10_000,
  });

  if (!response.data.ok) {
    throw new Error('Telegram API returned an unsuccessful response.');
  }

  return response.data.result;
}

module.exports = {
  fetchBotProfile,
};
