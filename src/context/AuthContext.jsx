import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'recepcion', password: 'recepcion123', role: 'recepcionista' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (username, password) => {
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setUser(found);
      localStorage.setItem('auth', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}