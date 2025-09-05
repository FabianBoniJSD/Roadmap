#!/usr/bin/env node
/**
 * Quick NTLM diagnostic runner.
 * Prereq: dev server running (next dev or next start) and SP_PROXY_DEBUG=true
 * Usage: npm run ntlm:diag
 */
import os from 'os';

const base = process.env.NTLM_DIAG_BASE || 'http://localhost:3000';
const url = base.replace(/\/$/,'') + '/api/sharepoint-auth/ntlm-dump';

async function main(){
  try {
    const r = await fetch(url);
    const j = await r.json();
    if(r.status !== 200){
      console.log('Status', r.status, j);return;
    }
    const core = {
      site: j.site,
      preflight: j.preflight,
      type1Status: j.responseStatus,
      found: j.ntlm?.found,
      decodedTarget: j.ntlm?.decode?.targetName,
      flags: j.ntlm?.decode?.flags,
      attempt2Found: j.attempt2?.ntlm?.found,
      domainVariantsTried: j.domainVariants?.length,
      firstVariantFound: j.domainVariants?.find?.(v=>v.ntlm?.found)?.domainVariant ?? null,
      emptyDWFound: j.emptyDW?.found,
      rawAttemptFound: j.rawAttempt?.found,
      dns: j.dns,
      timing: j.timing
    };
    console.log('NTLM DIAG SUMMARY');
    console.log(JSON.stringify(core,null,2));
    if(!core.found && !core.attempt2Found){
      console.log('\nNo NTLM Type2 challenge detected. If IIS config was changed (NTLM moved up), ensure:');
      console.log('- Windows Authentication enabled (NTLM)');
      console.log('- Negotiate (Kerberos) either disabled or NTLM provider above if Kerberos SPNs missing');
      console.log('- Site accessible from this host (see DNS above)');
      console.log('- No SSL inspection stripping headers');
    }
  } catch(e){
    console.error('Diag error', e.message);
  }
}
main();
