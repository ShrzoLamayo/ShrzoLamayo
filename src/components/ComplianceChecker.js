import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as PassedIcon,
  Error as FailedIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  FileDownload as DownloadIcon,
  Send as SubmitIcon
} from '@mui/icons-material';
import axios from 'axios';

const ComplianceChecker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [complianceResults, setComplianceResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [expandedRules, setExpandedRules] = useState({});

  useEffect(() => {
    fetchProjectAndCompliance();
  }, [id]);

  const fetchProjectAndCompliance = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data.project);
      
      // Convert compliance checks array to results object
      const checks = response.data.compliance_checks || [];
      const results = {};
      checks.forEach(check => {
        results[check.rule_name] = {
          status: check.status,
          message: check.message,
          value: check.value,
          threshold: check.threshold
        };
      });
      setComplianceResults(results);
    } catch (err) {
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const runComplianceCheck = async () => {
    setChecking(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/projects/${id}/compliance-check`);
      setComplianceResults(response.data.results);
      setProject(prev => ({ ...prev, compliance_status: response.data.compliance_status }));
    } catch (err) {
      setError('Compliance check failed');
    } finally {
      setChecking(false);
    }
  };

  const toggleRuleExpansion = (ruleName) => {
    setExpandedRules(prev => ({
      ...prev,
      [ruleName]: !prev[ruleName]
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASSED':
        return <PassedIcon color="success" />;
      case 'FAILED':
        return <FailedIcon color="error" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED': return 'success';
      case 'FAILED': return 'error';
      case 'WARNING': return 'warning';
      default: return 'default';
    }
  };

  const getRuleDescription = (ruleName) => {
    const descriptions = {
      'setback_compliance': 'Minimum setback distances from plot boundaries as per zoning regulations',
      'fsi_compliance': 'Floor Space Index (FSI) within permitted limits based on zone and road width',
      'coverage_compliance': 'Ground coverage percentage within maximum allowed limits',
      'height_compliance': 'Building height within maximum permitted height for the zone',
      'osr_compliance': 'Open Space Reservation (OSR) requirement for larger developments',
      'parking_compliance': 'Adequate parking provision as per number of units',
      'fire_safety_compliance': 'Fire safety measures and NOC requirements',
      'accessibility_compliance': 'Accessibility features like lifts and ramps',
      'rwh_compliance': 'Rainwater harvesting system provision',
      'waste_management_compliance': 'Waste management facilities and segregation'
    };
    return descriptions[ruleName] || 'Compliance check for building regulations';
  };

  const calculateOverallScore = () => {
    const rules = Object.values(complianceResults);
    if (rules.length === 0) return 0;
    
    const passed = rules.filter(r => r.status === 'PASSED').length;
    return Math.round((passed / rules.length) * 100);
  };

  const overallScore = calculateOverallScore();
  const overallStatus = overallScore === 100 ? 'PASSED' : overallScore >= 80 ? 'WARNING' : 'FAILED';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              ⚙️ Compliance Checker
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {project?.project_title} (ID: {project?.application_id})
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={runComplianceCheck}
              disabled={checking}
            >
              {checking ? 'Checking...' : 'Run Compliance Check'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => navigate(`/project/${id}`)}
            >
              View Full Report
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {checking && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Running automated compliance checks against DCR & NBC rules...
          </Typography>
          <LinearProgress />
        </Paper>
      )}

      {/* Overall Compliance Summary */}
      {Object.keys(complianceResults).length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={getStatusColor(overallStatus) + '.main'}>
                  {overallScore}%
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Overall Compliance
                </Typography>
                <Chip 
                  label={overallStatus} 
                  color={getStatusColor(overallStatus)}
                  icon={getStatusIcon(overallStatus)}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {Object.values(complianceResults).filter(r => r.status === 'PASSED').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Passed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {Object.values(complianceResults).filter(r => r.status === 'WARNING').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Warnings
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {Object.values(complianceResults).filter(r => r.status === 'FAILED').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Failed
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Detailed Compliance Results */}
      {Object.keys(complianceResults).length > 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Detailed Compliance Results
          </Typography>
          
          {Object.entries(complianceResults).map(([ruleName, result]) => (
            <Card key={ruleName} sx={{ mb: 2 }} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusIcon(result.status)}
                    <Box>
                      <Typography variant="h6">
                        {ruleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getRuleDescription(ruleName)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={result.status} 
                      color={getStatusColor(result.status)}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => toggleRuleExpansion(ruleName)}
                    >
                      {expandedRules[ruleName] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={expandedRules[ruleName]} timeout="auto" unmountOnExit>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>Details:</strong> {result.message}
                      </Typography>
                    </Grid>
                    {result.value !== null && (
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Actual Value:</strong> {result.value}
                        </Typography>
                      </Grid>
                    )}
                    {result.threshold !== null && (
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Required/Threshold:</strong> {result.threshold}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Paper>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No compliance checks performed yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Building details are required to run automated compliance checks against DCR & NBC rules.
          </Typography>
          <Button
            variant="contained"
            onClick={runComplianceCheck}
            disabled={!project?.building_height}
          >
            Run First Compliance Check
          </Button>
        </Paper>
      )}

      {/* Action Buttons */}
      {overallStatus === 'PASSED' && (
        <Paper sx={{ p: 3, mt: 3, textAlign: 'center', backgroundColor: 'success.light' }}>
          <Typography variant="h6" gutterBottom color="success.dark">
            🎉 All compliance checks passed!
          </Typography>
          <Typography variant="body2" color="success.dark" sx={{ mb: 3 }}>
            Your project meets all DCR & NBC requirements. Ready for submission to CMDA.
          </Typography>
          <Button
            variant="contained"
            startIcon={<SubmitIcon />}
            color="success"
            size="large"
            onClick={() => navigate(`/project/${id}`)}
          >
            Proceed to Final Submission
          </Button>
        </Paper>
      )}

      {overallStatus === 'FAILED' && (
        <Paper sx={{ p: 3, mt: 3, textAlign: 'center', backgroundColor: 'error.light' }}>
          <Typography variant="h6" gutterBottom color="error.dark">
            ⚠️ Compliance issues found
          </Typography>
          <Typography variant="body2" color="error.dark" sx={{ mb: 3 }}>
            Please resolve the failed compliance checks before proceeding with submission.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/project/${id}/design`)}
          >
            Modify Building Design
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default ComplianceChecker;