import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function markNotificationRead({ headers, id }) {
  try {
    const { data } = await axios({
      headers,
      method: "PUT",
      url: `api/notifications/${id}/read`,
    });

    return data.notification;
  } catch (error) {
    errorHandler(error);
  }
}

export default markNotificationRead;
