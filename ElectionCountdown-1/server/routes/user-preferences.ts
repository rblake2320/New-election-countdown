import { Router } from "express";
import { z } from "zod";
import { authRequired } from "../auth";
import { storage } from "../storage";
import { 
  updateUserPreferencesSchema, 
  insertUserPreferencesSchema,
  type UserPreferences,
  type UpdateUserPreferences 
} from "@shared/schema";

const router = Router();

// Validation schemas
const userPreferencesUpdateSchema = updateUserPreferencesSchema.extend({
  // Add any additional validation rules
  state: z.string().optional(),
  city: z.string().optional(),
  congressionalDistrict: z.string().optional(),
});

// GET /api/user/preferences - Get user's current preferences
router.get("/preferences", authRequired(), async (req, res) => {
  try {
    const userId = String((req as any).userId);
    
    // Get user preferences from storage
    let preferences = await storage.getUserPreferences(userId);
    
    // If no preferences exist, create defaults
    if (!preferences) {
      preferences = await storage.createDefaultUserPreferences(userId);
    }
    
    res.json({ 
      success: true,
      preferences 
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put("/preferences", authRequired(), async (req, res) => {
  try {
    const userId = String((req as any).userId);
    
    // Validate request body
    const validation = userPreferencesUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid preference data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      });
    }
    
    const updates: UpdateUserPreferences = validation.data;
    
    // Update preferences in storage
    const updatedPreferences = await storage.updateUserPreferences(userId, updates);
    
    res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      error: 'Failed to update user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/user/preferences/onboarding - Complete onboarding preferences
router.post("/preferences/onboarding", authRequired(), async (req, res) => {
  try {
    const userId = String((req as any).userId);
    
    // Validate onboarding data
    const validation = userPreferencesUpdateSchema.extend({
      onboardingCompleted: z.boolean().default(true),
      onboardingStepsCompleted: z.array(z.string()).default(['location', 'interests', 'notifications'])
    }).safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid onboarding data',
        details: validation.error.issues
      });
    }
    
    const onboardingData: UpdateUserPreferences = {
      ...validation.data,
      onboardingCompleted: true,
      onboardingStepsCompleted: ['location', 'interests', 'notifications'],
      preferenceSource: 'onboarding'
    };
    
    // Update preferences with onboarding completion
    const updatedPreferences = await storage.updateUserPreferences(userId, onboardingData);
    
    res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Onboarding preferences saved successfully'
    });
  } catch (error) {
    console.error('Error saving onboarding preferences:', error);
    res.status(500).json({
      error: 'Failed to save onboarding preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/user/preferences/congressional-districts - Get congressional districts for a state
router.get("/preferences/congressional-districts", authRequired(), async (req, res) => {
  try {
    const { state } = req.query;
    
    if (!state || typeof state !== 'string') {
      return res.status(400).json({
        error: 'State parameter is required'
      });
    }
    
    const districts = await storage.getCongressionalDistricts(state);
    
    res.json({
      success: true,
      districts,
      state: state.toUpperCase()
    });
  } catch (error) {
    console.error('Error fetching congressional districts:', error);
    res.status(500).json({
      error: 'Failed to fetch congressional districts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/user/preferences/lookup-district - Lookup congressional district by location
router.post("/preferences/lookup-district", authRequired(), async (req, res) => {
  try {
    const { state, city, zipCode } = req.body;
    
    if (!state) {
      return res.status(400).json({
        error: 'State is required for district lookup'
      });
    }
    
    const district = await storage.lookupCongressionalDistrict(state, city, zipCode);
    
    if (!district) {
      return res.status(404).json({
        error: 'No congressional district found for the provided location'
      });
    }
    
    res.json({
      success: true,
      district,
      location: { state, city, zipCode }
    });
  } catch (error) {
    console.error('Error looking up congressional district:', error);
    res.status(500).json({
      error: 'Failed to lookup congressional district',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/user/preferences/defaults - Get default preferences (for UI setup)
router.get("/preferences/defaults", authRequired(), async (req, res) => {
  try {
    // Return the default preferences structure for frontend use
    const defaultPreferences = {
      federalElectionsInterest: true,
      stateElectionsInterest: true,
      localElectionsInterest: false,
      candidateProfilesInterest: true,
      votingRecordsInterest: false,
      primaryElectionsEnabled: true,
      generalElectionsEnabled: true,
      specialElectionsEnabled: false,
      runoffElectionsEnabled: false,
      candidateInformationDepth: 'standard',
      electionTimelinePreference: 'all',
      pollingDataInterest: true,
      endorsementDataInterest: false,
      digestFrequency: 'weekly',
      breakingNewsAlerts: false,
      electionReminderAlerts: true,
      candidateUpdateAlerts: false,
      dataUsageConsent: true,
      personalizationEnabled: true,
      analyticsOptOut: false,
      onboardingCompleted: false,
    };
    
    res.json({
      success: true,
      defaults: defaultPreferences
    });
  } catch (error) {
    console.error('Error getting default preferences:', error);
    res.status(500).json({
      error: 'Failed to get default preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;