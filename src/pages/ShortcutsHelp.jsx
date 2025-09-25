import React from 'react';
import { FaKeyboard, FaQuestionCircle, FaSearch } from 'react-icons/fa';
import '../styles/ShortcutsHelp.css';

const ShortcutsHelp = () => {
  const shortcuts = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: ['g', 'd'], description: 'Aller au Dashboard' },
        { keys: ['g', 'p'], description: 'Aller aux Projets' },
        { keys: ['g', 's'], description: 'Aller à la Sécurité' },
        { keys: ['?'], description: 'Afficher cette aide' },
        { keys: ['/'], description: 'Focus sur la recherche' }
      ]
    },
    {
      category: 'Actions',
      shortcuts: [
        { keys: ['n', 'p'], description: 'Nouveau Projet' },
        { keys: ['n', 't'], description: 'Nouvelle Tâche' },
        { keys: ['Esc'], description: 'Fermer / Annuler' }
      ]
    },
    {
      category: 'Vue Projet',
      shortcuts: [
        { keys: ['1'], description: 'Vue Kanban' },
        { keys: ['2'], description: 'Vue Liste' },
        { keys: ['3'], description: 'Vue Calendrier' }
      ]
    }
  ];

  return (
    <div className="shortcuts-help">
      <header className="shortcuts-header">
        <FaKeyboard className="icon" />
        <h1>Raccourcis Clavier</h1>
      </header>

      <div className="shortcuts-intro">
        <FaQuestionCircle className="icon" />
        <p>
          Appuyez sur <kbd>?</kbd> n'importe où dans l'application pour 
          afficher cette aide
        </p>
      </div>

      <div className="shortcuts-search">
        <FaSearch className="icon" />
        <input
          type="text"
          placeholder="Rechercher un raccourci..."
          className="search-input"
        />
      </div>

      <div className="shortcuts-grid">
        {shortcuts.map((category) => (
          <div key={category.category} className="shortcuts-category">
            <h2>{category.category}</h2>
            <div className="shortcuts-list">
              {category.shortcuts.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <kbd>{key}</kbd>
                        {keyIndex < shortcut.keys.length - 1 && 
                          <span className="key-separator">puis</span>
                        }
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="shortcut-description">
                    {shortcut.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortcutsHelp;
