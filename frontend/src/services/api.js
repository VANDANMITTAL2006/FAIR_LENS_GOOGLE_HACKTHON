// FairLens API Service
// All requests go to the Railway-deployed FastAPI backend.
const API_BASE = 'https://web-production-dfc61.up.railway.app';
const REQUEST_TIMEOUT_MS = 30000;

function normalizeError(message, fallback) {
  return new Error(message || fallback);
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: 'omit',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        throw normalizeError(`Server returned invalid JSON (HTTP ${response.status})`, 'Request failed');
      }
    } else {
      const text = await response.text();
      payload = text ? { detail: text } : null;
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.error || `Request failed (HTTP ${response.status})`;
      throw normalizeError(String(detail), 'Request failed');
    }

    if (payload?.success === false) {
      throw normalizeError(payload?.error || payload?.detail, 'Request failed');
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof TypeError && /fetch/i.test(String(error?.message || ''))) {
      throw new Error('Unable to reach the FairLens API. Please check your network or try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractData(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if ('data' in payload) {
    return payload.data;
  }

  if (payload.success === true && 'result' in payload) {
    return payload.result;
  }

  return payload;
}

/**
 * POST /upload — Upload a CSV file.
 * Returns: { success: true, data: { upload_id: "...", rows, columns, ... } }
 */
export async function uploadFile(file) {
  if (!file) throw new Error('No file provided to uploadFile().');
  if (!(file instanceof Blob)) throw new Error(`uploadFile() expected a File/Blob`);

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');

  return requestJson(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary
  });
}

export const uploadDataset = uploadFile;

/**
 * Extract upload_id from the upload response.
 * Backend returns: { success: true, data: { upload_id: "..." } }
 */
export function extractUploadId(uploadRes) {
  return uploadRes?.data?.upload_id
    || uploadRes?.data?.job_id
    || uploadRes?.upload_id
    || uploadRes?.job_id
    || null;
}

/**
 * POST /audit?upload_id=<id>
 * Uses the router-based audit endpoint (query param style).
 */
export async function runAudit(uploadId) {
  if (!uploadId) throw new Error('upload_id missing from upload response');

  return requestJson(`${API_BASE}/audit?upload_id=${encodeURIComponent(uploadId)}`, {
    method: 'POST',
  });
}

export async function startAuditAsync(payload) {
  const uploadId = payload?.upload_id || payload?.dataset_id || payload?.job_id || null;
  if (!uploadId) {
    throw new Error('dataset_id or upload_id missing from audit request');
  }

  const response = await runAudit(uploadId);
  return {
    success: true,
    data: {
      job_id: uploadId,
      ...extractData(response),
    },
  };
}

export function streamAudit(jobId, handlers = {}) {
  const { onOpen, onEvent, onError } = handlers;
  let cancelled = false;

  Promise.resolve()
    .then(() => {
      if (cancelled) return null;
      onOpen?.();
      return runAudit(jobId);
    })
    .then((result) => {
      if (cancelled || !result) return;
      onEvent?.({
        stage: 'completed',
        progress: 100,
        message: 'Audit complete',
        done: true,
        result: extractData(result) || result,
      });
    })
    .catch((error) => {
      if (cancelled) return;
      onError?.(error);
    });

  return {
    close() {
      cancelled = true;
    },
  };
}

/**
 * POST /api/debias
 * Returns strategies with fairness_before / fairness_after.
 */
export async function runDebias(payload = {}) {
  const file = payload.file;
  const labelCol = payload.labelCol || payload.label_column || payload.labelColumn;
  const protectedCol = payload.protectedCol || payload.protected_column || payload.protectedColumn;
  const privilegedGroup = payload.privilegedGroup || payload.privileged_group || '1';

  if (!file) {
    throw new Error('Debias request is missing the dataset file.');
  }
  if (!labelCol) {
    throw new Error('Debias request is missing the label column.');
  }
  if (!protectedCol) {
    throw new Error('Debias request is missing the protected column.');
  }

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');
  formData.append('label_col', labelCol);
  formData.append('protected_col', protectedCol);
  formData.append('privileged_group', String(privilegedGroup));

  return requestJson(`${API_BASE}/api/debias`, {
    method: 'POST',
    body: formData,
  });
}

export async function getReport(uploadId) {
  return {
    success: true,
    data: {
      upload_id: uploadId,
      generated_at: new Date().toISOString(),
      source: 'client-side-compatibility-layer',
    },
  };
}

export { API_BASE };
