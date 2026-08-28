import apiClient from "./services.js";

const ListServices = {
  getLists() {
    return apiClient.get("lists");
  },
  createList(data) {
    return apiClient.post("lists", data);
  },
  updateList(id, data) {
    return apiClient.put(`lists/${id}`, data);
  },
  deleteList(id) {
    return apiClient.delete(`lists/${id}`);
  },
};

export default ListServices;
