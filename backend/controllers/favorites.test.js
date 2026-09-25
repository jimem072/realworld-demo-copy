const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Notification = { create: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Notification, Tag: {}, User: {} });

const { favoriteToggler } = require("./favorites");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author, hasUser = false, favoritesCount = 0, userId }) {
  return makeInstance(
    { id: 1, slug: "a-slug", tagList: [], userId: userId ?? author?.id },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
      addUser: vi.fn().mockResolvedValue(),
      removeUser: vi.fn().mockResolvedValue(),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
  Notification.create.mockReset();
});

describe("favoriteToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await favoriteToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-049: favoriting/unfavoriting a nonexistent slug is rejected.
  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await favoriteToggler(
      { loggedUser, params: { slug: "missing" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-047: favoriting an article the user hadn't favorited yet.
  test("POST on an unfavorited article -> addUser called, favorited true", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: true, favoritesCount: 4 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.addUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article });
    expect(article.dataValues.favorited).toBe(true);
    expect(article.dataValues.favoritesCount).toBe(4);
  });

  // AC-048: unfavoriting a previously-favorited article.
  test("DELETE on a favorited article -> removeUser called, favorited false", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: false, favoritesCount: 3 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(article.removeUser).toHaveBeenCalledWith(loggedUser);
    expect(article.dataValues.favorited).toBe(false);
    expect(article.dataValues.favoritesCount).toBe(3);
  });

  // Favoriting/unfavoriting itself always requires authentication (REQ-025);
  // AC-050 / AC-054's anonymous-viewer case (favorited forced false, count
  // still the true total) is exercised in articles.test.js's singleArticle
  // tests, since that's the endpoint anonymous visitors actually use.

  // Notifications (Issue #15): favoriting someone else's article notifies
  // that article's author.
  test("POST favorite on another author's article -> notifies that author", async () => {
    const article = makeArticle({ author: makeFollowableAuthor({ id: 9 }), hasUser: true });
    Article.findOne.mockResolvedValue(article);

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, makeRes(), vi.fn());

    expect(Notification.create).toHaveBeenCalledWith({
      type: "favorite",
      recipientId: 9,
      actorId: 2,
      articleId: 1,
    });
  });

  // Notifications (Issue #15): unfavoriting never notifies (only the
  // positive favorite action does).
  test("DELETE (unfavorite) -> no notification created", async () => {
    const article = makeArticle({ author: makeFollowableAuthor({ id: 9 }), hasUser: false });
    Article.findOne.mockResolvedValue(article);

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, makeRes(), vi.fn());

    expect(Notification.create).not.toHaveBeenCalled();
  });

  // Notifications (Issue #15): favoriting your own article never notifies
  // yourself.
  test("POST favorite on your own article -> no notification created", async () => {
    const article = makeArticle({ author: makeFollowableAuthor({ id: 2 }), hasUser: true, userId: 2 });
    Article.findOne.mockResolvedValue(article);

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, makeRes(), vi.fn());

    expect(Notification.create).not.toHaveBeenCalled();
  });
});
