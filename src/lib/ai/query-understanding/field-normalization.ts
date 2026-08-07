export type CanonicalRequestedField = 'summary' | 'profession' | 'role' | 'ownership' | 'skills' | 'technologies' | 'projects' | 'education' | 'experience' | 'certifications' | 'linkedin_url' | 'github_url' | 'portfolio_url' | 'website_url' | 'email' | 'phone' | 'contact' | 'unknown';

const MAP: Record<Exclude<CanonicalRequestedField, 'unknown'>, RegExp> = {
  education: /\b(?:education|academic background|qualifications?|degree|stud(?:y|ied|ies|ying)|currently\s+studying|padh\s+(?:raha|rahi)|padh(?:a|e)|attend(?:ed|ing)?|schooling|college|university|educational background|graduation|graduate|padhai|padhai ki|degree ki|shiksha|kya padha hai|kaha padha hai|academic details|bhanelu|abhyas|kya bhanyo|kya study kari|b\.?com|bachelor\s+of\s+commerce|m\.?c\.?a|master\s+of\s+computer\s+application|b\.?tech|m\.?tech|ph\.?d|mba|bba|bca|commerce degree)\b/i,
  projects: /\b(?:projects?|work|built|created|developed|applications?|products?|portfolio work|kaam|banaya|banavelu)\b/i,
  skills: /\b(?:skills?|tech stack|stack|tools?|languages?|frontend|backend|what does (?:he|she|they) know)\b/i,
  technologies: /\b(?:technologies|technology|tech stack|tech|kis tech me|shu use kare chhe)\b/i,
  experience: /\b(?:experience|work experience|background|ketla varsh|kitna experience)\b/i,
  role: /\b(?:role|profession|occupation|job|kya karta hai|shu kare chhe)\b/i,
  ownership: /\b(?:owner|ownership|founder|creator|own)\b/i,
  certifications: /\b(?:certifications?|certificates?|course|training|institute|academy|learned)\b/i,
  linkedin_url: /\b(?:linkedin|linkdin|lindin)\b/i,
  github_url: /\b(?:github|git hub)\b/i,
  portfolio_url: /\bportfolio\b/i,
  website_url: /\b(?:website|web site)\b/i,
  email: /\b(?:email|mail id)\b/i,
  phone: /\b(?:phone|mobile|number)\b/i,
  contact: /\bcontact\b/i,
  summary: /\b(?:about|summary|profile|introduce|introduction|kon hai|kaun hai|who (?:is|are))\b/i,
  profession: /\b(?:profession|occupation)\b/i,
};
export function normalizeRequestedField(query:string){const fields=(Object.entries(MAP).filter(([,pattern])=>pattern.test(query)).map(([field])=>field) as CanonicalRequestedField[]);const specific=fields.filter(field=>field!=='summary');return{requestedFields:specific.length?specific:fields.length?fields:['unknown' as const],confidence:specific.length?.96:fields.length?.8:.2,method:'deterministic' as const};}
