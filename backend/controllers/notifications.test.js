const {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Notification = {
  findAndCountAll: vi.fn(),
  count: vi.fn(),
  findByPk: vi.fn(),
  update: vi.fn(),
};
mockRequire(require.resolve("../models"), { Notification, Article: {}, User: {} });

const {
  allNotifications,
  unreadCount,
  markRead,
  markAllRead,
} = require("./notifications");

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Notification.findAndCountAll.mockReset();
  Notification.count.mockReset();
  Notification.findByPk.mockReset();
  Notification.update.mockReset();
});

describe("allNotifications", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await allNotifications({ loggedUser: undefined, query: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-0xx: default request -> page size 10, offset 0, scoped to the
  // logged-in user, newest first.
  test("no query params -> default limit 10, offset 0, scoped to recipient", async () => {
    const notification = makeInstance({ id: 1, type: "follow" });
    Notification.findAndCountAll.mockResolvedValue({ rows: [notification], count: 1 });
    const res = makeRes();

    await allNotifications({ loggedUser, query: {} }, res, vi.fn());

    expect(Notification.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientId: 2 },
        limit: 10,
        offset: 0,
        order: [["createdAt", "DESC"]],
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      notifications: [notification],
      notificationsCount: 1,
    });
  });

  // AC-0xx: custom limit/offset query params are honored.
  test("custom limit/offset -> forwarded to findAndCountAll", async () => {
    Notification.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await allNotifications(
      { loggedUser, query: { limit: "5", offset: "2" } },
      makeRes(),
      vi.fn(),
    );

    expect(Notification.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });
});

describe("unreadCount", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await unreadCount({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-0xx: unread count is scoped to the logged-in user's unread rows only.
  test("returns the unread count scoped to the logged-in user", async () => {
    Notification.count.mockResolvedValue(4);
    const res = makeRes();

    await unreadCount({ loggedUser }, res, vi.fn());

    expect(Notification.count).toHaveBeenCalledWith({
      where: { recipientId: 2, read: false },
    });
    expect(res.json).toHaveBeenCalledWith({ unreadCount: 4 });
  });
});

describe("markRead", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await markRead({ loggedUser: undefined, params: { id: 1 } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent notification -> NotFoundError", async () => {
    Notification.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await markRead({ loggedUser, params: { id: 99 } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-0xx: notifications are private - marking someone else's is rejected.
  test("another user's notification -> ForbiddenError", async () => {
    const notification = makeInstance({ id: 1, recipientId: 999, read: false }, { save: vi.fn() });
    Notification.findByPk.mockResolvedValue(notification);
    const next = vi.fn();

    await markRead({ loggedUser, params: { id: 1 } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(notification.save).not.toHaveBeenCalled();
  });

  // AC-0xx: the recipient can mark their own notification read.
  test("own notification -> marked read and saved", async () => {
    const notification = makeInstance({ id: 1, recipientId: 2, read: false }, { save: vi.fn() });
    Notification.findByPk.mockResolvedValue(notification);
    const res = makeRes();

    await markRead({ loggedUser, params: { id: 1 } }, res, vi.fn());

    expect(notification.read).toBe(true);
    expect(notification.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ notification });
  });
});

describe("markAllRead", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await markAllRead({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-0xx: bulk mark-as-read only touches the logged-in user's own unread rows.
  test("marks only the logged-in user's unread notifications as read", async () => {
    Notification.update.mockResolvedValue([1]);
    const res = makeRes();

    await markAllRead({ loggedUser }, res, vi.fn());

    expect(Notification.update).toHaveBeenCalledWith(
      { read: true },
      { where: { recipientId: 2, read: false } },
    );
    expect(res.json).toHaveBeenCalledWith({ unreadCount: 0 });
  });
});
