export interface TenantConfig {
  tenantId: string;
  name: string;
  logo: string;
  logoAlt?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  locale: string;
  currency: string;
  supportedLocales: string[];
  features: {
    flights: boolean;
    hotels: boolean;
    experiences: boolean;
    transfers: boolean;
    events: boolean;
    collaboration: boolean;
  };
}
