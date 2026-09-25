import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContainerRow from "../components/ContainerRow";
import NotificationItem from "../components/NotificationItem";
import NotificationsPagination from "../components/NotificationsPagination";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import getNotifications from "../services/getNotifications";
import markAllNotificationsRead from "../services/markAllNotificationsRead";

function Notifications() {
  const [{ notifications, notificationsCount }, setNotificationsData] = useState({
    notifications: [],
    notificationsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { headers, isAuth } = useAuth();
  const { setUnreadCount } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuth) navigate("/");
  }, [isAuth, navigate]);

  useEffect(() => {
    getNotifications({ headers })
      .then(setNotificationsData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers]);

  const updateNotification = (updated) => {
    setNotificationsData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notification) =>
        notification.id === updated.id ? updated : notification,
      ),
    }));
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead({ headers })
      .then(() => {
        setNotificationsData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((notification) => ({ ...notification, read: true })),
        }));
        setUnreadCount(0);
      })
      .catch(console.error);
  };

  return (
    <div className="notifications-page">
      <ContainerRow type="page">
        <div className="col-md-9 offset-md-1">
          <div className="notifications-header">
            <h1>Notifications</h1>
            {notifications.some((notification) => !notification.read) && (
              <button className="btn btn-sm btn-outline-primary" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-item">
              <em>Loading notifications...</em>
            </div>
          ) : notifications.length > 0 ? (
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  updateNotification={updateNotification}
                />
              ))}

              <NotificationsPagination
                notificationsCount={notificationsCount}
                updateNotifications={setNotificationsData}
              />
            </>
          ) : (
            <div className="notification-item">No notifications yet.</div>
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default Notifications;
