module.exports = (...args) => {
  if (!process.env.NO_LOGGING) {
    console.log(...args); // eslint-disable-line no-console
  }
};
