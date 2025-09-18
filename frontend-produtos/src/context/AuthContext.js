import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarToken = async () => {
      const token = Cookies.get('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // ✨ CORRIGIDO: URL relativa para usar o proxy do Nginx.
        const response = await fetch('/api/verify-token', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          Cookies.remove('token');
          setUser(null);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.valid && data.user) {
          setUser(data.user);
        } else {
          Cookies.remove('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        Cookies.remove('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verificarToken();
  }, []);

        const login = async (username, password) => {
    try {
      const response = await fetch('/api/login', { // Use o endpoint completo
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      // Verifica se a resposta foi OK primeiro
      if (!response.ok) {
        // Tenta parsear a mensagem de erro JSON, ou usa statusText como fallback
        const errorData = await response.json().catch(() => ({ message: response.statusText || 'Erro desconhecido' }));
        setUser(null);
        Cookies.remove('token');
        // CORREÇÃO AQUI: Acessa a mensagem de erro aninhada
        return { success: false, message: errorData.error?.message || errorData.message || 'Usuário ou senha inválidos.' };
      }

      // Se a resposta foi OK, prossegue para parsear JSON
      const data = await response.json();

      if (data.user && data.token) { // response.ok já é true aqui
        setUser(data.user);
        Cookies.set('token', data.token, { expires: 1 });
        return { success: true };
      } else {
        // Este bloco else idealmente não deveria ser alcançado se response.ok for true
        // mas data.user ou data.token estiverem faltando.
        setUser(null);
        Cookies.remove('token');
        return { success: false, message: data.error || 'Erro ao autenticar' };
      }
    } catch (err) {
      console.error("Erro inesperado na função login:", err); // Loga o erro real
      setUser(null);
      Cookies.remove('token');
      return { success: false, message: 'Erro de conexão com o servidor.' };
    }
  };

  const logout = () => {
    setUser(null);
    Cookies.remove('token');
  };

  const hasPermission = useCallback((permission) => {
    if (!usuario || !usuario.permissions) {
      return false;
    }
    return usuario.permissions.includes(permission);
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);