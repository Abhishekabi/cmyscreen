// Helper function to authentication
const uuid = require('uuid');

module.exports = {
  generateGuestId: function () {
    return uuid.v1();
  },

  isEmpty: function (object) {
    return typeof object === "undefined";
  },
};
