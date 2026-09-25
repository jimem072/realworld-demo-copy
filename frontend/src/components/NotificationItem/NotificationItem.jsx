import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import dateFormatter from "../../helpers/dateFormatter";
import markNotificationRead from "../../services/markNotificationRead";
import Avatar from "../Avatar";

function NotificationItem({ notification, updateNotification }) {
  const { actor, article, createdAt, id, read, type } = notification;
  const [loading, setLoading] = useState(false);
  const { headers } = useAuth();
  const { setUnreadCount } = useNotifications();

  const handleMarkRead = () => {
    setLoading(true);

    markNotificationRead({ headers, id })
      .then((updated) => {
        updateNotification(updated);
        setUnreadCount((count) => Math.max(0, count - 1));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const message =
    type === "follow" ? (
      <>
        <Link to={`/profile/${actor.username}`}>{actor.username}</Link> started following you
      </>
    ) : type === "comment" ? (
      <>
        <Link to={`/profile/${actor.username}`}>{actor.username}</Link> commented on your article{" "}
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </>
    ) : (
      <>
        <Link to={`/profile/${actor.username}`}>{actor.username}</Link> favorited your article{" "}
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </>
    );

  return (
    <div className={`notification-item ${read ? "" : "unread"}`}>
      <Link to={`/profile/${actor.username}`}>
        <Avatar alt={actor.username} src={actor.image} />
      </Link>
      <div className="info">
        <span>{message}</span>
        <span className="date">{dateFormatter(createdAt)}</span>
      </div>
      {!read && (
        <button className="btn btn-sm btn-outline-secondary" disabled={loading} onClick={handleMarkRead}>
          Mark as read
        </button>
      )}
    </div>
  );
}

export default NotificationItem;
