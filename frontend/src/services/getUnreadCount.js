import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getUnreadCount({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/notifications/unread-count" });

    return data.unreadCount;
  } catch (error) {
    errorHandler(error);
  }
}

export default getUnreadCount;
