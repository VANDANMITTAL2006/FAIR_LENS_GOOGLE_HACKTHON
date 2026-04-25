// FairLens API Service
// All requests go to the FastAPI backend on port 8000
const API_BASE = "http://127.0.0.1:8000";

async function parseResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
  }
  if (!response.ok) {
    const detail = payload?.detail || payload?.error || 'Request failed';
    throw new Error(String(detail));
  }
  // Backend may return 200 with { success: false, error: "..." }
  if (payload?.success === false) {
    throw new Error(payload?.error || payload?.detail || 'Request failed');
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

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary
  });

  if (!response.ok) {
    let errorMsg = `Upload failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (Array.isArray(body?.detail)) {
        errorMsg = body.detail.map((d) => d.msg || d.type).join('; ');
      } else if (body?.detail) {
        errorMsg = String(body.detail);
      } else if (body?.error) {
        errorMsg = String(body.error);
      }
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  if (result?.success === false) {
    throw new Error(result?.error || 'Upload returned failure');
  }
  return result;
}

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

  const response = await fetch(
    `${API_BASE}/audit?upload_id=${encodeURIComponent(uploadId)}`,
    { method: 'POST' }
  );

  const result = await parseResponse(response);
  return result;
}

/**
 * POST /api/debias
 * Returns strategies with fairness_before / fairness_after.
 */
export async function runDebias({ file, labelCol, protectedCol, privilegedGroup }) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');
  formData.append('label_col', labelCol);
  formData.append('protected_col', protectedCol);
  formData.append('privileged_group', String(privilegedGroup));

  const response = await fetch(`${API_BASE}/api/debias`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse(response);
}
