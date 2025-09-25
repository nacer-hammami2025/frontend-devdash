import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import ReportGenerator from '../components/management/ReportGenerator';
import ProjectOptimizer from '../components/management/ProjectOptimizer';
import RiskAnalysis from '../components/management/RiskAnalysis';

const ProjectManagement = ({ projectId }) => {
  return (
    <div className="project-management">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ReportGenerator projectId={projectId} />
        </Col>
        <Col xs={24} lg={8}>
          <ProjectOptimizer projectId={projectId} />
        </Col>
        <Col xs={24} lg={8}>
          <RiskAnalysis projectId={projectId} />
        </Col>
      </Row>
    </div>
  );
};

export default ProjectManagement;
