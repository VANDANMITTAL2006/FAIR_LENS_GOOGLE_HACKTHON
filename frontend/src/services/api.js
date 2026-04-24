// FairLens API Service
// All requests go to the FastAPI backend on port 8000
const API_BASE = "http://127.0.0.1:8000";

async function parseResponse(response) {
  const payload = await response.json();
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
  if (!file) {
    throw new Error('No file provided to uploadFile().');
  }
  if (!(file instanceof Blob)) {
    throw new Error(`uploadFile() expected a File/Blob but got: ${typeof file}`);
  }

  console.log('Uploading file...', {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser must set it with multipart boundary
  });

  if (!response.ok) {
    let errorMsg = `Upload failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      console.error('Upload error response:', body);
      if (Array.isArray(body?.detail)) {
        errorMsg = body.detail.map((d) => d.msg || d.type).join('; ');
      } else if (body?.detail) {
        errorMsg = String(body.detail);
      } else if (body?.error) {
        errorMsg = String(body.error);
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  console.log('UPLOAD RESPONSE:', result);

  if (result?.success === false) {
    throw new Error(result?.error || result?.detail || 'Upload returned failure');
  }

  return result;
}

/**
 * Extract upload_id from the upload response.
 * Backend returns: { success: true, data: { upload_id: "..." } }
 */
export function extractUploadId(uploadRes) {
  const id = uploadRes?.data?.upload_id || uploadRes?.upload_id || null;
  console.log('Extracted dataset_id:', id);
  return id;
}

/**
 * POST /audit — Run fairness audit.
 *
 * CRITICAL: The backend accepts upload_id as a QUERY PARAMETER, not JSON body.
 *   @router.post("/audit")
 *   async def audit_endpoint(upload_id: str | None = Query(default=None), ...)
 *
 * So the correct call is: POST /audit?upload_id=<id>
 */
export async function runAudit(uploadId) {
  if (!uploadId) {
    console.error('dataset_id missing — cannot call /audit');
    throw new Error('dataset_id missing from upload response');
  }

  console.log('Sending audit request with dataset_id:', uploadId);

  const response = await fetch(`${API_BASE}/audit?upload_id=${encodeURIComponent(uploadId)}`, {
    method: 'POST',
  });

  const result = await parseResponse(response);
  console.log('AUDIT RESPONSE:', result);
  return result;
}

export async function runDebias({ file, labelCol, protectedCol, privilegedGroup }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('label_col', labelCol);
  formData.append('protected_col', protectedCol);
  formData.append('privileged_group', privilegedGroup);

  const response = await fetch(`${API_BASE}/api/debias`, {
    method: 'POST',
    body: formData,
  });

  return parseResponse(response);
}
