const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const {
  allNotifications,
  unreadCount,
  markRead,
  markAllRead,
} = require("../controllers/notifications");

//? All Notifications
router.get("/", verifyToken, allNotifications);

//? Unread Count
router.get("/unread-count", verifyToken, unreadCount);

//* Mark All Read
router.put("/read-all", verifyToken, markAllRead);

//* Mark One Read
router.put("/:id/read", verifyToken, markRead);

module.exports = router;
