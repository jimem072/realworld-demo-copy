const {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} = require("../helper/customErrors");
const { Article, Notification, User } = require("../models");

//? All Notifications for the logged-in user
const allNotifications = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { limit = 10, offset = 0 } = req.query;

    const notifications = await Notification.findAndCountAll({
      where: { recipientId: loggedUser.id },
      include: [
        { model: User, as: "actor", attributes: { exclude: "email" } },
        { model: Article, as: "article", attributes: ["slug", "title"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset * limit,
    });

    res.json({
      notifications: notifications.rows,
      notificationsCount: notifications.count,
    });
  } catch (error) {
    next(error);
  }
};

//? Unread notification count for the logged-in user
const unreadCount = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const unreadCount = await Notification.count({
      where: { recipientId: loggedUser.id, read: false },
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

//* Mark a single notification as read
const markRead = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) throw new NotFoundError("Notification");
    if (notification.recipientId !== loggedUser.id) {
      throw new ForbiddenError("notification");
    }

    notification.read = true;
    await notification.save();

    res.json({ notification });
  } catch (error) {
    next(error);
  }
};

//* Mark every unread notification as read
const markAllRead = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    await Notification.update(
      { read: true },
      { where: { recipientId: loggedUser.id, read: false } },
    );

    res.json({ unreadCount: 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = { allNotifications, unreadCount, markRead, markAllRead };
