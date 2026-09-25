const { Notification } = require("../models");

const slugify = (string) => {
  return string.trim().toLowerCase().replace(/\W|_/g, "-");
};

const appendTagList = (articleTags, article) => {
  const tagList = articleTags.map((tag) => tag.name);

  if (!article) return tagList;
  article.dataValues.tagList = tagList;
};

const appendFavorites = async (loggedUser, article) => {
  const favorited = await article.hasUser(loggedUser ? loggedUser : null);
  article.dataValues.favorited = loggedUser ? favorited : false;

  const favoritesCount = await article.countUsers();
  article.dataValues.favoritesCount = favoritesCount;
};

const appendFollowers = async (loggedUser, toAppend) => {
  //
  if (toAppend?.author) {
    const author = await toAppend.getAuthor();

    const following = await author.hasFollower(loggedUser ? loggedUser : null);
    toAppend.author.dataValues.following = loggedUser ? following : false;

    const followersCount = await author.countFollowers();
    toAppend.author.dataValues.followersCount = followersCount;
    //
  } else {
    const following = await toAppend.hasFollower(
      loggedUser ? loggedUser : null,
    );
    toAppend.dataValues.following = loggedUser ? following : false;

    const followersCount = await toAppend.countFollowers();
    toAppend.dataValues.followersCount = followersCount;
  }
};

// A notification is a side effect of a successful follow/comment/favorite
// action, never a gate on it — failures here are swallowed so they can
// never turn an otherwise-successful request into an error response.
const createNotification = async ({ actorId, articleId, commentId, recipientId, type }) => {
  if (actorId === recipientId) return;

  try {
    await Notification.create({ actorId, articleId, commentId, recipientId, type });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  createNotification,
};
