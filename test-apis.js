// Simple API test script
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testAPIs() {
  console.log('=== FINAL API STATUS REPORT ===\n');
  
  const tests = [
    {
      name: 'Google Civic API',
      test: async () => {
        const res = await fetch(`https://www.googleapis.com/civicinfo/v2/elections?key=${process.env.GOOGLE_CIVIC_API_KEY}`);
        return res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    },
    {
      name: 'OpenFEC API',
      test: async () => {
        const res = await fetch(`https://api.open.fec.gov/v1/candidates/?api_key=${process.env.OPENFEC_API_KEY}&per_page=1`);
        return res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    },
    {
      name: 'MapQuest API',
      test: async () => {
        const res = await fetch(`http://www.mapquestapi.com/geocoding/v1/address?key=${process.env.MAPQUEST_API_KEY}&location=DC`);
        return res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    },
    {
      name: 'Perplexity API',
      test: async () => {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{role: 'user', content: 'test'}],
            max_tokens: 5
          })
        });
        return res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    },
    {
      name: 'OpenAI API',
      test: async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{role: 'user', content: 'test'}],
            max_tokens: 5
          })
        });
        const data = await res.json();
        return res.status === 200 ? '✅ WORKING' : `❌ INVALID KEY (${data.error?.message || res.status})`;
      }
    },
    {
      name: 'OpenStates API',
      test: async () => {
        const res = await fetch(`https://v3.openstates.org/people?jurisdiction=California&page=1&per_page=1&apikey=${process.env.OPENSTATES_API_KEY}`);
        return res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    },
    {
      name: 'ProPublica API',
      test: async () => {
        const res = await fetch('https://api.propublica.org/congress/v1/members/house/CA/current.json', {
          headers: {'X-API-Key': process.env.PROPUBLICA_API_KEY}
        });
        return res.status === 200 ? '✅ WORKING' : `❌ INVALID KEY (${res.status})`;
      }
    },
    {
      name: 'Census API',
      test: async () => {
        const res = await fetch(`https://api.census.gov/data/2020/dec/pl?get=NAME&for=state:06&key=${process.env.CENSUS_API_KEY}`);
        return res.status === 200 ? '✅ WORKING' : `❌ INVALID KEY`;
      }
    },
    {
      name: 'Firecrawl API',
      test: async () => {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({url: 'https://example.com', timeout: 5000})
        });
        return res.status === 408 ? '⚠️ TIMEOUT (connected)' : res.status === 200 ? '✅ WORKING' : `❌ ERROR (${res.status})`;
      }
    }
  ];

  let workingCount = 0;
  let brokenCount = 0;
  
  for (const {name, test} of tests) {
    try {
      const result = await test();
      console.log(`${name}: ${result}`);
      if (result.includes('✅')) workingCount++;
      else if (result.includes('❌')) brokenCount++;
    } catch (error) {
      console.log(`${name}: ❌ ERROR (${error.message})`);
      brokenCount++;
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Working APIs: ${workingCount}/9`);
  console.log(`❌ Broken APIs: ${brokenCount}/9`);
  console.log(`Success Rate: ${Math.round(workingCount/9*100)}%`);
}

testAPIs().catch(console.error);
