export type ProfileIntent = 'linkedin_profile'|'github_profile'|'portfolio_url'|'email'|'phone'|'owner'|'role'|'skills'|'education'|'project'|'general_knowledge';
export interface QueryIntent { intent: ProfileIntent; personName?: string; platform?: 'linkedin'|'github'|'portfolio'; normalizedQuery: string; aliases: string[]; confidence: number; matchedTerms: string[]; }
const FILLERS = new Set(['ni','no','ne','ki','ka','ke','su','shu','ch','che','hai','he','kya','batao','aap','aapo','what','is','the','of']);
const LINKEDIN = ['linkedin','linked','linkdin','lindin','linkdn','linkedn']; const PROFILE = ['profile','proflie','ptofile','profle','profil','account','url','link'];
function normalize(query: string) { return query.toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim(); }
function distance(a: string, b: string) { const table = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j=1;j<=b.length;j+=1) table[0][j]=j; for (let i=1;i<=a.length;i+=1) for (let j=1;j<=b.length;j+=1) table[i][j]=Math.min(table[i-1][j]+1,table[i][j-1]+1,table[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return table[a.length][b.length]; }
function matches(token: string, aliases: string[]) { return aliases.some((alias) => token === alias || (token.length >= 5 && distance(token, alias) <= 2)); }
export function parseQueryIntent(query: string): QueryIntent {
 const normalizedQuery = normalize(query); const terms = normalizedQuery.split(' ').filter(Boolean); const linkedinTerms = terms.filter((term) => matches(term, LINKEDIN)); const githubTerms = terms.filter((term) => term === 'github' || term === 'git'); const profileTerms = terms.filter((term) => matches(term, PROFILE));
 let intent: ProfileIntent='general_knowledge'; let platform: QueryIntent['platform']; let matchedTerms: string[]=[]; let confidence=0;
 if (linkedinTerms.length && (profileTerms.length || linkedinTerms.length)) { intent='linkedin_profile'; platform='linkedin'; matchedTerms=[...linkedinTerms,...profileTerms]; confidence=linkedinTerms.some((term)=>term==='linkedin') ? .98 : .82; }
 else if (githubTerms.length && (profileTerms.length || githubTerms.length)) { intent='github_profile'; platform='github'; matchedTerms=[...githubTerms,...profileTerms]; confidence=.95; }
 else if (terms.includes('portfolio')) { intent='portfolio_url'; platform='portfolio'; matchedTerms=['portfolio']; confidence=.95; }
 const anchor = terms.findIndex((term) => linkedinTerms.includes(term) || githubTerms.some((githubTerm) => githubTerm === term) || term==='portfolio'); const nameParts = (anchor > 0 ? terms.slice(Math.max(0,anchor-3),anchor) : []).filter((term)=>!FILLERS.has(term) && term.length>1); const personName = nameParts.length ? nameParts.map((term)=>term[0].toUpperCase()+term.slice(1)).join(' ') : undefined; const aliases=personName?[personName,personName.split(' ').reverse().join(' ')]:[];
 return { intent, personName, platform, normalizedQuery, aliases:[...new Set(aliases)], confidence, matchedTerms };
}
