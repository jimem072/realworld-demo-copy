import ReactPaginate from "react-paginate";
import { useAuth } from "../../context/AuthContext";
import getNotifications from "../../services/getNotifications";

function NotificationsPagination({ notificationsCount, updateNotifications }) {
  const totalPages = Math.ceil(notificationsCount / 10);
  const { headers } = useAuth();

  const handlePageChange = ({ selected: page }) => {
    getNotifications({ headers, page })
      .then(updateNotifications)
      .catch(console.error);
  };

  return (
    <ReactPaginate
      activeClassName="active"
      breakClassName="page-item"
      breakLabel="..."
      breakLinkClassName="page-link"
      containerClassName="pagination pagination-sm"
      nextClassName="page-item"
      nextLabel={<i className="ion-arrow-right-b"></i>}
      nextLinkClassName="page-link"
      onPageChange={handlePageChange}
      pageClassName="page-item"
      pageCount={totalPages}
      pageLinkClassName="page-link"
      previousClassName="page-item"
      previousLabel={<i className="ion-arrow-left-b"></i>}
      previousLinkClassName="page-link"
      renderOnZeroPageCount={null}
    />
  );
}

export default NotificationsPagination;
