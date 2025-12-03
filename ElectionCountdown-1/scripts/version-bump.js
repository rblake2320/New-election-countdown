#!/usr/bin/env node

/**
 * Version bump utility for Election Platform
 * Usage: node scripts/version-bump.js [major|minor|patch]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const versionType = process.argv[2] || 'patch';

// Read current version from VERSION.md
const versionFile = path.join(__dirname, '..', 'VERSION.md');
const versionContent = fs.readFileSync(versionFile, 'utf8');
const currentVersionMatch = versionContent.match(/## Current Version: (\d+)\.(\d+)\.(\d+)/);

if (!currentVersionMatch) {
  console.error('Could not find current version in VERSION.md');
  process.exit(1);
}

let [, major, minor, patch] = currentVersionMatch.map(Number);

// Bump version based on type
switch (versionType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
  default:
    console.error('Invalid version type. Use: major, minor, or patch');
    process.exit(1);
}

const newVersion = `${major}.${minor}.${patch}`;
const date = new Date().toISOString().split('T')[0];

console.log(`Bumping version from ${currentVersionMatch[0].replace('## Current Version: ', '')} to ${newVersion}`);

// Update VERSION.md
const updatedVersionContent = versionContent.replace(
  /## Current Version: \d+\.\d+\.\d+/,
  `## Current Version: ${newVersion}`
);

// Add new version entry
const versionEntry = `\n#### v${newVersion} (${date})\n**[Add description here]**\n- [ ] Add changes\n`;
const updatedWithEntry = updatedVersionContent.replace(
  '### Version History',
  `### Version History\n${versionEntry}`
);

fs.writeFileSync(versionFile, updatedWithEntry);

// Update CHANGELOG.md
const changelogFile = path.join(__dirname, '..', 'CHANGELOG.md');
const changelogContent = fs.readFileSync(changelogFile, 'utf8');

const changelogEntry = `## [${newVersion}] - ${date}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n\n`;
const updatedChangelog = changelogContent.replace(
  '## [2.1.0]',
  `${changelogEntry}## [2.1.0]`
);

fs.writeFileSync(changelogFile, updatedChangelog);

console.log(`✅ Version bumped to ${newVersion}`);
console.log(`📝 Updated VERSION.md and CHANGELOG.md`);
console.log(`\nNext steps:`);
console.log(`1. Update the version entry in VERSION.md with your changes`);
console.log(`2. Fill in the CHANGELOG.md entry`);
console.log(`3. Commit your changes with: git commit -m "chore: bump version to ${newVersion}"`);
console.log(`4. Tag the release: git tag v${newVersion}`);
console.log(`5. Push changes: git push && git push --tags`);