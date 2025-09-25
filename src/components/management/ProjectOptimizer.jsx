import React, { useState } from 'react';
import { Card, Button, Form, Select, Switch, Space, notification } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import api from '../../api';

const { Option } = Select;

const ProjectOptimizer = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState(['workload', 'schedule']);
  const [autoApply, setAutoApply] = useState(false);

  const optimize = async () => {
    setLoading(true);
    try {
      const response = await api.post('/project-management/optimize', {
        projectId,
        strategies,
        autoApply
      });

      notification.success({
        message: 'Optimisation réussie',
        description: `${response.data.recommendations.length} recommandations générées`
      });

      // Si l'application automatique est désactivée, afficher les recommandations
      if (!autoApply) {
        // TODO: Afficher les recommandations dans un modal ou un drawer
      }
    } catch (error) {
      notification.error({
        message: 'Erreur',
        description: 'Erreur lors de l\'optimisation du projet'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Optimisation du Projet" className="management-card">
      <Form layout="vertical">
        <Form.Item label="Stratégies d'Optimisation">
          <Select
            mode="multiple"
            value={strategies}
            onChange={setStrategies}
            style={{ width: '100%' }}
          >
            <Option value="workload">Charge de travail</Option>
            <Option value="schedule">Planning</Option>
            <Option value="resources">Ressources</Option>
            <Option value="risk">Risques</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Switch
              checked={autoApply}
              onChange={setAutoApply}
            />
            <span>Appliquer automatiquement les optimisations</span>
          </Space>
        </Form.Item>

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={optimize}
          block
        >
          Optimiser le Projet
        </Button>
      </Form>
    </Card>
  );
};

export default ProjectOptimizer;
