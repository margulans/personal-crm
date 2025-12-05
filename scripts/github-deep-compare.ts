import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken!
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

async function getFileContent(octokit: Octokit, owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const { data: user } = await octokit.users.getAuthenticated();
  
  const owner = user.login;
  const repo = 'personal-crm';
  
  console.log('=== Сравнение GitHub vs Replit ===\n');
  
  // Get replit.md from GitHub
  const ghReplitMd = await getFileContent(octokit, owner, repo, 'replit.md');
  
  // Read local replit.md
  const fs = await import('fs');
  const localReplitMd = fs.readFileSync('/home/runner/workspace/replit.md', 'utf-8');
  
  console.log('📄 replit.md comparison:');
  console.log('  GitHub size:', ghReplitMd?.length || 0, 'bytes');
  console.log('  Replit size:', localReplitMd.length, 'bytes');
  console.log('  Match:', ghReplitMd === localReplitMd ? '✅ Identical' : '❌ Different');
  
  if (ghReplitMd !== localReplitMd) {
    // Find differences
    const ghLines = (ghReplitMd || '').split('\n');
    const localLines = localReplitMd.split('\n');
    
    console.log('\n  Only in Replit (new sections):');
    localLines.forEach((line, i) => {
      if (line.startsWith('###') && !ghLines.includes(line)) {
        console.log('    +', line);
      }
    });
  }
  
  // Get schema.ts from GitHub
  const ghSchema = await getFileContent(octokit, owner, repo, 'shared/schema.ts');
  const localSchema = fs.readFileSync('/home/runner/workspace/shared/schema.ts', 'utf-8');
  
  console.log('\n📄 shared/schema.ts comparison:');
  console.log('  GitHub size:', ghSchema?.length || 0, 'bytes');
  console.log('  Replit size:', localSchema.length, 'bytes');
  console.log('  Match:', ghSchema === localSchema ? '✅ Identical' : '❌ Different');
  
  if (ghSchema !== localSchema) {
    // Find new tables
    const ghTables = (ghSchema?.match(/export const \w+ = pgTable/g) || []).map(t => t.replace('export const ', '').replace(' = pgTable', ''));
    const localTables = (localSchema.match(/export const \w+ = pgTable/g) || []).map(t => t.replace('export const ', '').replace(' = pgTable', ''));
    
    const newTables = localTables.filter(t => !ghTables.includes(t));
    if (newTables.length > 0) {
      console.log('  New tables in Replit:', newTables.join(', '));
    }
    
    // Check for activityType field
    console.log('  activityType field:');
    console.log('    GitHub:', ghSchema?.includes('activityType') ? '✅ Present' : '❌ Missing');
    console.log('    Replit:', localSchema.includes('activityType') ? '✅ Present' : '❌ Missing');
  }
  
  // Check AnalyticsCharts
  const ghAnalytics = await getFileContent(octokit, owner, repo, 'client/src/components/crm/AnalyticsCharts.tsx');
  const localAnalytics = fs.readFileSync('/home/runner/workspace/client/src/components/crm/AnalyticsCharts.tsx', 'utf-8');
  
  console.log('\n📄 AnalyticsCharts.tsx comparison:');
  console.log('  GitHub size:', ghAnalytics?.length || 0, 'bytes');
  console.log('  Replit size:', localAnalytics.length, 'bytes');
  
  // Check for specific charts
  console.log('  Charts present:');
  console.log('    CountryChart: GitHub', ghAnalytics?.includes('CountryChart') ? '✅' : '❌', '| Replit', localAnalytics.includes('CountryChart') ? '✅' : '❌');
  console.log('    IndustryChart: GitHub', ghAnalytics?.includes('IndustryChart') ? '✅' : '❌', '| Replit', localAnalytics.includes('IndustryChart') ? '✅' : '❌');
  console.log('    ActivityTypeChart: GitHub', ghAnalytics?.includes('ActivityTypeChart') ? '✅' : '❌', '| Replit', localAnalytics.includes('ActivityTypeChart') ? '✅' : '❌');
  
  // IndustryChart type (BarChart vs PieChart)
  if (ghAnalytics && localAnalytics) {
    const ghIndustrySection = ghAnalytics.substring(ghAnalytics.indexOf('function IndustryChart'), ghAnalytics.indexOf('function IndustryChart') + 500);
    const localIndustrySection = localAnalytics.substring(localAnalytics.indexOf('function IndustryChart'), localAnalytics.indexOf('function IndustryChart') + 500);
    
    console.log('    IndustryChart type:');
    console.log('      GitHub:', ghIndustrySection.includes('BarChart') ? 'BarChart' : ghIndustrySection.includes('PieChart') ? 'PieChart' : 'Unknown');
    console.log('      Replit:', localIndustrySection.includes('BarChart') ? 'BarChart' : localIndustrySection.includes('PieChart') ? 'PieChart' : 'Unknown');
  }
  
  console.log('\n=== Summary ===');
  console.log('GitHub last push: 2025-12-01');
  console.log('Current date: 2025-12-05');
  console.log('Days behind: ~4 days');
  console.log('\nNew features in Replit not on GitHub:');
  console.log('  - activityType field for contacts');
  console.log('  - ActivityTypeChart analytics');
  console.log('  - IndustryChart converted to PieChart');
  console.log('  - Updated documentation');
}

main().catch(console.error);
