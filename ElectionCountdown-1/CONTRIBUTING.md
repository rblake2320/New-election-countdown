# Contributing to ElectionTracker

We welcome contributions to the ElectionTracker platform! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ElectionsCountDown.git`
3. Install dependencies: `npm install`
4. Set up your environment variables (see README.md)
5. Run the development server: `npm run dev`

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier configuration included)
- Write meaningful commit messages
- Include comments for complex logic

### API Integration
- All new data sources must provide authentic data only
- Implement proper error handling and rate limiting
- Document API endpoints and response formats
- Include data validation and sanitization

### Database Changes
- Use Drizzle ORM for all database operations
- Update schema in `shared/schema.ts`
- Run `npm run db:push` to apply changes
- Never use destructive operations without explicit approval

### Security Requirements
- Validate all user inputs
- Implement proper authentication checks
- Use environment variables for sensitive data
- Follow GDPR/CCPA compliance guidelines

## Contribution Process

### For Bug Fixes
1. Create an issue describing the bug
2. Reference the issue in your pull request
3. Include test cases if applicable
4. Ensure all existing tests pass

### For New Features
1. Discuss the feature in an issue first
2. Ensure it aligns with the project's data authenticity goals
3. Update documentation as needed
4. Add appropriate tests

### For API Integrations
1. Verify the data source is authoritative and reliable
2. Implement proper error handling
3. Add rate limiting and caching as appropriate
4. Document the integration in README.md

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No secrets or API keys in code
- [ ] Data sources are authentic and verified

### PR Description Should Include
- Clear description of changes
- Link to related issues
- Screenshots for UI changes
- Testing instructions
- Breaking changes (if any)

## Data Integrity Standards

### Authentic Data Only
- No mock, placeholder, or synthetic data
- All polling percentages from verified sources
- Clear data source attribution
- Proper error states for unavailable data

### Approved Data Sources
- Government APIs (FEC, Census, Google Civic)
- Official election authorities
- Verified news organizations
- Academic institutions
- Non-profit voting organizations

## Testing

### Local Testing
```bash
npm run test          # Run unit tests
npm run test:api      # Test API endpoints
npm run lint          # Check code style
npm run type-check    # Verify TypeScript
```

### Integration Testing
- Test with real API connections
- Verify data authenticity
- Check error handling
- Validate security measures

## Documentation

### Code Documentation
- Comment complex algorithms
- Document API endpoints
- Include type definitions
- Provide usage examples

### User Documentation
- Update README.md for new features
- Include setup instructions
- Document configuration options
- Provide troubleshooting guides

## Community Guidelines

### Communication
- Be respectful and professional
- Focus on constructive feedback
- Ask questions when unclear
- Help others when possible

### Issue Reporting
- Use clear, descriptive titles
- Include steps to reproduce
- Provide error messages
- Specify environment details

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Create an issue for project-related questions
- Check existing documentation first
- Be specific about your needs

Thank you for contributing to ElectionTracker!