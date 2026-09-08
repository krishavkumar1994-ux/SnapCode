const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function extractCode(file) {
  const formData = new FormData();
  formData.append('image', file);

  let response;
  try {
    response = await fetch(`${apiUrl}/api/extract`, {
      method: 'POST',
      body: formData
    });
  } catch {
    throw new Error('Could not reach the extraction server. Is the backend running?');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The extraction server returned an invalid response.');
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Code extraction failed.');
  }

  return result.code;
}
