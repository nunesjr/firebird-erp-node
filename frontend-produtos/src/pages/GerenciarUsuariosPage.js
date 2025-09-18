import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import '../styles/common.css';
import './GerenciarUsuariosPage.css';

// Definindo as permissões disponíveis
const AVAILABLE_PERMISSIONS = [
  'VIEW_RESUMO_VENDAS',
  'VIEW_FINANCEIRO',
  'VIEW_ESTOQUE_NEGATIVO',
  'VIEW_CUSTO_REPOSICAO',
  'VIEW_FORNECEDORES',
  'VIEW_PEDIDO_COMPRAS',
  'VIEW_MINHAS_COMPRAS',
  'VIEW_MAPA_CLIENTES',
  'VIEW_LIBERAR_RDP',
  'VIEW_RDP_LOGS',
  'VIEW_FECHAMENTO_FISCAL',
  'VIEW_VENDAS_TEMPO_REAL',
  'VIEW_POR_SECAO',
  'VIEW_TABELA_PRECOS',
  'VIEW_DOWNLOADS_PDF',
  'MANAGE_USERS',
  'MANAGE_ENTREGAS',
  'VIEW_PRECOS_VENDA'
  // Adicione outras permissões aqui conforme necessário
];

// Definindo o componente principal
const GerenciarUsuariosPage = () => {
  // Estados para dados e UI
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  // Estados para o formulário
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [codigoCliente, setCodigoCliente] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]); // Novo estado para permissões

  // UseEffect para carregar os usuários quando a página é montada
  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Função para buscar a lista de usuários
  const fetchUsuarios = async () => {
    const token = Cookies.get('token');
    if (!token) {
      setErro('Sessão expirada. Por favor, faça login novamente.');
      setLoading(false);
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    try {
      setLoading(true);
      setErro(null);
      // A URL da rota que você forneceu é '/users'
      const response = await axios.get('/api/users', config);
      setUsuarios(response.data);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      if (err.response?.status === 401) {
        setErro('Sessão expirada ou acesso negado. Faça login novamente com uma conta de administrador.');
      } else {
        setErro('Erro ao carregar a lista de usuários. Verifique a conexão com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir o modal de criação/edição
  const handleAbrirModal = (usuario = null) => {
    if (usuario) {
      setModoEdicao(true);
      setUsuarioSelecionado(usuario);
      setUsername(usuario.username);
      setRole(usuario.role);
      setCodigoCliente(usuario.codigoCliente || '');
      setPassword(''); // Deixar a senha vazia por segurança
      setSelectedPermissions(usuario.permissions || []); // Carrega as permissões existentes
    } else {
      setModoEdicao(false);
      setUsuarioSelecionado(null);
      setUsername('');
      setPassword('');
      setRole('user');
      setCodigoCliente('');
      setSelectedPermissions([]); // Limpa as permissões para novo usuário
    }
    setModalOpen(true);
  };

  // Função para fechar o modal
  const handleFecharModal = () => {
    setModalOpen(false);
  };

  // Função para lidar com a mudança de permissões
  const handlePermissionChange = (permission) => {
    setSelectedPermissions(prevPermissions =>
      prevPermissions.includes(permission)
        ? prevPermissions.filter(p => p !== permission)
        : [...prevPermissions, permission]
    );
  };

  // Função para submeter o formulário (criar ou editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = Cookies.get('token');
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    const dadosUsuario = {
      username,
      password,
      role,
      codigoCliente: codigoCliente ? parseInt(codigoCliente) : null,
      permissions: selectedPermissions, // Inclui as permissões selecionadas
    };

    // Ajusta os dados para a API de acordo com o modo
    if (!password) {
      delete dadosUsuario.password;
    }

    try {
      setErro(null);
      if (modoEdicao) {
        // Rota de atualização: PUT /api/users/:id
        await axios.put(`/api/users/${usuarioSelecionado.id}`, dadosUsuario, config);
        alert('Usuário atualizado com sucesso!');
      } else {
        // Rota de criação: POST /api/users (agora usando a rota de criação de usuário com permissões)
        await axios.post('/api/users', dadosUsuario, config);
        alert('Usuário criado com sucesso!');
      }

      handleFecharModal();
      fetchUsuarios(); // Recarrega a lista para mostrar a mudança
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      if (err.response) {
        setErro(err.response.data.error || 'Erro ao salvar usuário. Verifique os dados.');
      } else {
        setErro('Erro de conexão. Não foi possível salvar o usuário.');
      }
    }
  };

  // Função para deletar um usuário
  const handleDeletar = async (id, username) => {
    if (window.confirm(`Tem certeza que deseja deletar o usuário "${username}"?`)) {
      const token = Cookies.get('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      try {
        setErro(null);
        // Rota de exclusão: DELETE /api/users/:id
        await axios.delete(`/api/users/${id}`, config);
        alert('Usuário deletado com sucesso!');
        fetchUsuarios(); // Recarrega a lista
      } catch (err) {
        console.error('Erro ao deletar usuário:', err);
        if (err.response) {
          setErro(err.response.data.error || 'Erro ao deletar usuário.');
        } else {
          setErro('Erro de conexão. Não foi possível deletar o usuário.');
        }
      }
    }
  };

  // Renderização condicional
  if (loading) {
    return (
      <div className="erp-main-content">
        <p className="loading-message">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="erp-main-content">
      <div className="erp-content-header">
        <h2>Gerenciamento de Usuários</h2>
        <p>Área de administração para visualizar, criar, editar e deletar contas de usuário.</p>
      </div>

      <div className="controls-container">
        <button onClick={() => handleAbrirModal()} className="btn-add-uo">
          + Novo Usuário
        </button>
      </div>

      {erro && (
        <div className="error-message">
          <p>{erro}</p>
        </div>
      )}

      <div className="results-container">
        <div className="table-container">
          <table className="data-table-up">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome de Usuário</th>
                <th>Perfil</th>
                <th>Código Cliente</th>
                <th>Permissões</th>{/* Nova coluna para permissões */}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length > 0 ? (
                usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td>{usuario.id}</td>
                    <td>{usuario.username}</td>
                    <td>{usuario.role}</td>
                    <td>{usuario.codigoCliente || 'N/A'}</td>
                    <td>
                      {usuario.permissions && usuario.permissions.length > 0
                        ? usuario.permissions.join(', ')
                        : 'Nenhuma'}
                    </td>{/* Exibe as permissões */}
                    <td className="actions">
                      <button 
                        onClick={() => handleAbrirModal(usuario)} 
                        className="btn-edit"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeletar(usuario.id, usuario.username)} 
                        className="btn-delete-up"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">{/* Colspan ajustado */} 
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Adicionar/Editar Usuário */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="btn-close" onClick={handleFecharModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>Nome de Usuário:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={modoEdicao}
                  required
                />
                {modoEdicao && <p className="info-text">O nome de usuário não pode ser alterado.</p>}
              </div>
              <div className="form-group">
                <label>Senha:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={modoEdicao ? 'Deixe em branco para não alterar' : 'Digite uma senha'}
                  required={!modoEdicao}
                />
              </div>
              <div className="form-group">
                <label>Perfil (Role):</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="user">Usuário Comum</option>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label>Código do Cliente (Opcional):</label>
                <input
                  type="number"
                  value={codigoCliente}
                  onChange={(e) => setCodigoCliente(e.target.value)}
                  placeholder="Ex: 12345"
                />
                <p className="info-text">Obrigatório para o perfil "Cliente".</p>
              </div>

              {/* Seção de Permissões */}
              <div className="form-group permissions-group">
                <label>Permissões:</label>
                {AVAILABLE_PERMISSIONS.map(permission => (
                  <div key={permission} className="permission-item">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onChange={() => handlePermissionChange(permission)}
                    />
                    <label htmlFor={permission}>{permission}</label>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  {modoEdicao ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
                <button type="button" onClick={handleFecharModal} className="btn-cancel">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarUsuariosPage;
