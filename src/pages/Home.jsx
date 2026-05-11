import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = () => navigate('/login');

  return (
    <div 
      className="relative flex flex-col items-center justify-center h-screen bg-cover bg-center"
      // CORRECCIÓN: Esta es la sintaxis correcta para Vite
      style={{ backgroundImage: `url('/hotel-background.jpg')` }}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>

      <div className="relative z-10 flex flex-col items-center text-center animate-fadeIn">
        <h1 className="text-5xl font-bold text-white mb-8 drop-shadow-lg">
          Hotel San Carlos POS
        </h1>
        <button
          onClick={handleStart}
          className="bg-blue-600 text-white font-bold py-3 px-10 rounded-full hover:bg-blue-700 transition text-lg drop-shadow-lg"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}

export default Home;