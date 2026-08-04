export type SupportedPlatform = 'linkedin' | 'github' | 'gitlab' | 'instagram' | 'facebook' | 'x' | 'youtube' | 'website' | 'unknown';

export type LinkRequestType = 'platform_homepage' | 'entity_profile' | 'ambiguous';

export type LinkRequestClassification = {
  linkRequestType: LinkRequestType;
  platform: SupportedPlatform;
  entityName: string | null;
};
