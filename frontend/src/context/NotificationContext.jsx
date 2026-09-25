import { createContext, useContext, useEffect, useState } from "react";
import getUnreadCount from "../services/getUnreadCount";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

function NotificationProvider({ children }) {
  const { headers } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!headers) return;

    getUnreadCount({ headers })
      .then(setUnreadCount)
      .catch(console.error);
  }, [headers]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
