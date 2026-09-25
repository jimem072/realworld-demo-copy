import { NavLink } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

function NotificationBell() {
  const { unreadCount } = useNotifications();
  const activeClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

  return (
    <li className="nav-item">
      <NavLink className={activeClass} end to="/notifications">
        <i className="ion-ios-bell"></i> Notifications
        {unreadCount > 0 && <span className="badge badge-pill">{unreadCount}</span>}
      </NavLink>
    </li>
  );
}

export default NotificationBell;
