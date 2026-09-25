import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function markAllNotificationsRead({ headers }) {
  try {
    const { data } = await axios({
      headers,
      method: "PUT",
      url: "api/notifications/read-all",
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default markAllNotificationsRead;
