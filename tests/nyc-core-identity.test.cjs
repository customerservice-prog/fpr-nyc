const { test } = require('node:test');
const { strict: assert } = require('node:assert');
const fs = require('fs');
const path = require('path');

// Core files that must be NYC-only
const CORE_FILES = [
  'lib/nycSeo.ts',
  'lib/utils.ts',
  'lib/nycPublicCopy.ts',
  'lib/nycEmail.ts',
  'lib/delivery.ts',
  'prisma/seed.js',
];

// Patterns that indicate SC/Greenville contamination (not in replace patterns or comments)
const FORBIDDEN_VALUES = [
  '864-610-5324', // SC phone in actual value
  'friendlypartyrentalsc.com', // SC domain
  'Greenville, SC', // combined
  'Upstate South Carolina', // location phrase
];

test('NYC Core Identity - No SC References', async (t) => {
  for (const file of CORE_FILES) {
    await t.test(`${file} has no SC references`, () => {
      const filePath = path.join(__dirname, '..', file);
      assert(fs.existsSync(filePath), `File must exist: ${file}`);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for actual SC phone (not 315)
      if (content.includes('864-610-5324')) {
        throw new Error(`Found SC phone 864-610-5324 in ${file}`);
      }
      
      // Check for SC domain
      if (content.includes('friendlypartyrentalsc.com')) {
        throw new Error(`Found SC domain in ${file}`);
      }
      
      // nycPublicCopy.ts can have "Greenville" in regex patterns, but not as bare value
      if (file === 'lib/nycPublicCopy.ts') {
        // This file is allowed replacement patterns
        return;
      }
      
      // Other files: no Greenville except in comments or as location context
      if (file !== 'lib/nycPublicCopy.ts' && content.includes('Greenville')) {
        // Check if it's actually a forbidden value, not just comment
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('Greenville') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            throw new Error(`Found "Greenville" in ${file} at line ${i + 1}: ${line.trim()}`);
          }
        }
      }
    });
  }
});

test('NYC Core Identity - BUSINESS object', async (t) => {
  await t.test('BUSINESS has NYC name and contact', () => {
    const filePath = path.join(__dirname, '..', 'lib/utils.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes("'Friendly Party Rental NYC'"), 'Must have NYC business name');
    assert(content.includes("'315-884-1498'"), 'Must have NYC phone');
    assert(content.includes("'customerservice@friendlypartyrental.com'"), 'Must have NYC email');
  });
});

test('NYC Core Identity - Delivery Reference', async (t) => {
  await t.test('delivery.ts uses 10471 (Riverdale) reference', () => {
    const filePath = path.join(__dirname, '..', 'lib/delivery.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes("'10471'"), 'Must reference ZIP 10471');
    assert(content.includes('pricing-reference') || content.includes('pricing reference'), 'Must mark as pricing reference');
  });

  await t.test('delivery.ts says Downstate delivery only', () => {
    const filePath = path.join(__dirname, '..', 'lib/delivery.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes('Downstate') || content.includes('Lower Westchester') || content.includes('Riverdale'), 
      'Must reference Downstate/NYC geography');
    assert(!content.includes('Greenville'), 'Must not say Greenville');
  });
});

test('NYC Core Identity - SEO Configuration', async (t) => {
  await t.test('nycSeo.ts uses NYC_SITE_URL env var with fallback', () => {
    const filePath = path.join(__dirname, '..', 'lib/nycSeo.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes('process.env.NEXT_PUBLIC_SITE_URL'), 'Must use env var');
    assert(content.includes('fpr-nyc-production.up.railway.app'), 'Must have Railway fallback');
  });

  await t.test('nycSeo.ts has PUBLIC_INDEXABLE gate', () => {
    const filePath = path.join(__dirname, '..', 'lib/nycSeo.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes('PUBLIC_INDEXABLE'), 'Must check PUBLIC_INDEXABLE env var');
    assert(content.includes('index:') && content.includes('follow:'), 'Must control robots index/follow');
  });

  await t.test('nycSeo exports renamed functions', () => {
    const filePath = path.join(__dirname, '..', 'lib/nycSeo.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const funcs = ['nycUrl', 'nycMetaText', 'nycPageMetadata', 'nycBreadcrumbs'];
    for (const fn of funcs) {
      assert(content.includes(`export function ${fn}`), `Must export ${fn}`);
    }
  });
});

test('NYC Core Identity - Email Configuration', async (t) => {
  await t.test('nycEmail.ts uses NYC contact info', () => {
    const filePath = path.join(__dirname, '..', 'lib/nycEmail.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes('315-884-1498') || content.includes('NYC'), 'Must reference NYC');
    assert(!content.includes('864-610-5324'), 'Must not have SC phone');
  });
});

test('NYC Core Identity - Seed Data', async (t) => {
  await t.test('seed.js has NYC service areas with NY ZIPs', () => {
    const filePath = path.join(__dirname, '..', 'prisma/seed.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for at least some NYC ZIPs
    const nycZips = ['10471', '10463', '10701'];
    let foundZips = 0;
    for (const zip of nycZips) {
      if (content.includes(`'${zip}'`)) foundZips++;
    }
    assert(foundZips >= 2, 'Must have multiple NYC ZIPs');
  });

  await t.test('seed.js has INITIAL CATALOG SCAFFOLD comment', () => {
    const filePath = path.join(__dirname, '..', 'prisma/seed.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes('INITIAL CATALOG SCAFFOLD'), 'Must have scaffold comment');
  });

  await t.test('seed.js company settings use NYC', () => {
    const filePath = path.join(__dirname, '..', 'prisma/seed.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert(content.includes("'Friendly Party Rental NYC'"), 'Must have NYC company name');
    assert(content.includes("'America/New_York'"), 'Must have NY timezone');
    assert(content.includes("'NY'"), 'Must have NY state');
  });
});

console.log('\n✅ NYC core identity validation suite ready');
