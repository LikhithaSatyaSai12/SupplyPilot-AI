import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// Suppliers
// ===============================

export const getSuppliers = () =>
  API.get("/suppliers");

// ===============================
// Prediction
// ===============================

export const predictSupplyRisk = (data) =>
  API.post("/predict", data);

// ===============================
// Recommendations
// ===============================

export const getRecommendations = (data) =>
  API.post("/recommendations", data);

// ===============================
// Prescriptions
// ===============================

export const generatePrescriptions = (supplier, quantity, data = {}) =>
  API.post("/prescriptions", {
    supplier,
    quantity: Number(quantity),
    ...data,
  });

export const executePrescription = (data) =>
  API.post("/prescriptions/execute", data);

// ===============================
// Executed Decisions
// ===============================

export const getExecutedDecisions = () =>
  API.get("/executed-decisions");

// ===============================
// Execution Outcomes
// ===============================

export const getExecutionOutcomes = () =>
  API.get("/execution-outcomes");

export const createExecutionOutcome = (data) =>
  API.post("/execution-outcomes", data);

// ===============================
// History
// ===============================

export const getHistory = () =>
  API.get("/history");
// ===============================
// Retraining
// ===============================

export const retrainModel = (data = {}) =>
  API.post("/retrain", data);

export const getRetrainingStatus = () =>
  API.get("/retrain/status");

export const getRetrainingHistory = () =>
  API.get("/retrain/history");

// ===============================
// Default Axios instance
// ===============================

export default API;