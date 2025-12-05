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

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  // Get user info
  const { data: user } = await octokit.users.getAuthenticated();
  console.log('GitHub User:', user.login);
  
  // List repos and find personal-CRM
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 100 });
  
  const crmRepo = repos.find(r => 
    r.name.toLowerCase().includes('personal') && r.name.toLowerCase().includes('crm') ||
    r.name.toLowerCase() === 'personal-crm'
  );
  
  if (!crmRepo) {
    console.log('\nNo "personal-CRM" repo found. Available repos:');
    repos.slice(0, 30).forEach(r => console.log(' -', r.name));
    return;
  }
  
  console.log('\n=== Repository Info ===');
  console.log('Name:', crmRepo.full_name);
  console.log('Description:', crmRepo.description);
  console.log('Default branch:', crmRepo.default_branch);
  console.log('Last push:', crmRepo.pushed_at);
  
  // Get repo contents (root)
  const { data: contents } = await octokit.repos.getContent({
    owner: user.login,
    repo: crmRepo.name,
    path: ''
  });
  
  console.log('\n=== Root Structure ===');
  if (Array.isArray(contents)) {
    contents.forEach(item => console.log(' ', item.type === 'dir' ? '📁' : '📄', item.name));
  }
  
  // Try to get README
  try {
    const { data: readme } = await octokit.repos.getReadme({
      owner: user.login,
      repo: crmRepo.name
    });
    const content = Buffer.from(readme.content, 'base64').toString('utf-8');
    console.log('\n=== README.md ===');
    console.log(content.substring(0, 3000));
    if (content.length > 3000) console.log('\n... (truncated)');
  } catch (e) {
    console.log('\nNo README found');
  }
  
  // Get recent commits
  const { data: commits } = await octokit.repos.listCommits({
    owner: user.login,
    repo: crmRepo.name,
    per_page: 15
  });
  
  console.log('\n=== Recent commits on GitHub ===');
  commits.forEach(c => console.log(' -', c.sha.substring(0, 7), c.commit.message.split('\n')[0], '|', c.commit.author?.date?.substring(0,10)));
}

main().catch(console.error);
