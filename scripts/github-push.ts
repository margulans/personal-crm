// GitHub push script using Octokit
// Integration: connection:conn_github_01KBCTKSBY2Y7V72T2QMW73JK8
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const OWNER = 'margulans';
const REPO = 'personal-crm';
const BRANCH = 'main';

async function getAllFiles(dir: string, baseDir: string = dir): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const ignoreDirs = ['node_modules', '.git', 'dist', '.replit', '.cache', '.config', '.upm', 'attached_assets'];
  const ignoreFiles = ['.replit', 'replit.nix', '.gitattributes'];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (ignoreDirs.includes(entry.name)) continue;
    if (ignoreFiles.includes(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;

    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath, baseDir));
    } else {
      try {
        const content = fs.readFileSync(fullPath);
        const base64Content = content.toString('base64');
        files.push({ path: relativePath, content: base64Content });
      } catch (e) {
        console.warn(`Skipping file ${relativePath}: ${e}`);
      }
    }
  }

  return files;
}

async function pushToGitHub(commitMessage: string) {
  console.log('🚀 Starting GitHub push...');
  
  const octokit = await getUncachableGitHubClient();
  
  // Get the current commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
  });
  const currentCommitSha = ref.object.sha;
  console.log(`📍 Current commit: ${currentCommitSha.slice(0, 7)}`);

  // Get the current tree
  const { data: currentCommit } = await octokit.git.getCommit({
    owner: OWNER,
    repo: REPO,
    commit_sha: currentCommitSha,
  });
  const currentTreeSha = currentCommit.tree.sha;

  // Get all files
  console.log('📁 Collecting files...');
  const files = await getAllFiles('.');
  console.log(`📦 Found ${files.length} files`);

  // Create blobs for all files
  console.log('🔄 Creating blobs...');
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  
  for (const file of files) {
    const { data: blob } = await octokit.git.createBlob({
      owner: OWNER,
      repo: REPO,
      content: file.content,
      encoding: 'base64',
    });
    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  // Create a new tree
  console.log('🌳 Creating tree...');
  const { data: newTree } = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    base_tree: currentTreeSha,
    tree: treeItems,
  });

  // Create a new commit
  console.log('💾 Creating commit...');
  const { data: newCommit } = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: commitMessage,
    tree: newTree.sha,
    parents: [currentCommitSha],
  });

  // Update the reference
  console.log('🔗 Updating reference...');
  await octokit.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha,
  });

  console.log(`✅ Successfully pushed commit: ${newCommit.sha.slice(0, 7)}`);
  console.log(`📝 Message: ${commitMessage}`);
  console.log(`🔗 https://github.com/${OWNER}/${REPO}/commit/${newCommit.sha}`);
}

const commitMessage = process.argv[2] || 'Update from Replit';
pushToGitHub(commitMessage).catch(console.error);
