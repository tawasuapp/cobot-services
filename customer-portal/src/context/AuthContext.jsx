import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const data = localStorage.getItem('customer_data');
    if (token && data) {
      try {
        setCustomer(JSON.parse(data));
      } catch {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/customer-login', { email, password });
    const { token, customer: customerData } = response.data;
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_data', JSON.stringify(customerData));
    setCustomer(customerData);
    return customerData;
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_data');
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
