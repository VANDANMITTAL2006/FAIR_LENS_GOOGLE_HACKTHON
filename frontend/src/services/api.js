// Use empty string so requests go through Vite dev proxy (same-origin).
// Set VITE_API_BASE_URL only when the frontend is served separately from the backend.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

export async function uploadFile(file) {
  // Pre-flight validation — catch the problem before the request
  if (!file) {
    throw new Error('No file provided to uploadFile().');
  }
  if (!(file instanceof Blob)) {
    throw new Error(`uploadFile() expected a File/Blob but got: ${typeof file}`);
  }

  console.log('[FairLens] Uploading file:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  });

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser must set it with boundary
  });

  // FastAPI 422 returns { detail: [{ loc, msg, type }] }
  if (!response.ok) {
    let errorMsg = `Upload failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      console.error('[FairLens] Upload error response:', body);
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
  console.log('[FairLens] Upload response:', JSON.stringify(result, null, 2));

  // Check for backend-level error (200 OK but success: false)
  if (result?.success === false) {
    throw new Error(result?.error || result?.detail || 'Upload returned failure');
  }

  return result;
}

/**
 * Extract upload_id defensively from the upload response.
 * Handles both { data: { upload_id } } and { upload_id } shapes.
 */
export function extractUploadId(uploadRes) {
  return uploadRes?.data?.upload_id || uploadRes?.upload_id || null;
}

export async function runAudit(uploadId) {
  if (!uploadId) {
    throw new Error('Missing upload_id — cannot run audit.');
  }

  const response = await fetch(
    `${API_BASE}/audit?upload_id=${encodeURIComponent(String(uploadId))}`,
    { method: 'POST' },
  );

  const result = await parseResponse(response);
  console.log('[FairLens] Audit response status:', result?.status ?? 'ok');
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
