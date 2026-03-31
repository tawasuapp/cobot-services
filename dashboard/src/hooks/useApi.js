import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { immediate = true, params = {} } = options;

  const fetchData = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get(url, { params: overrideParams || params });
      setData(result);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) fetchData();
  }, [immediate, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (method, url, body) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api[method](url, body);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
