import React, { useState, useEffect } from 'react';
import '../styles/common.css';
import './FazerPedido.css'; // Importando o CSS específico
import { useAuth } from '../context/AuthContext';
import Cookies from 'js-cookie';

// --- Componente do Carrinho ---
const Carrinho = ({ itens, onUpdate, onRemove, onSend }) => {
    const calcularTotal = () => {
        return itens.reduce((total, item) => total + item.precoFinal * item.quantidade, 0);
    };

    return (
        <div className="table-container">
            <table className="data-table-fp">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Preço Unit.</th>
                        <th className="th-quantity">Quantidade</th>
                        <th>Subtotal</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map(item => (
                        <tr key={item.codigo}>
                            <td>{item.descricao}</td>
                            <td className="currency-fp">{item.precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td>
                                <div className="quantity-controls">
                                    <button onClick={() => onUpdate(item.codigo, item.quantidade - 1)} className="btn-quantity">-</button>
                                    <input
                                        type="number"
                                        value={item.quantidade}
                                        onChange={(e) => {
                                            const newQuantity = parseInt(e.target.value, 10);
                                            onUpdate(item.codigo, isNaN(newQuantity) ? 0 : newQuantity);
                                        }}
                                        className="quantity-input"
                                    />
                                    <button onClick={() => onUpdate(item.codigo, item.quantidade + 1)} className="btn-quantity">+</button>
                                </div>
                            </td>
                            <td className="currency-fp">{(item.precoFinal * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td><button onClick={() => onRemove(item.codigo)} className="btn-delete-fp">Remover</button></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="3" className="text-right font-bold">Total do Pedido:</td>
                        <td className="currency-fp font-bold">{calcularTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <button onClick={onSend} className="btn-primary-fp btn-whatsapp">Enviar Pedido via WhatsApp</button>
        </div>
    );
};


// --- Componente Principal da Página ---
function FazerPedido() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('');

  const WHATSAPP_NUMBER = '553433131100'; // Substitua pelo número de WhatsApp da sua empresa

  // Efeito para buscar os produtos da API quando o componente montar
  useEffect(() => {
    if (!usuario) {
        setLoading(false);
        return;
    }

    const fetchProdutos = async () => {
      try {
        const token = Cookies.get('token');
        if (!token) {
            setError('Token de autenticação não encontrado.');
            setLoading(false);
            return;
        }
        const response = await fetch('/api/cliente/produtos-disponiveis', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Não foi possível carregar os produtos.');
        const data = await response.json();
        setProdutos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, [usuario]);

  const calcularPrecoFinal = (produto) => {
    // Se o produto for do tipo 'KIT', não aplica o desconto do convênio
    if (produto.tipoProduto === 'KIT') {
      return produto.precoVenda;
    }

    if (!usuario || !usuario.convenioDesconto) return produto.precoVenda;
    const desconto = parseFloat(usuario.convenioDesconto);
    return produto.precoVenda * (1 - desconto / 100);
  };

  const handleAddToCart = (produto) => {
    setCarrinho(prevCarrinho => {
        const itemExistente = prevCarrinho.find(item => item.codigo === produto.codigo);
        if (itemExistente) {
            return prevCarrinho.map(item =>
                item.codigo === produto.codigo ? { ...item, quantidade: item.quantidade + 1 } : item
            );
        } else {
            const precoFinal = calcularPrecoFinal(produto); // Passa o objeto produto completo
            return [...prevCarrinho, { ...produto, quantidade: 1, precoFinal }];
        }
    });
  };

  const handleUpdateQuantidade = (codigo, novaQuantidade) => {
      if (novaQuantidade <= 0) {
          handleRemoveFromCart(codigo);
          return;
      }
      setCarrinho(prevCarrinho =>
          prevCarrinho.map(item => item.codigo === codigo ? { ...item, quantidade: novaQuantidade } : item)
      );
  };

  const handleRemoveFromCart = (codigo) => {
      setCarrinho(prevCarrinho => prevCarrinho.filter(item => item.codigo !== codigo));
  };

  const handleSendWhatsApp = () => {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
    }

    let mensagem = `*Olá, gostaria de fazer o seguinte pedido:*\n\n`;
    carrinho.forEach(item => {
        mensagem += `*Produto:* ${item.descricao}\n`;
        mensagem += `*Qtd:* ${item.quantidade}\n`;
        mensagem += `*Valor Unit.:* ${item.precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
        mensagem += `*Subtotal:* ${(item.precoFinal * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
        mensagem += `-------------------------------------\n`;
    });

    const totalPedido = carrinho.reduce((total, item) => total + item.precoFinal * item.quantidade, 0);
    mensagem += `\n*TOTAL DO PEDIDO: ${totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;

    const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
    window.open(linkWhatsApp, '_blank');
  };

  const produtosFiltrados = produtos.filter(p => p.descricao.toLowerCase().includes(filtro.toLowerCase()));

  if (loading) return <p>Carregando produtos...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="page-container">
      <h2>Fazer Pedido</h2>
      <p>Selecione os produtos abaixo para montar seu pedido.</p>

      <div className="carrinho-container mb-40">
        <h3>Carrinho de Pedido</h3>
        {carrinho.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
        ) : (
            <Carrinho itens={carrinho} onUpdate={handleUpdateQuantidade} onRemove={handleRemoveFromCart} onSend={handleSendWhatsApp} />
        )}
      </div>

      <div className="tabela-precos-container">
        <h3>Produtos Disponíveis</h3>
        <input
            type="text"
            placeholder="Buscar produto..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="form-control mb-20"
        />
        <div className="table-container">
            <table className="data-table-fp">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Preço Unitário</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {produtosFiltrados.map(produto => (
                        <tr key={produto.codigo}>
                            <td>{produto.descricao}</td>
                            <td className="currency-fp">{
                                calcularPrecoFinal(produto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            }</td>
                            <td>
                                <button onClick={() => handleAddToCart(produto)} className="btn-add-fp">Adicionar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default FazerPedido;
