# VoteSmart API Integration Setup Guide

## Overview
Your election platform requires a VoteSmart API key to unlock comprehensive candidate data including biographical information, voting records, policy positions, and interest group ratings. This guide will walk you through the complete setup process.

## Current Status
- ❌ VOTESMART_API_KEY: Not configured
- ⚠️ System Message: "VOTESMART_API_KEY not found - VoteSmart features will be unavailable"
- 🔄 Impact: Limited candidate biographical data, no voting records, no policy positions

## Step 1: Register for VoteSmart API Key

### Registration Process
1. **Visit**: http://votesmart.org/services_api.php
2. **Complete the registration form** with:
   - Your contact information
   - Brief description of your election platform usage
   - Confirm non-commercial/personal use

### Important Notes
- **100% FREE** for non-commercial/personal use
- Registration must be accurate and kept current
- You'll receive a unique API key via email
- Business/organizational use requires paid licensing

## Step 2: Configure API Key in Replit

### Add to Replit Secrets
1. **Open your Replit project**
2. **Click on "Secrets" tab** (lock icon in left sidebar)
3. **Click "New Secret"**
4. **Enter**:
   - **Key**: `VOTESMART_API_KEY`
   - **Value**: Your VoteSmart API key (from registration email)
5. **Click "Add Secret"**

### Verification
After adding the secret, restart your application:
- The warning "VOTESMART_API_KEY not found" should disappear
- Logs should show: "VoteSmart API configured successfully"
- Candidate profiles will now include biographical data, positions, and voting records

## Step 3: Expected Features Unlocked

### Candidate Profiles
- ✅ **Biographical Information**: Education, profession, background
- ✅ **Professional Experience**: Employment history, previous offices
- ✅ **Policy Positions**: Structured position data on key issues
- ✅ **Voting Records**: Historical voting patterns and decisions
- ✅ **Interest Group Ratings**: Endorsements and rating scores

### API Endpoints Enhanced
- `/api/candidates/:id` - Now includes comprehensive VoteSmart data
- `/api/candidates/search` - Enhanced with biographical preview data
- `/api/services/status` - Shows VoteSmart API as available

## Step 4: Verify Integration

### Check API Status
1. **Visit**: Your app's service status page
2. **Verify**: VoteSmart shows as "Available" 
3. **Check**: No critical missing API warnings

### Test Candidate Data
1. **Search for a candidate** in your application
2. **View candidate profile** 
3. **Confirm presence of**:
   - Biography section
   - Professional background
   - Policy positions
   - Voting record (if applicable)

## Troubleshooting

### Common Issues

**Issue**: "Invalid API key" error
**Solution**: 
- Verify the API key is copied correctly (no extra spaces)
- Ensure you're using the key from the registration email
- Check that the key hasn't expired

**Issue**: Rate limiting errors
**Solution**: 
- VoteSmart has generous rate limits for free usage
- The system implements automatic retry logic
- Contact VoteSmart if you need higher limits

**Issue**: No data for specific candidates
**Solution**: 
- Not all candidates are in VoteSmart's database
- The system gracefully handles missing data
- Local candidate data will still be displayed

### Support Resources
- **VoteSmart API Docs**: https://api.votesmart.org/docs/
- **Terms of Use**: https://api.votesmart.org/docs/terms.html
- **Support**: Check VoteSmart's website for contact information

## Data Sources Integration

With VoteSmart configured, your platform now integrates:
- ✅ **ProPublica Congress API**: Congressional data
- ✅ **OpenFEC**: Campaign finance data
- ✅ **Google Civic Information API**: Election information
- ✅ **VoteSmart API**: Biographical and position data
- ✅ **OpenStates API**: State-level legislative data
- ✅ **Congress.gov**: Federal legislative information

## Next Steps
1. **Add the VOTESMART_API_KEY** to Replit Secrets
2. **Restart your application** 
3. **Test candidate profile features**
4. **Monitor API usage** via the service status dashboard

Your election platform will now provide comprehensive, authoritative candidate information to help voters make informed decisions.