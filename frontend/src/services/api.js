import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getSuppliers = () => API.get("/suppliers");

export const generatePrescriptions = (supplier, quantity) =>
  API.post("/prescriptions", {
    supplier,
    quantity: Number(quantity),
  });

export const executePrescription = (data) =>
  API.post("/prescriptions/execute", data);

export default API;