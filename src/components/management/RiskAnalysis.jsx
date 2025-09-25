import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Progress, Tooltip } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../api';

const RiskAnalysis = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    fetchRiskAnalysis();
  }, [projectId]);

  const fetchRiskAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/project-management/risks/${projectId}`);
      setRisks(response.data.risks);
    } catch (error) {
      console.error('Erreur lors de l\'analyse des risques:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (probability, impact) => {
    const score = probability * impact;
    if (score >= 0.7) return 'error';
    if (score >= 0.4) return 'warning';
    return 'success';
  };

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Probabilité',
      dataIndex: 'probability',
      key: 'probability',
      render: (value) => (
        <Progress
          percent={value * 100}
          size="small"
          status={value >= 0.7 ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: 'Impact',
      dataIndex: 'impact',
      key: 'impact',
      render: (value) => (
        <Progress
          percent={value * 100}
          size="small"
          status={value >= 0.7 ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: 'Niveau',
      key: 'level',
      render: (_, record) => {
        const level = getRiskLevel(record.probability, record.impact);
        const icon = level === 'error' ? <WarningOutlined /> : <CheckCircleOutlined />;
        return (
          <Tag color={level} icon={icon}>
            {level.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Mitigation',
      dataIndex: 'mitigation',
      key: 'mitigation',
      render: (text) => (
        <Tooltip title={text}>
          {text.length > 50 ? `${text.substring(0, 47)}...` : text}
        </Tooltip>
      ),
    },
  ];

  return (
    <Card title="Analyse des Risques" className="management-card">
      <Table
        columns={columns}
        dataSource={risks}
        loading={loading}
        rowKey="id"
        pagination={false}
      />
    </Card>
  );
};

export default RiskAnalysis;
