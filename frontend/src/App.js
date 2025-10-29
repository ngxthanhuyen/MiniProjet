import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5126";

// Composant Modal pour la suppression
const DeleteModal = ({ isOpen, onClose, onConfirm, filename }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Supprimer le fichier</h3>
        </div>
        <div className="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer le fichier :</p>
          <p className="filename">"{filename}"</p>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Annuler
          </button>
          <button className="confirm-delete-btn" onClick={onConfirm}>
            Oui, supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [page, setPage] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, filename: "" });

  const headers = token ? { Authorization: `Bearer ${token}`, Username: username } : {};

  // Reset du message quand on change de page
  useEffect(() => {
    setMessage("");
  }, [page]);

  const signup = async () => {
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      setMessage("Compte créé ! Connectez-vous");
      setPage("login");
    } catch (err) {
      setMessage("Erreur lors de l'inscription");
    }
  };

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);
      setMessage("Connecté !");
      fetchFiles(res.data.token);
      setPage("dashboard");
    } catch {
      setMessage("Identifiants incorrects");
    }
  };

  const fetchFiles = async (jwt) => {
    try {
      const res = await axios.get(`${API_URL}/files`, {
        headers: { Authorization: `Bearer ${jwt}`, Username: username },
      });
      setFiles(res.data);
    } catch {
      setMessage("Erreur lors du chargement des fichiers");
    }
  };

  const handleFilesChange = (e) => {
    if (e.target.files.length > 0) {
      setUploadFiles([...e.target.files]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setUploadFiles([...e.dataTransfer.files]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Fonction pour déclencher l'input file via le bouton
  const triggerFileInput = () => {
    document.getElementById('fileInput').click();
  };

  const handleUpload = async () => {
    if (!uploadFiles.length) return setMessage("Aucun fichier sélectionné");
    
    const formData = new FormData();
    uploadFiles.forEach((f) => formData.append("file", f));
    
    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setMessage("Fichiers uploadés !");
      setUploadFiles([]);
      fetchFiles(token);
    } catch {
      setMessage("Erreur lors de l'upload");
    }
  };

  const downloadFile = async (filename) => {
    try {
      const res = await axios.get(`${API_URL}/files/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}`, Username: username },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage(`Téléchargement de "${filename}"`);
    } catch {
      setMessage("Erreur lors du téléchargement");
    }
  };

  // Ouvrir le modal de suppression
  const openDeleteModal = (filename) => {
    setDeleteModal({ isOpen: true, filename });
  };

  // Fermer le modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, filename: "" });
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/files/${deleteModal.filename}`, { headers });
      setMessage("Fichier supprimé");
      fetchFiles(token);
      closeDeleteModal();
    } catch {
      setMessage("Erreur lors de la suppression");
      closeDeleteModal();
    }
  };

  const handleLogout = () => {
    setToken("");
    setUsername("");
    setPassword("");
    setFiles([]);
    setUploadFiles([]);
    setMessage("");
    localStorage.removeItem("token");
    setPage("login");
  };

  if (page === "login") {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo">
              <div className="logo-icon">☁️</div>
              <h1>MiniCloud</h1>
            </div>
            
            <div className="input-group">
              <input 
                placeholder="Ton pseudo" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Ton mot de passe" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            
            <button className="login-btn" onClick={login}>
              Se connecter
            </button>
            
            <p className="switch-mode" onClick={() => setPage("signup")}>
              Pas de compte ? <span>Créer un compte</span>
            </p>
            
            {message && <div className="message">{message}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (page === "signup") {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo">
              <div className="logo-icon">☁️</div>
              <h1>MiniCloud</h1>
            </div>
            
            <div className="input-group">
              <input 
                placeholder="Choisis un pseudo" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Crée un mot de passe" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            
            <button className="signup-btn" onClick={signup}>
              Créer mon compte
            </button>
            
            <p className="switch-mode" onClick={() => setPage("login")}>
              Déjà un compte ? <span>Se connecter</span>
            </p>
            
            {message && <div className="message">{message}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="logo-icon">☁️</div>
            <h1>MiniCloud</h1>
          </div>
          <div className="user-section">
            <p className="welcome">Bonjour <span>{username}</span> !</p>
            <button className="logout-btn" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {message && <div className="banner-message">{message}</div>}

        <section className="upload-area">
          <div className="section-header">
            <h2>Upload vos fichiers</h2>
            <p>Glissez ou cliquez pour ajouter des fichiers</p>
          </div>

          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={triggerFileInput}
          >
            <div className="drop-content">
              <p>Glissez vos fichiers ici</p>
              <span>ou</span>
              <input 
                id="fileInput"
                type="file" 
                multiple 
                onChange={handleFilesChange}
                className="file-input"
              />
              <button 
                className="browse-btn" 
                onClick={(e) => {
                  e.stopPropagation(); 
                  triggerFileInput();
                }}
              >
                Parcourir
              </button>
            </div>
          </div>

          {uploadFiles.length > 0 && (
            <div className="upload-preview">
              <h3>Fichiers à uploader ({uploadFiles.length})</h3>
              <div className="file-list">
                {uploadFiles.map((f, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">
                      ({(f.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ))}
              </div>
              <button className="upload-cta" onClick={handleUpload}>
                Lancer l'upload
              </button>
            </div>
          )}
        </section>

        <section className="files-section">
          <div className="section-header">
            <h2>Mes fichiers ({files.length})</h2>
          </div>

          {files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <p>Aucun fichier pour le moment</p>
              <p className="empty-hint">Upload votre premier fichier ci-dessus !</p>
            </div>
          ) : (
            <div className="files-grid">
              {files.map((f, index) => (
                <div key={index} className="file-card">
                  <div className="file-info">
                    <div className="file-icon"></div>
                    <div className="file-details">
                      <span className="file-name" title={f}>
                        {f.length > 25 ? `${f.substring(0, 25)}...` : f}
                      </span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button 
                      className="download-action"
                      onClick={() => downloadFile(f)}
                      title="Télécharger"
                    >
                      📥
                    </button>
                    <button 
                      className="delete-action"
                      onClick={() => openDeleteModal(f)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal de suppression */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          filename={deleteModal.filename}
        />
      </main>
    </div>
  );
}

export default App;