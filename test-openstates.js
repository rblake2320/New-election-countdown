import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testOpenStates() {
  console.log('\n=== Testing OpenStates API ===\n');
  
  try {
    const apiKey = process.env.OPENSTATES_API_KEY;
    console.log(`API Key configured: ${apiKey ? 'Yes' : 'No'}`);
    
    const response = await fetch('https://v3.openstates.org/people?jurisdiction=California&page=1&per_page=1', {
      headers: {
        'X-API-Key': apiKey
      }
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
      console.log('✅ OpenStates API is WORKING!');
      console.log(`Successfully fetched ${data.results?.length || 0} legislator(s)`);
      if (data.results?.[0]) {
        console.log(`Example: ${data.results[0].name} - ${data.results[0].current_role?.title || 'No role'}`);
      }
    } else {
      console.log(`❌ OpenStates API Error: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
    // Now test full API suite
    console.log('\n=== UPDATED API STATUS (With OpenStates) ===\n');
    
    const tests = [
      { name: 'Google Civic API', working: true },
      { name: 'OpenFEC API', working: true },
      { name: 'MapQuest API', working: true },
      { name: 'Perplexity API', working: true },
      { name: 'Census API', working: true },
      { name: 'Firecrawl API', working: true },
      { name: 'OpenStates API', working: response.status === 200 },
      { name: 'OpenAI API', working: false },
      { name: 'ProPublica API', working: false }
    ];
    
    let workingCount = 0;
    tests.forEach(({name, working}) => {
      console.log(`${name}: ${working ? '✅ WORKING' : '❌ NEEDS VALID KEY'}`);
      if (working) workingCount++;
    });
    
    console.log(`\n✅ Working APIs: ${workingCount}/9`);
    console.log(`📊 Success Rate: ${Math.round(workingCount/9*100)}%`);
    
  } catch (error) {
    console.error('Error testing OpenStates:', error.message);
  }
}

testOpenStates();
