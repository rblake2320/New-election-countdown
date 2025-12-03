import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { IncidentRunbookService } from '../services/incident-runbook-service';
import { 
  IncidentRunbook,
  RunbookStep,
  RunbookContact,
  ContactEscalationTree,
  RunbookExecution
} from '@shared/schema';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Initialize service
const runbookService = new IncidentRunbookService(storage);

// Validation schemas
const createRunbookSchema = z.object({
  runbookId: z.string().min(1),
  runbookTitle: z.string().min(1),
  incidentType: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  accessLevel: z.enum(['public', 'internal', 'restricted', 'confidential']).default('internal'),
  ownerTeam: z.string().optional(),
  reviewDate: z.string().transform(str => new Date(str)).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'review', 'approved', 'active', 'archived']).default('draft')
});

const createRunbookStepSchema = z.object({
  runbookId: z.number().positive(),
  stepTitle: z.string().min(1),
  stepDescription: z.string().min(1),
  stepType: z.enum(['manual', 'automated', 'validation', 'notification', 'escalation']),
  stepOrder: z.number().positive(),
  isRequired: z.boolean().default(true),
  estimatedDuration: z.number().positive().optional(),
  stepInstructions: z.string().optional(),
  automationScript: z.string().optional(),
  validationCriteria: z.any().optional(),
  escalateOnFailure: z.boolean().default(false),
  escalateOnDelay: z.boolean().default(false),
  prerequisites: z.array(z.string()).optional(),
  rollbackInstructions: z.string().optional()
});

const createContactSchema = z.object({
  contactId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  alternateContact: z.string().optional(),
  escalationLevel: z.number().positive(),
  isActive: z.boolean().default(true),
  isAvailable24x7: z.boolean().default(false),
  timezone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  backupContactId: z.string().optional()
});

const createEscalationTreeSchema = z.object({
  treeId: z.string().min(1),
  treeName: z.string().min(1),
  incidentTypes: z.array(z.string()).min(1),
  severityLevels: z.array(z.string()).min(1),
  escalationIntervalMinutes: z.number().positive().optional(),
  maxEscalationLevel: z.number().positive().default(5),
  isActive: z.boolean().default(true),
  escalationRules: z.any().optional(),
  description: z.string().optional()
});

const executeRunbookSchema = z.object({
  incidentContext: z.object({
    incidentId: z.string().min(1),
    incidentType: z.string().min(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().min(1),
    affectedSystems: z.array(z.string()).default([]),
    detectedAt: z.string().transform(str => new Date(str)),
    reportedBy: z.string().min(1),
    environment: z.string().min(1),
    metadata: z.any().optional()
  }),
  executedBy: z.string().min(1),
  runbookId: z.string().optional()
});

// GET /api/v1/track4/runbooks - Get incident runbooks
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { status, incidentType, severity, accessLevel, page = '1', limit = '20' } = req.query;
    
    const filters: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (status) filters.status = status as string;
    if (incidentType) filters.incidentType = incidentType as string;
    if (severity) filters.severity = severity as string;
    if (accessLevel) filters.accessLevel = accessLevel as string;
    
    const runbooks = await storage.getIncidentRunbooks(filters);
    
    res.json({
      success: true,
      data: runbooks,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        count: runbooks.length
      }
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting runbooks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks - Create incident runbook
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createRunbookSchema.parse(req.body);
    
    const runbook = await runbookService.createRunbook(validatedData);
    
    res.status(201).json({
      success: true,
      data: runbook,
      message: 'Runbook created successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error creating runbook:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/:runbookId - Get specific runbook
router.get('/:runbookId', isAuthenticated, async (req, res) => {
  try {
    const runbookId = req.params.runbookId;
    const runbook = await storage.getIncidentRunbook(runbookId);
    
    if (!runbook) {
      return res.status(404).json({
        success: false,
        error: 'Runbook not found'
      });
    }
    
    res.json({
      success: true,
      data: runbook
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting runbook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/runbooks/:runbookId - Update runbook
router.put('/:runbookId', isAuthenticated, async (req, res) => {
  try {
    const runbookId = req.params.runbookId;
    const updates = createRunbookSchema.partial().parse(req.body);
    
    const runbook = await storage.updateIncidentRunbook(runbookId, updates);
    
    res.json({
      success: true,
      data: runbook,
      message: 'Runbook updated successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error updating runbook:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/v1/track4/runbooks/:runbookId - Delete runbook
router.delete('/:runbookId', isAuthenticated, async (req, res) => {
  try {
    const runbookId = req.params.runbookId;
    await storage.deleteIncidentRunbook(runbookId);
    
    res.json({
      success: true,
      message: 'Runbook deleted successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error deleting runbook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/:runbookId/approve - Approve runbook
router.post('/:runbookId/approve', isAuthenticated, async (req, res) => {
  try {
    const runbookId = req.params.runbookId;
    const { approvedBy } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const runbook = await storage.approveRunbook(runbookId, approvedBy);
    
    res.json({
      success: true,
      data: runbook,
      message: 'Runbook approved successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error approving runbook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/execute - Execute runbook for incident
router.post('/execute', isAuthenticated, async (req, res) => {
  try {
    const { incidentContext, executedBy, runbookId } = executeRunbookSchema.parse(req.body);
    
    // Execute runbook asynchronously
    const executionPromise = runbookService.executeRunbookForIncident(
      incidentContext,
      executedBy,
      runbookId
    );
    
    // Return execution started response immediately
    res.status(202).json({
      success: true,
      message: 'Runbook execution started',
      note: 'Use /executions/:executionId to track progress'
    });
    
    // Handle results asynchronously
    executionPromise.catch(error => {
      console.error('[Track4RunbookRoutes] Async runbook execution error:', error);
    });
    
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error starting runbook execution:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/steps/:runbookId - Get runbook steps
router.get('/steps/:runbookId', isAuthenticated, async (req, res) => {
  try {
    const runbookId = parseInt(req.params.runbookId);
    const steps = await storage.getRunbookStepsByOrder(runbookId);
    
    res.json({
      success: true,
      data: steps,
      count: steps.length
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting runbook steps:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/steps - Create runbook step
router.post('/steps', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createRunbookStepSchema.parse(req.body);
    
    const step = await storage.createRunbookStep(validatedData);
    
    res.status(201).json({
      success: true,
      data: step,
      message: 'Runbook step created successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error creating runbook step:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/runbooks/steps/:stepId - Update runbook step
router.put('/steps/:stepId', isAuthenticated, async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    const updates = createRunbookStepSchema.partial().parse(req.body);
    
    const step = await storage.updateRunbookStep(stepId, updates);
    
    res.json({
      success: true,
      data: step,
      message: 'Runbook step updated successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error updating runbook step:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/v1/track4/runbooks/steps/:stepId - Delete runbook step
router.delete('/steps/:stepId', isAuthenticated, async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    await storage.deleteRunbookStep(stepId);
    
    res.json({
      success: true,
      message: 'Runbook step deleted successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error deleting runbook step:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/contacts - Get runbook contacts
router.get('/contacts', isAuthenticated, async (req, res) => {
  try {
    const { active, available24x7, escalationLevel } = req.query;
    
    const filters: any = {};
    if (active !== undefined) filters.active = active === 'true';
    if (available24x7 !== undefined) filters.available24x7 = available24x7 === 'true';
    if (escalationLevel) filters.escalationLevel = parseInt(escalationLevel as string);
    
    const contacts = await storage.getRunbookContacts(filters);
    
    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting contacts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/contacts - Create runbook contact
router.post('/contacts', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createContactSchema.parse(req.body);
    
    const contact = await runbookService.createContact(validatedData);
    
    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error creating contact:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/contacts/:contactId - Get specific contact
router.get('/contacts/:contactId', isAuthenticated, async (req, res) => {
  try {
    const contactId = req.params.contactId;
    const contact = await storage.getRunbookContact(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/v1/track4/runbooks/contacts/:contactId - Update contact
router.put('/contacts/:contactId', isAuthenticated, async (req, res) => {
  try {
    const contactId = req.params.contactId;
    const updates = createContactSchema.partial().parse(req.body);
    
    const contact = await storage.updateRunbookContact(contactId, updates);
    
    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error updating contact:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/v1/track4/runbooks/contacts/:contactId - Delete contact
router.delete('/contacts/:contactId', isAuthenticated, async (req, res) => {
  try {
    const contactId = req.params.contactId;
    await storage.deleteRunbookContact(contactId);
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/escalation-trees - Get escalation trees
router.get('/escalation-trees', isAuthenticated, async (req, res) => {
  try {
    const { active, incidentTypes } = req.query;
    
    const filters: any = {};
    if (active !== undefined) filters.active = active === 'true';
    if (incidentTypes) {
      filters.incidentTypes = (incidentTypes as string).split(',');
    }
    
    const trees = await storage.getContactEscalationTrees(filters);
    
    res.json({
      success: true,
      data: trees,
      count: trees.length
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting escalation trees:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/escalation-trees - Create escalation tree
router.post('/escalation-trees', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createEscalationTreeSchema.parse(req.body);
    
    const tree = await runbookService.createEscalationTree(validatedData);
    
    res.status(201).json({
      success: true,
      data: tree,
      message: 'Escalation tree created successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error creating escalation tree:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/executions - Get runbook executions
router.get('/executions', isAuthenticated, async (req, res) => {
  try {
    const { runbookId, status, executedBy, page = '1', limit = '20' } = req.query;
    
    const filters: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    if (runbookId) filters.runbookId = parseInt(runbookId as string);
    if (status) filters.status = status as string;
    if (executedBy) filters.executedBy = executedBy as string;
    
    const executions = await storage.getRunbookExecutions(filters);
    
    res.json({
      success: true,
      data: executions,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        count: executions.length
      }
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting executions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/executions/:executionId - Get specific execution
router.get('/executions/:executionId', isAuthenticated, async (req, res) => {
  try {
    const executionId = req.params.executionId;
    const execution = await runbookService.getExecutionStatus(executionId);
    
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting execution:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/executions/:executionId/pause - Pause execution
router.post('/executions/:executionId/pause', isAuthenticated, async (req, res) => {
  try {
    const executionId = req.params.executionId;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason is required'
      });
    }
    
    await runbookService.pauseExecution(executionId, reason);
    
    res.json({
      success: true,
      message: 'Execution paused successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error pausing execution:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/track4/runbooks/executions/:executionId/resume - Resume execution
router.post('/executions/:executionId/resume', isAuthenticated, async (req, res) => {
  try {
    const executionId = req.params.executionId;
    
    await runbookService.resumeExecution(executionId);
    
    res.json({
      success: true,
      message: 'Execution resumed successfully'
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error resuming execution:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/dashboard - Get runbook management dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const dashboardData = await storage.getRunbookDashboardData();
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Track4RunbookRoutes] Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/track4/runbooks/health - Health check for runbook service
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      service: 'Incident Runbook Management Service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;