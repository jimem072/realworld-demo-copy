const { mockRequire } = require("../test-utils/fakeModels");

const Notification = { create: vi.fn() };
mockRequire(require.resolve("../models"), { Notification });

const { slugify, createNotification } = require("./helpers");

describe("Slugify", () => {
  const stringsArray = [
    "  Hello World  ",
    "  Hello WORLD  ",
    " HELLO WORLD",
    "Hello World",
    "Hello_world ",
    "Hello-world",
  ];

  test.each(stringsArray)("%p", (string) => {
    expect(slugify(string)).toBe("hello-world");
  });
});

describe("createNotification", () => {
  beforeEach(() => {
    Notification.create.mockReset();
  });

  test("actor and recipient differ -> Notification.create called with the given fields", async () => {
    await createNotification({ actorId: 2, articleId: 5, commentId: 3, recipientId: 9, type: "comment" });

    expect(Notification.create).toHaveBeenCalledWith({
      actorId: 2,
      articleId: 5,
      commentId: 3,
      recipientId: 9,
      type: "comment",
    });
  });

  // Never notify yourself for your own action.
  test("actor and recipient are the same user -> no notification created", async () => {
    await createNotification({ actorId: 2, recipientId: 2, type: "favorite" });

    expect(Notification.create).not.toHaveBeenCalled();
  });

  // A notification is a side effect, never a gate - a failure here must
  // not propagate and break the caller's own successful action.
  test("Notification.create rejects -> error is swallowed, does not throw", async () => {
    Notification.create.mockRejectedValue(new Error("db down"));

    await expect(
      createNotification({ actorId: 2, recipientId: 9, type: "follow" }),
    ).resolves.toBeUndefined();
  });
});
