import React, { useState, useEffect } from 'react';
import { FaUser, FaEdit, FaCog, FaCheck } from 'react-icons/fa';
import API from '../api';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    skills: []
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await API.get('/profile');
      const { user, stats } = response.data;
      setProfile(user);
      setStats(stats);
      setFormData({
        fullName: user.fullName || '',
        email: user.email,
        skills: user.skills || []
      });
    } catch (error) {
      setMessage('Erreur lors du chargement du profil');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await API.put('/profile', formData);
      setProfile(response.data);
      setIsEditing(false);
      setMessage('Profil mis à jour avec succès');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await API.put('/profile/avatar', formData);
      setProfile(prev => ({ ...prev, avatar: response.data.avatar }));
      setMessage('Avatar mis à jour avec succès');
    } catch (error) {
      setMessage('Erreur lors de la mise à jour de l\'avatar');
    }
  };

  const handleSkillAdd = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: 'beginner' }]
    }));
  };

  const handleSkillChange = (index, field, value) => {
    const newSkills = [...formData.skills];
    newSkills[index][field] = value;
    setFormData(prev => ({
      ...prev,
      skills: newSkills
    }));
  };

  if (!profile) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="avatar-section">
          <img
            src={profile.avatar || '/avatars/default.png'}
            alt="Avatar"
            className="avatar"
          />
          {isEditing && (
            <div className="avatar-upload">
              <label htmlFor="avatar-input" className="button button-secondary">
                Changer l'avatar
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <div className="profile-info">
          <h2>{profile.fullName || profile.username}</h2>
          <p>{profile.email}</p>
          <span className="role-badge">{profile.role}</span>
        </div>

        <button
          className="edit-button"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <FaCheck /> : <FaEdit />}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes('Erreur') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="profile-content">
        <div className="stats-section">
          <h3>Statistiques</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Projets</h4>
              <div className="stat-details">
                <p>Total: {stats.projects.total}</p>
                <p>Gérés: {stats.projects.managed}</p>
                <p>Actifs: {stats.projects.active}</p>
              </div>
            </div>
            <div className="stat-card">
              <h4>Tâches</h4>
              <div className="stat-details">
                <p>Total: {stats.tasks.total}</p>
                <p>Terminées: {stats.tasks.completed}</p>
                <p>En cours: {stats.tasks.pending}</p>
              </div>
            </div>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Nom complet</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  fullName: e.target.value
                }))}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
              />
            </div>

            <div className="form-group">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
              />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
              />
            </div>

            <div className="skills-section">
              <div className="skills-header">
                <h3>Compétences</h3>
                <button type="button" onClick={handleSkillAdd} className="button button-secondary">
                  Ajouter une compétence
                </button>
              </div>
              {formData.skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  <input
                    type="text"
                    value={skill.name}
                    placeholder="Nom de la compétence"
                    onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                  />
                  <select
                    value={skill.level}
                    onChange={(e) => handleSkillChange(index, 'level', e.target.value)}
                  >
                    <option value="beginner">Débutant</option>
                    <option value="intermediate">Intermédiaire</option>
                    <option value="advanced">Avancé</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit" className="button button-primary">
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="button button-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div className="skills-display">
              <h3>Compétences</h3>
              <div className="skills-grid">
                {profile.skills?.map((skill, index) => (
                  <div key={index} className="skill-badge">
                    <span className="skill-name">{skill.name}</span>
                    <span className={`skill-level ${skill.level}`}>
                      {skill.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
