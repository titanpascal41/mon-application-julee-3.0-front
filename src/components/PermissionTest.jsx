import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { setupTestUser, checkBackendHealth } from '../utils/authHelper';
import './PermissionTest.css';

const PermissionTest = () => {
  const { user, login, logout, refreshPermissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState(null);

  const checkBackend = async () => {
    setLoading(true);
    try {
      const isHealthy = await checkBackendHealth();
      setBackendStatus(isHealthy ? '✅ Backend accessible' : '❌ Backend inaccessible');
      setMessage(isHealthy ? 'Le backend est accessible!' : 'Le backend n\'est pas accessible. Veuillez le démarrer.');
    } catch (error) {
      setBackendStatus('❌ Erreur de connexion');
      setMessage('Erreur lors de la vérification du backend: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupTest = async () => {
    setLoading(true);
    try {
      setMessage('Création de l\'utilisateur de test...');
      const testUser = await setupTestUser();
      setMessage(`✅ Utilisateur de test créé et connecté: ${testUser.nom} ${testUser.prenom}`);
    } catch (error) {
      setMessage(`❌ Erreur lors du setup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      await login({
        email: 'test@example.com',
        password: 'Test123!'
      });
      setMessage('✅ Connexion réussie avec l\'utilisateur de test');
    } catch (error) {
      setMessage(`❌ Erreur de connexion: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setMessage('👋 Déconnexion réussie');
  };

  const handleRefreshPermissions = async () => {
    setLoading(true);
    try {
      await refreshPermissions();
      setMessage('🔄 Permissions rafraîchies avec succès');
    } catch (error) {
      setMessage(`❌ Erreur lors du rafraîchissement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="permission-test-container">
      <div className="test-header">
        <h1>🧪 Test du Système de Permissions</h1>
        <p>Cette page permet de tester le système complet de gestion des permissions.</p>
      </div>

      <div className="status-section">
        <h2>État du Système</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Utilisateur connecté:</span>
            <span className={`status-value ${user ? 'connected' : 'disconnected'}`}>
              {user ? `✅ ${user.nom} ${user.prenom}` : '❌ Non connecté'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Backend:</span>
            <span className="status-value">
              {backendStatus || '❓ Non vérifié'}
            </span>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <h2>Actions de Test</h2>
        <div className="actions-grid">
          <button 
            className="test-btn primary"
            onClick={checkBackend}
            disabled={loading}
          >
            {loading ? '⏳' : '🔍'} Vérifier le Backend
          </button>

          <button 
            className="test-btn secondary"
            onClick={setupTest}
            disabled={loading}
          >
            {loading ? '⏳' : '🚀'} Créer Utilisateur de Test
          </button>

          <button 
            className="test-btn secondary"
            onClick={testLogin}
            disabled={loading || !user}
          >
            {loading ? '⏳' : '🔑'} Se Connecter (Test)
          </button>

          <button 
            className="test-btn warning"
            onClick={handleRefreshPermissions}
            disabled={loading || !user}
          >
            {loading ? '⏳' : '🔄'} Rafraîchir Permissions
          </button>

          <button 
            className="test-btn danger"
            onClick={handleLogout}
            disabled={!user}
          >
            {loading ? '⏳' : '🚪'} Se Déconnecter
          </button>
        </div>
      </div>

      {message && (
        <div className="message-section">
          <h2>Résultat</h2>
          <div className={`message-box ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
            {message}
          </div>
        </div>
      )}

      {user && (
        <div className="user-info-section">
          <h2>Informations Utilisateur</h2>
          <div className="user-details">
            <div className="detail-item">
              <span className="detail-label">Nom:</span>
              <span className="detail-value">{user.nom} {user.prenom}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">ID Profil:</span>
              <span className="detail-value">{user.profilId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Nom Profil:</span>
              <span className="detail-value">{user.profil?.nom || 'Non défini'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="instructions-section">
        <h2>Instructions</h2>
        <ol className="instructions-list">
          <li><strong>Vérifier le Backend:</strong> Assurez-vous que le backend est démarré sur le port 3001.</li>
          <li><strong>Créer Utilisateur de Test:</strong> Crée un utilisateur avec des permissions par défaut.</li>
          <li><strong>Se Connecter:</strong> Testez la connexion avec l'utilisateur créé.</li>
          <li><strong>Tester les Permissions:</strong> Naviguez dans l'application pour voir les permissions en action.</li>
          <li><strong>Vérifier les Permissions:</strong> Allez sur la page "Mes Permissions" pour voir vos droits.</li>
        </ol>
      </div>
    </div>
  );
};

export default PermissionTest;
