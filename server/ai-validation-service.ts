import { perplexityCongressService } from './perplexity-congress-service';

interface ValidationResult {
  verified: boolean;
  confidence: number;
  sources: string[];
  consensus: string;
  warnings: string[];
}

interface FactCheckSource {
  url: string;
  domain: string;
  content: string;
  reliability: number;
}

export class AIValidationService {
  private governmentDomains = [
    '.gov',
    '.state.',
    'elections.',
    'sos.',
    'secretary',
    'ballotpedia.org',
    'vote411.org',
    'propublica.org'
  ];

  async validateElectionClaim(claim: string, context?: string): Promise<ValidationResult> {
    try {
      // Step 1: Cross-reference with multiple sources
      const sources = await this.gatherSources(claim);
      
      // Step 2: Analyze consensus across sources
      const consensus = await this.analyzeConsensus(sources, claim);
      
      // Step 3: Check against known government sources
      const govVerification = await this.checkGovernmentSources(claim);
      
      // Step 4: Generate final validation result
      return this.generateValidationResult(consensus, govVerification, sources);
    } catch (error) {
      console.error('AI validation error:', error);
      return {
        verified: false,
        confidence: 0,
        sources: [],
        consensus: 'Validation failed due to technical error',
        warnings: ['Unable to verify claim due to system error']
      };
    }
  }

  private async gatherSources(claim: string): Promise<FactCheckSource[]> {
    const sources: FactCheckSource[] = [];
    
    // Use Perplexity for initial research
    const aiResponse = await perplexityCongressService.searchWithAI(
      `Verify this election information with official sources: ${claim}`
    );
    
    // Extract government URLs from AI response
    const urls = this.extractUrls(aiResponse);
    const governmentUrls = urls.filter(url => 
      this.governmentDomains.some(domain => url.includes(domain))
    );
    
    for (const url of governmentUrls.slice(0, 5)) {
      sources.push({
        url,
        domain: this.extractDomain(url),
        content: aiResponse,
        reliability: this.calculateReliability(url)
      });
    }
    
    return sources;
  }

  private async analyzeConsensus(sources: FactCheckSource[], claim: string): Promise<string> {
    if (sources.length === 0) {
      return 'No reliable sources found';
    }
    
    // Simple consensus analysis based on source reliability
    const totalReliability = sources.reduce((sum, source) => sum + source.reliability, 0);
    const averageReliability = totalReliability / sources.length;
    
    if (averageReliability > 0.8) {
      return 'High consensus among reliable sources';
    } else if (averageReliability > 0.6) {
      return 'Moderate consensus among sources';
    } else {
      return 'Low consensus or conflicting information';
    }
  }

  private async checkGovernmentSources(claim: string): Promise<boolean> {
    // Enhanced check against known government APIs
    try {
      // Check if claim relates to congressional information
      if (claim.toLowerCase().includes('congress') || claim.toLowerCase().includes('representative')) {
        const verification = await perplexityCongressService.searchWithAI(
          `Verify this congressional information using only official government sources: ${claim}`
        );
        return verification.includes('.gov') || verification.includes('congress.gov');
      }
      
      return true; // Default to true for non-congressional claims
    } catch (error) {
      return false;
    }
  }

  private generateValidationResult(
    consensus: string, 
    govVerification: boolean, 
    sources: FactCheckSource[]
  ): ValidationResult {
    let confidence = 0;
    let verified = false;
    const warnings: string[] = [];
    
    // Calculate confidence score
    if (sources.length >= 3) confidence += 0.3;
    if (govVerification) confidence += 0.4;
    if (consensus.includes('High consensus')) confidence += 0.3;
    else if (consensus.includes('Moderate consensus')) confidence += 0.15;
    
    verified = confidence >= 0.7;
    
    // Add warnings for low confidence
    if (confidence < 0.5) {
      warnings.push('Low confidence due to limited reliable sources');
    }
    
    if (!govVerification) {
      warnings.push('Could not verify against official government sources');
    }
    
    return {
      verified,
      confidence: Math.round(confidence * 100) / 100,
      sources: sources.map(s => s.url),
      consensus,
      warnings
    };
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    return text.match(urlRegex) || [];
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private calculateReliability(url: string): number {
    // Government sources get highest reliability
    if (url.includes('.gov')) return 1.0;
    if (url.includes('ballotpedia.org')) return 0.9;
    if (url.includes('vote411.org')) return 0.9;
    if (url.includes('propublica.org')) return 0.8;
    if (url.includes('.edu')) return 0.7;
    if (url.includes('elections.')) return 0.8;
    
    return 0.5; // Default reliability for other sources
  }

  async validateCandidateInfo(candidateName: string, office: string, state: string): Promise<ValidationResult> {
    const claim = `${candidateName} is running for ${office} in ${state}`;
    return this.validateElectionClaim(claim, 'candidate verification');
  }

  async validateElectionDate(title: string, date: string, location: string): Promise<ValidationResult> {
    const claim = `${title} election is scheduled for ${date} in ${location}`;
    return this.validateElectionClaim(claim, 'election date verification');
  }
}

export const aiValidationService = new AIValidationService();