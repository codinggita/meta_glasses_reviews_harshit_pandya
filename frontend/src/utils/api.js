// Base client engine helper
export const getAuthHeaders = () => {
  const token = localStorage.getItem('metaLens_accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const getSessionUser = () => {
  const token = localStorage.getItem('metaLens_accessToken');
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  // Check expiration
  const now = Date.now() / 1000;
  if (decoded.exp && decoded.exp < now) {
    localStorage.removeItem('metaLens_accessToken');
    localStorage.removeItem('metaLens_refreshToken');
    localStorage.removeItem('metaLens_user');
    return null;
  }
  return decoded;
};

export const attemptTokenRefresh = async () => {
  const refreshToken = localStorage.getItem('metaLens_refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch('/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (response.status === 200) {
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('metaLens_accessToken', data.accessToken);
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to rotate refresh token:', e);
  }

  localStorage.removeItem('metaLens_accessToken');
  localStorage.removeItem('metaLens_refreshToken');
  localStorage.removeItem('metaLens_user');
  return false;
};

export const apiCall = async (method, path, body = null, headers = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...headers
  };

  const options = {
    method,
    headers: defaultHeaders
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    let response = await fetch(path, options);
    let resBody = null;
    try {
      resBody = await response.json();
    } catch (e) {
      // Ignore non-json or empty response
    }

    if (response.status === 401 && localStorage.getItem('metaLens_refreshToken')) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        options.headers['Authorization'] = `Bearer ${localStorage.getItem('metaLens_accessToken')}`;
        response = await fetch(path, options);
        try {
          resBody = await response.json();
        } catch (e) {}
      }
    }

    return { status: response.status, body: resBody };
  } catch (error) {
    console.error(`API Call failed to ${path}:`, error);
    return { status: 500, body: { message: 'Failed to complete API handshakes.' } };
  }
};
