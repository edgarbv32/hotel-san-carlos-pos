import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    const success = login(form.username, form.password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Iniciar Sesión</h1>
        {error && <p className="text-red-600 text-center text-sm">{error}</p>}
        <input
          name="username"
          placeholder="Usuario"
          className="w-full border p-2 rounded"
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          className="w-full border p-2 rounded"
          onChange={handleChange}
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;