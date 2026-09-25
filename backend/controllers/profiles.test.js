const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn(), findAndCountAll: vi.fn() };
const Notification = { create: vi.fn() };
mockRequire(require.resolve("../models"), { User, Notification });

const { allProfiles, getProfile, followToggler } = require("./profiles");

function makeProfile({ hasFollower = false, followersCount = 0 } = {}) {
  return makeInstance(
    { id: 1, username: "author" },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      countFollowers: vi.fn().mockResolvedValue(followersCount),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  User.findOne.mockReset();
  User.findAndCountAll.mockReset();
  Notification.create.mockReset();
});

describe("allProfiles", () => {
  // AC-083: default request -> page size 12, offset 0, ordered alphabetically
  // by username, true total count returned.
  test("no query params -> default limit 12, offset 0, ordered by username", async () => {
    const profile = makeProfile({ hasFollower: false, followersCount: 0 });
    User.findAndCountAll.mockResolvedValue({ rows: [profile], count: 1 });
    const res = makeRes();

    await allProfiles({ loggedUser: undefined, query: {} }, res, vi.fn());

    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 12,
        offset: 0,
        order: [["username", "ASC"]],
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ profiles: [profile], profilesCount: 1 });
  });

  // AC-084: custom limit/offset query params are honored.
  test("custom limit/offset -> forwarded to findAndCountAll", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await allProfiles(
      { loggedUser: undefined, query: { limit: "5", offset: "2" } },
      makeRes(),
      vi.fn(),
    );

    expect(User.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });

  // AC-085: anonymous caller sees following: false on every entry, while
  // each entry's followersCount still reflects the true total (REQ-028).
  test("no loggedUser -> every profile has following forced false, true followersCount", async () => {
    const profileA = makeProfile({ hasFollower: true, followersCount: 4 });
    const profileB = makeProfile({ hasFollower: true, followersCount: 7 });
    User.findAndCountAll.mockResolvedValue({ rows: [profileA, profileB], count: 2 });
    const res = makeRes();

    await allProfiles({ loggedUser: undefined, query: {} }, res, vi.fn());

    expect(profileA.dataValues.following).toBe(false);
    expect(profileA.dataValues.followersCount).toBe(4);
    expect(profileB.dataValues.following).toBe(false);
    expect(profileB.dataValues.followersCount).toBe(7);
  });
});

describe("getProfile", () => {
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await getProfile({ loggedUser: undefined, params: { username: "ghost" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-006 / AC-054: an anonymous viewer sees following: false, but the
  // follower count still reflects the true total.
  test("no loggedUser -> following forced false, followersCount is the true total", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 5 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(5);
  });
});

describe("followToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await followToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-053: following/unfollowing a nonexistent username is rejected.
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await followToggler({ loggedUser, params: { username: "ghost" }, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-051: following an account not already followed.
  test("POST on a not-yet-followed account -> addFollower called, following true", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 3 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "POST" }, res, vi.fn());

    expect(profile.addFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(true);
    expect(profile.dataValues.followersCount).toBe(3);
  });

  // AC-052: unfollowing a currently-followed account.
  test("DELETE on a followed account -> removeFollower called, following false", async () => {
    const profile = makeProfile({ hasFollower: false, followersCount: 2 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "DELETE" }, res, vi.fn());

    expect(profile.removeFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(2);
  });

  // Notifications (Issue #15): following someone notifies them.
  test("POST follow -> notifies the followed account", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 1 });
    User.findOne.mockResolvedValue(profile);

    await followToggler({ loggedUser, params: { username: "author" }, method: "POST" }, makeRes(), vi.fn());

    expect(Notification.create).toHaveBeenCalledWith({
      type: "follow",
      recipientId: 1,
      actorId: 2,
      articleId: undefined,
      commentId: undefined,
    });
  });

  // Notifications (Issue #15): unfollowing never notifies (only the
  // positive follow action does).
  test("DELETE (unfollow) -> no notification created", async () => {
    const profile = makeProfile({ hasFollower: false, followersCount: 0 });
    User.findOne.mockResolvedValue(profile);

    await followToggler({ loggedUser, params: { username: "author" }, method: "DELETE" }, makeRes(), vi.fn());

    expect(Notification.create).not.toHaveBeenCalled();
  });
});
