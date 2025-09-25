import React, { useState } from 'react';
import { Card, Button, Form, Select, DatePicker, notification } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import api from '../../api';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportGenerator = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('performance');
  const [dateRange, setDateRange] = useState(null);

  const generateReport = async () => {
    if (!dateRange) {
      notification.warning({
        message: 'Sélectionnez une période',
        description: 'Veuillez sélectionner une période pour le rapport'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/project-management/report', {
        type: reportType,
        options: {
          projectId,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD')
        }
      });

      // Télécharger le rapport
      const blob = new Blob([response.data.report], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${reportType}-${new Date().toISOString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notification.success({
        message: 'Rapport généré',
        description: 'Le rapport a été généré avec succès'
      });
    } catch (error) {
      notification.error({
        message: 'Erreur',
        description: 'Erreur lors de la génération du rapport'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Générateur de Rapports" className="management-card">
      <Form layout="vertical">
        <Form.Item label="Type de Rapport">
          <Select value={reportType} onChange={setReportType}>
            <Option value="performance">Performance</Option>
            <Option value="resources">Ressources</Option>
            <Option value="progress">Avancement</Option>
            <Option value="quality">Qualité</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Période">
          <RangePicker
            style={{ width: '100%' }}
            onChange={setDateRange}
          />
        </Form.Item>

        <Button
          type="primary"
          icon={<FileTextOutlined />}
          loading={loading}
          onClick={generateReport}
          block
        >
          Générer le Rapport
        </Button>
      </Form>
    </Card>
  );
};

export default ReportGenerator;
