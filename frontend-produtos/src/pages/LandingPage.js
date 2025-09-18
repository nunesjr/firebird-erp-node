import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';
import logo from '../assets/logo.jpg';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <div className="logo-container">
            <img src={logo} alt="Frutos da Terra Logo" className="logo-image" />
            <h1 className="logo-text">Frutos da Terra</h1>
          </div>
          <nav>
            <ul className="nav-links">
              <li><a href="#about">Sobre Nós</a></li>
              <li><a href="#services">Serviços</a></li>
              <li><a href="#contact">Contato</a></li>
              <li><Link to="/login" className="btn-login">Login</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <section className="hero-section">
        <div className="container">
          <h2>Qualidade e Frescor, Direto do Campo para Você</h2>
          <p>A sua distribuidora de confiança em Uberaba e região, especializada em frutas, legumes e verduras frescas.</p>
          <a href="https://wa.me/message/SMC6TOXWTCEMP1" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">Fale Conosco no WhatsApp</a>
        </div>
      </section>

      <section id="about" className="about-section">
        <div className="container">
          <h3 className="section-title">Sobre a Frutos da Terra</h3>
          <p>A Frutos da Terra Comércio & Distribuidora LTDA é uma empresa especializada na distribuição de frutas, legumes e verduras frescas para comércios, restaurantes, mercados e instituições em geral. Com sede em Uberaba-MG, temos orgulho em oferecer produtos selecionados diretamente do campo para sua empresa, com agilidade, segurança e um compromisso constante com a qualidade.</p>
        </div>
      </section>

      <section id="services" className="services-section">
        <div className="container">
          <h3 className="section-title">Nossos Serviços</h3>
          <div className="service-cards">
            <div className="card">
              <h4>🚚 Distribuição de Hortifrúti</h4>
              <p>Atendimento rápido e eficiente com entregas programadas para garantir produtos sempre frescos.</p>
            </div>
            <div className="card">
              <h4>🤝 Atendimento Personalizado</h4>
              <p>Equipe dedicada a entender as necessidades de cada cliente, oferecendo soluções sob medida.</p>
            </div>
            <div className="card">
              <h4>⭐ Seleção de Qualidade</h4>
              <p>Trabalhamos com rigoroso controle de qualidade, desde a origem até a entrega.</p>
            </div>
            <div className="card">
              <h4>📍 Atuação Regional</h4>
              <p>Atendemos Uberaba e região com frota própria e logística eficiente.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="container">
          <h3 className="section-title">Fale Conosco</h3>
          <p>Estamos prontos para atender seu negócio com excelência.</p>
          <p><strong>E-mail:</strong> administrativo@frutosdaterra.com.br</p>
          <p><strong>Telefone:</strong> (34) 3313-1100</p>
          <a href="https://wa.me/message/SMC6TOXWTCEMP1" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">Fale Conosco no WhatsApp</a>
          <p><strong>Endereço:</strong> Av. José Solé Filho, 237 - Uberaba, MG</p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Frutos da Terra Comércio & Distribuidora LTDA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
