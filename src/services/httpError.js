function getApiErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (error.response) {
    const responseData = JSON.stringify(error.response.data);
    return `HTTP ${error.response.status}: ${responseData}`;
  }

  if (error.request) {
    return "No response received from upstream API.";
  }

  return error.message || "Unknown error";
}

module.exports = { getApiErrorMessage };
