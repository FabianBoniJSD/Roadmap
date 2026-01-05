import { sp } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/batching';

// This function initializes the SharePoint client using env-based site selection
export const getSP = () => {
  const env = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
  const devSite =
    process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV || 'https://spi.intranet.bs.ch/JSD/Digital';
  const prodSite = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD || devSite;
  const baseUrl = (env === 'production' ? prodSite : devSite).replace(/\/$/, '');
  // Configure base URL once per process
  sp.setup({ sp: { baseUrl } });
  return sp;
};

// SharePoint list names - define all your lists here
export const SP_LISTS = {
  PROJECTS: 'Roadmap Projects',
  CATEGORIES: 'Roadmap Categories',
  FIELD_TYPES: 'Roadmap FieldTypes',
  FIELDS: 'Roadmap Fields',
  TEAM_MEMBERS: 'Roadmap Team Members',
};
