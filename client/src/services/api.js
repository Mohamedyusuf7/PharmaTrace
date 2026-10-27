const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('aegis_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth & System Reset
  login: (credentials, password) => {
    const payload = typeof credentials === 'object'
      ? credentials
      : { username: credentials, password };
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handleResponse);
  },

  switchRole: (targetRole) =>
    fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole })
    }).then(handleResponse),

  resetFreshSlate: () =>
    fetch(`${API_BASE}/auth/reset-fresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(handleResponse),

  getProfile: () =>
    fetch(`${API_BASE}/auth/profile`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  getUsers: () =>
    fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  registerUser: (userData) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    }).then(handleResponse),

  updatePin: (currentPassword, newPin) =>
    fetch(`${API_BASE}/auth/update-pin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPin })
    }).then(handleResponse),

  // Raw Materials
  getMaterials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/materials${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
  },

  getMaterialById: (id) =>
    fetch(`${API_BASE}/materials/${id}`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  intakeShipment: (shipmentData) =>
    fetch(`${API_BASE}/materials/shipment-intake`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(shipmentData)
    }).then(handleResponse),

  intakeMaterialShipment: (shipmentData) =>
    fetch(`${API_BASE}/materials/shipment-intake`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(shipmentData)
    }).then(handleResponse),

  quarantineAction: (id, payload) =>
    fetch(`${API_BASE}/materials/${id}/quarantine-action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  validateBom: (formulationId) =>
    fetch(`${API_BASE}/materials/validate-bom/${formulationId}`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  // Formulations
  getFormulations: () =>
    fetch(`${API_BASE}/formulations`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  getFormulationById: (id) =>
    fetch(`${API_BASE}/formulations/${id}`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  createFormulation: (formulationData) =>
    fetch(`${API_BASE}/formulations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formulationData)
    }).then(handleResponse),

  // Batches / EBR
  getBatches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/batches${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
  },

  getBatchById: (id) =>
    fetch(`${API_BASE}/batches/${id}`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  initializeBatch: (payload) =>
    fetch(`${API_BASE}/batches/initialize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  createBatch: (payload) =>
    fetch(`${API_BASE}/batches/initialize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  linkMaterialToBatch: (batchId, payload) =>
    fetch(`${API_BASE}/batches/${batchId}/link-material`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  logBatchParameters: (batchId, payload) =>
    fetch(`${API_BASE}/batches/${batchId}/log-parameters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  completeStage: (batchId, stageNumber) =>
    fetch(`${API_BASE}/batches/${batchId}/complete-stage`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stageNumber })
    }).then(handleResponse),

  qaSignOffStage: (batchId, stageNumber, payload = {}) =>
    fetch(`${API_BASE}/batches/${batchId}/sign-off-stage`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stageNumber, ...payload })
    }).then(handleResponse),

  signOffStage: (batchId, payload) =>
    fetch(`${API_BASE}/batches/${batchId}/sign-off-stage`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  finalBatchRelease: (batchId, payload) =>
    fetch(`${API_BASE}/batches/${batchId}/final-release`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  // Quality Control
  getQcDashboard: () =>
    fetch(`${API_BASE}/qc/dashboard`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  submitLabResults: (batchId, tests) =>
    fetch(`${API_BASE}/qc/batches/${batchId}/lab-results`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tests })
    }).then(handleResponse),

  // Deviations & CAPA
  getDeviations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/deviations${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
  },

  logDeviation: (deviationData) =>
    fetch(`${API_BASE}/deviations/log`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(deviationData)
    }).then(handleResponse),

  updateCapa: (id, capaData) =>
    fetch(`${API_BASE}/deviations/${id}/capa`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(capaData)
    }).then(handleResponse),

  resolveDeviation: (id, payload) =>
    fetch(`${API_BASE}/deviations/${id}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }).then(handleResponse),

  // Audit Trail
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/audit${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
  },

  verifyLedgerIntegrity: () =>
    fetch(`${API_BASE}/audit/verify-integrity`, {
      headers: getAuthHeaders()
    }).then(handleResponse)
};
