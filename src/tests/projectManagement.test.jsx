import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { notification } from 'antd';
import ReportGenerator from '../components/management/ReportGenerator';
import ProjectOptimizer from '../components/management/ProjectOptimizer';
import RiskAnalysis from '../components/management/RiskAnalysis';
import api from '../api';

// Mock des dépendances
jest.mock('../api');
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    notification: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    },
  };
});

describe('Project Management Components', () => {
  const projectId = 'test-project-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReportGenerator Component', () => {
    it('should generate a report successfully', async () => {
      api.post.mockResolvedValueOnce({ data: { report: new Blob() } });

      render(<ReportGenerator projectId={projectId} />);

      // Sélectionner le type de rapport
      const reportTypeSelect = screen.getByLabelText('Type de Rapport');
      fireEvent.change(reportTypeSelect, { target: { value: 'performance' } });

      // Simuler la sélection de dates
      // Note: La simulation exacte dépend de l'implémentation d'antd DatePicker

      // Cliquer sur le bouton de génération
      const generateButton = screen.getByText('Générer le Rapport');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/project-management/report', expect.any(Object));
        expect(notification.success).toHaveBeenCalled();
      });
    });
  });

  describe('ProjectOptimizer Component', () => {
    it('should optimize project with selected strategies', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          recommendations: [
            { type: 'workload', description: 'Test recommendation' }
          ]
        }
      });

      render(<ProjectOptimizer projectId={projectId} />);

      // Sélectionner les stratégies
      const strategySelect = screen.getByLabelText('Stratégies d\'Optimisation');
      fireEvent.change(strategySelect, { target: { value: ['workload', 'schedule'] } });

      // Activer l'application automatique
      const autoApplySwitch = screen.getByRole('switch');
      fireEvent.click(autoApplySwitch);

      // Lancer l'optimisation
      const optimizeButton = screen.getByText('Optimiser le Projet');
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/project-management/optimize', {
          projectId,
          strategies: ['workload', 'schedule'],
          autoApply: true
        });
        expect(notification.success).toHaveBeenCalled();
      });
    });
  });

  describe('RiskAnalysis Component', () => {
    it('should display risk analysis data', async () => {
      const mockRisks = [
        {
          id: 1,
          description: 'Test Risk',
          probability: 0.7,
          impact: 0.8,
          mitigation: 'Test mitigation strategy'
        }
      ];

      api.get.mockResolvedValueOnce({ data: { risks: mockRisks } });

      render(<RiskAnalysis projectId={projectId} />);

      await waitFor(() => {
        expect(screen.getByText('Test Risk')).toBeInTheDocument();
        expect(screen.getByText('Test mitigation strategy')).toBeInTheDocument();
      });

      expect(api.get).toHaveBeenCalledWith(`/project-management/risks/${projectId}`);
    });
  });
});
