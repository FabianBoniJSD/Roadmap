/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import type { AsyncLocalStorage } from 'async_hooks';
import { AppSettings, Category, Project, ProjectLink, TeamMember } from '@/types';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';

type NodeRequireFn = typeof require;
type AsyncLocalStorageCtor = new <T>() => AsyncLocalStorage<T>;
let instanceContextStorage: AsyncLocalStorage<string | null> | null = null;
let asyncLocalStorageCtor: AsyncLocalStorageCtor | null = null;

const nodeRequire = (): NodeRequireFn | null => {
  if (typeof window !== 'undefined') return null;
  try {
    // Use eval to avoid bundlers attempting to resolve this require on the client bundle.
    return eval('require') as NodeRequireFn;
  } catch {
    return null;
  }
};

const getAsyncLocalStorageCtor = (): AsyncLocalStorageCtor | null => {
  if (asyncLocalStorageCtor || typeof window !== 'undefined') return asyncLocalStorageCtor;

  const req = nodeRequire();
  if (!req) return null;

  try {
    const mod =
      (req('node:async_hooks') as { AsyncLocalStorage?: AsyncLocalStorageCtor }) ??
      (req('async_hooks') as { AsyncLocalStorage?: AsyncLocalStorageCtor });
    asyncLocalStorageCtor = mod?.AsyncLocalStorage ?? null;
  } catch (error) {
    console.warn('[clientDataService] AsyncLocalStorage unavailable', error);
    asyncLocalStorageCtor = null;
  }

  return asyncLocalStorageCtor;
};

const getInstanceContextStorage = (): AsyncLocalStorage<string | null> | null => {
  if (typeof window !== 'undefined') return null;
  const ctor = getAsyncLocalStorageCtor();
  if (!ctor) return null;

  if (!instanceContextStorage) {
    instanceContextStorage = new ctor<string | null>();
  }
  return instanceContextStorage;
};

// SharePoint list names
const SP_LISTS = {
  PROJECTS: 'RoadmapProjects',
  CATEGORIES: 'RoadmapCategories',
  FIELD_TYPES: 'RoadmapFieldTypes',
  FIELDS: 'RoadmapFields',
  TEAM_MEMBERS: 'RoadmapTeamMembers',
  USERS: 'RoadmapUsers',
  SETTINGS: 'RoadmapSettings',
  PROJECT_LINKS: 'RoadmapProjectLinks', // Neue Liste für Projekt-Links
};

// Space / alias variants per list (SharePoint often has spaced titles)
const SP_LIST_VARIANTS: Record<string, string[]> = {
  [SP_LISTS.PROJECTS]: ['Roadmap Projects'],
  [SP_LISTS.CATEGORIES]: ['Roadmap Categories'],
  [SP_LISTS.SETTINGS]: ['Roadmap Settings'],
  [SP_LISTS.FIELD_TYPES]: ['Roadmap Field Types', 'Roadmap FieldTypes'],
  [SP_LISTS.FIELDS]: ['Roadmap Fields'],
  [SP_LISTS.TEAM_MEMBERS]: ['Roadmap Team Members'],
  [SP_LISTS.USERS]: ['Roadmap Users'],
  [SP_LISTS.PROJECT_LINKS]: ['Roadmap Project Links'],
};

// Client-side data service using fetch API instead of PnP JS
class ClientDataService {
  // Cache for list metadata types
  private metadataCache: Record<string, string> = {};
  // Cache for request digest
  private requestDigestCache: Record<string, { value: string; expiration: number }> = {};
  // Cache for list field internal names
  private listFieldsCache: Record<string, Set<string>> = {};
  // Cache for list field types (InternalName -> TypeAsString)
  private listFieldTypeCache: Record<string, Record<string, string>> = {};
  // Cache for resolved list titles (handles space/no-space variants)
  private listTitleCache: Record<string, string> = {};

  private prepareFetch(
    url: string,
    init: RequestInit = {}
  ): { url: string; init: RequestInit & { next?: { revalidate?: number } } } {
    const prepared = { ...init } as RequestInit & { next?: { revalidate?: number } };
    const isServer = typeof window === 'undefined';
    const originalMethod = (prepared.method || 'GET').toString().toUpperCase();

    if (isServer) {
      prepared.cache = 'no-store';
      prepared.next = { ...(prepared.next || {}), revalidate: 0 };
      const existingHeaders = new Headers(prepared.headers as HeadersInit | undefined);
      if (!existingHeaders.has('Cache-Control')) {
        existingHeaders.set('Cache-Control', 'no-cache');
      }
      prepared.headers = existingHeaders;
    }

    let finalUrl = url;
    if (isServer && finalUrl.startsWith('/')) {
      const base = (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );
      finalUrl = base + finalUrl;
    }
    if (isServer && (originalMethod === 'GET' || originalMethod === 'HEAD')) {
      const cacheBust = `cb=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + cacheBust;
    }

    const activeSlug = isServer ? this.getActiveInstanceSlug() : null;
    if (isServer && activeSlug) {
      const headers =
        prepared.headers instanceof Headers
          ? prepared.headers
          : new Headers(prepared.headers as HeadersInit | undefined);
      headers.set('x-roadmap-instance', activeSlug);

      const cookieValue = `${INSTANCE_COOKIE_NAME}=${activeSlug}`;
      const existingCookie = headers.get('cookie');
      if (existingCookie) {
        const segments = existingCookie
          .split(';')
          .map((segment) => segment.trim())
          .filter(Boolean)
          .filter((segment) => !segment.toLowerCase().startsWith(`${INSTANCE_COOKIE_NAME}=`));
        segments.push(cookieValue);
        headers.set('cookie', segments.join('; '));
      } else {
        headers.set('cookie', cookieValue);
      }
      prepared.headers = headers;

      try {
        const urlObj = new URL(finalUrl);
        urlObj.searchParams.set(INSTANCE_QUERY_PARAM, activeSlug);
        finalUrl = urlObj.toString();
      } catch {
        /* ignore invalid URL transforms */
      }
    }

    return { url: finalUrl, init: prepared };
  }

  private async spFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const { url: finalUrl, init: prepared } = this.prepareFetch(url, init);
    return fetch(finalUrl, prepared);
  }

  private getWebUrl(): string {
    // Route all SharePoint REST calls through Next.js API proxy to avoid CORS
    // On the server, Node's fetch requires an absolute URL
    if (typeof window === 'undefined') {
      const base = (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );
      return base + '/api/sharepoint';
    }
    return '/api/sharepoint';
  }

  private getActiveInstanceSlug(): string | null {
    const storage = getInstanceContextStorage();
    if (!storage) return null;
    return storage.getStore() ?? null;
  }

  private getDigestCacheKey(): string {
    const slug = this.getActiveInstanceSlug();
    if (slug) return slug;
    if (typeof window !== 'undefined') {
      try {
        const cookies = document.cookie || '';
        const match = cookies.match(
          new RegExp(`(?:^|;\\s*)${INSTANCE_COOKIE_NAME}=([^;\\s]+)`, 'i')
        );
        if (match && match[1]) return decodeURIComponent(match[1]);
      } catch {
        /* ignore cookie access issues */
      }
    }
    return '__default__';
  }

  async withInstance<T>(slug: string | null | undefined, fn: () => Promise<T> | T): Promise<T> {
    const storage = getInstanceContextStorage();
    const callback = () => Promise.resolve(fn());
    if (!storage) {
      return await callback();
    }
    return await storage.run(slug ?? null, callback);
  }

  async requestDigest(): Promise<string> {
    return this.getRequestDigest();
  }

  async sharePointFetch(url: string, init: RequestInit = {}): Promise<Response> {
    return this.spFetch(url, init);
  }

  // Resolve actual list title by trying preferred and known variants, cache result
  async resolveListTitle(preferred: string, variants: string[] = []): Promise<string> {
    if (this.listTitleCache[preferred]) return this.listTitleCache[preferred];
    const candidates = [preferred, ...variants].filter(Boolean);
    const webUrl = this.getWebUrl();
    for (const name of candidates) {
      try {
        const url = `${webUrl}/_api/web/lists/getByTitle('${name}')?$select=Title&$top=1`;
        const r = await this.spFetch(url, {
          headers: { Accept: 'application/json;odata=nometadata' },
        });
        if (r.ok) {
          this.listTitleCache[preferred] = name;
          return name;
        }
      } catch {
        /* ignore and try next */
      }
    }
    // Fallback to preferred even if not confirmed
    this.listTitleCache[preferred] = preferred;
    return preferred;
  }

  // Discover internal field names for a list and cache them (per instance)
  async getListFieldNames(listName: string): Promise<Set<string>> {
    const cacheKey = `${this.getActiveInstanceSlug() || 'default'}:${listName}`;
    if (this.listFieldsCache[cacheKey]) return this.listFieldsCache[cacheKey];
    try {
      const webUrl = this.getWebUrl();
      const resolvedName = await this.resolveListTitle(listName, SP_LIST_VARIANTS[listName] || []);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedName}')/fields?$select=InternalName`;
      const resp = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!resp.ok) {
        // Retry verbose
        const resp2 = await this.spFetch(endpoint, {
          headers: { Accept: 'application/json;odata=verbose' },
        });
        if (!resp2.ok) throw new Error('Failed to read fields');
        const data2 = await resp2.json();
        const results = (data2?.d?.results || []).map((f: any) => f.InternalName).filter(Boolean);
        this.listFieldsCache[cacheKey] = new Set(results);
        return this.listFieldsCache[cacheKey];
      }
      const data = await resp.json();
      const values: string[] = (data.value || []).map((f: any) => f.InternalName).filter(Boolean);
      this.listFieldsCache[cacheKey] = new Set(values);
      return this.listFieldsCache[cacheKey];
    } catch (e) {
      console.warn('[clientDataService] Could not fetch field names for list', listName, e);
      this.listFieldsCache[cacheKey] = new Set();
      return this.listFieldsCache[cacheKey];
    }
  }

  // Discover InternalName -> TypeAsString for a list (cached)
  private async getListFieldTypes(listName: string): Promise<Record<string, string>> {
    const cacheKey = `${this.getActiveInstanceSlug() || 'default'}:${listName}`;
    if (this.listFieldTypeCache[cacheKey]) return this.listFieldTypeCache[cacheKey];
    try {
      const resolvedName = await this.resolveListTitle(listName, SP_LIST_VARIANTS[listName] || []);
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedName}')/fields?$select=InternalName,TypeAsString`;
      let resp = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!resp.ok) {
        // Retry verbose
        resp = await this.spFetch(endpoint, {
          headers: { Accept: 'application/json;odata=verbose' },
        });
        if (!resp.ok) throw new Error('Failed to read field types');
        const dataV = await resp.json();
        const arr: any[] = dataV?.d?.results || [];
        const map: Record<string, string> = {};
        for (const f of arr)
          if (f.InternalName) map[String(f.InternalName)] = String(f.TypeAsString || '');
        this.listFieldTypeCache[cacheKey] = map;
        return map;
      }
      const data = await resp.json();
      const values: any[] = data?.value || [];
      const map: Record<string, string> = {};
      for (const f of values)
        if (f.InternalName) map[String(f.InternalName)] = String(f.TypeAsString || '');
      this.listFieldTypeCache[cacheKey] = map;
      return map;
    } catch (e) {
      console.warn('[clientDataService] Could not fetch field types for list', listName, e);
      this.listFieldTypeCache[cacheKey] = {};
      return {};
    }
  }

  private async getRequestDigest(): Promise<string> {
    // Check if we have a cached digest that's still valid
    const cacheKey = this.getDigestCacheKey();
    const now = Date.now();
    const cached = this.requestDigestCache[cacheKey];
    if (cached && cached.expiration > now) {
      return cached.value;
    }

    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/contextinfo`;

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Try to get the response text for better error messages
        const errorText = await response.text();
        console.error('Request Digest Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText,
        });
        throw new Error(`Failed to get request digest: ${response.statusText}`);
      }

      const data = await response.json();
      const digestValue = data.FormDigestValue;
      const expiresIn = data.FormDigestTimeoutSeconds * 1000;

      // Cache the digest
      this.requestDigestCache[cacheKey] = {
        value: digestValue,
        expiration: now + expiresIn - 60000, // Subtract 1 minute for safety
      };

      return digestValue;
    } catch (error) {
      console.error('Error getting request digest:', error);
      throw error;
    }
  }

  private async fetchFromSharePoint(listName: string, select: string = '*'): Promise<any[]> {
    const resolvedName = await this.resolveListTitle(listName, SP_LIST_VARIANTS[listName] || []);
    const webUrl = this.getWebUrl(); // '/api/sharepoint'
    const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedName}')/items?$select=${select}`;

    const parseAtom = (xml: string): any[] => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const entries = Array.from(doc.getElementsByTagName('entry'));
        return entries.map((entry) => {
          const props = entry.getElementsByTagNameNS(
            'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
            'properties'
          )[0];
          const item: any = {};
          if (props) {
            Array.from(props.children).forEach((child: any) => {
              const name = child.localName; // d:Title -> Title
              const text = child.textContent || '';
              // Prefer Id over ID, normalize both
              if (name === 'ID' && !item.Id) item.Id = text;
              item[name] = text;
            });
          }
          return item;
        });
      } catch (e) {
        console.error('[clientDataService] Atom parse failed', e);
        return [];
      }
    };

    try {
      // 1) First attempt: modern lightweight JSON
      let response = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!response.ok) {
        const firstText = await response.text();
        const invalid = /InvalidClientQuery|Invalid argument/i.test(firstText);
        if (invalid) {
          // 2) Second attempt: verbose JSON (older SP2013+ requirement)
          response = await this.spFetch(endpoint, {
            headers: { Accept: 'application/json;odata=verbose' },
          });
          if (!response.ok) {
            const secondText = await response.text();
            const stillInvalid = /InvalidClientQuery|Invalid argument/i.test(secondText);
            if (stillInvalid) {
              // 3) Third attempt: Atom (some legacy farms only answer with Atom for $select)
              const atomResp = await this.spFetch(endpoint, {
                headers: { Accept: 'application/atom+xml' },
              });
              if (atomResp.ok) {
                const atomXml = await atomResp.text();
                const items = parseAtom(atomXml);
                console.warn('[clientDataService] Fallback to Atom XML succeeded', {
                  count: items.length,
                  list: listName,
                });
                return items;
              } else {
                const atomText = await atomResp.text();
                console.error('SharePoint API Error Response (atom fallback):', {
                  status: atomResp.status,
                  statusText: atomResp.statusText,
                  url: atomResp.url,
                  body: atomText,
                });
                throw new Error(`SharePoint request failed (atom): ${atomResp.statusText}`);
              }
            } else {
              console.error('SharePoint API Error Response (verbose retry):', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                body: secondText,
              });
              throw new Error(`SharePoint request failed: ${response.statusText}`);
            }
          }
          // Verbose success path
          try {
            const dataVerbose = await response.json();
            return dataVerbose?.d?.results || [];
          } catch (e) {
            console.error('[clientDataService] Verbose JSON parse error', e);
            throw e;
          }
        } else {
          console.error('SharePoint API Error Response (first attempt):', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: firstText,
          });
          throw new Error(`SharePoint request failed: ${response.statusText}`);
        }
      }
      // Lightweight JSON success (but some farms still return verbose shape with 200)
      const data = await response.json();
      if (Array.isArray(data?.value)) return data.value;
      if (Array.isArray(data?.d?.results)) return data.d.results;
      // Some endpoints may return a single item in data.d
      if (data?.d && Array.isArray(data.d)) return data.d;
      return [];
    } catch (error) {
      console.error(`Error fetching from SharePoint list ${listName}:`, error);
      throw error;
    }
  }

  // Helper method to get the correct metadata type for a list
  private async getListMetadata(listName: string): Promise<string> {
    // Check if we have the metadata type cached
    if (this.metadataCache[listName]) {
      return this.metadataCache[listName];
    }

    try {
      const resolvedName = await this.resolveListTitle(listName, SP_LIST_VARIANTS[listName] || []);
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedName}')?$select=ListItemEntityTypeFullName`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Try to get the response text for better error messages
        const errorText = await response.text();
        console.error('List Metadata Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText,
        });
        throw new Error(`Failed to get list metadata: ${response.statusText}`);
      }

      const data = await response.json();
      const metadataType = data.ListItemEntityTypeFullName;

      // Cache the result
      this.metadataCache[listName] = metadataType;

      return metadataType;
    } catch (error) {
      console.error(`Error getting metadata for list ${listName}:`, error);
      // Fallback to the standard format
      const fallbackType = `SP.Data.${listName}ListItem`;
      this.metadataCache[listName] = fallbackType;
      return fallbackType;
    }
  }

  // PROJECT OPERATIONS
  async getAllProjects(): Promise<Project[]> {
    const candidateFields = [
      'Title',
      'Category',
      'StartQuarter',
      'EndQuarter',
      'Description',
      'Status',
      'Projektleitung',
      'Bisher',
      'Zukunft',
      'Fortschritt',
      'GeplantUmsetzung',
      'Budget',
      'StartDate',
      'EndDate',
      'ProjectFields',
      'Projektphase',
      'NaechsterMeilenstein',
    ];
    // Cache of validated fields (in-memory for runtime)
    // @ts-expect-error attach dynamic cache property
    if (!this._validProjectFields) this._validProjectFields = null as string[] | null;

    const buildSelect = (fields: string[]) => {
      const unique = Array.from(new Set(['Id', ...fields]));
      return unique.join(',');
    };
    // Determine the available category field name (supports variants like Bereich/Bereiche)
    const resolvedProjects = await this.resolveListTitle(SP_LISTS.PROJECTS, ['Roadmap Projects']);
    const listFieldNames = await this.getListFieldNames(resolvedProjects);
    const listFieldTypes = await this.getListFieldTypes(resolvedProjects);
    const categoryFieldCandidates = ['Category', 'Bereich', 'Bereiche'];
    const categoryFieldName = categoryFieldCandidates.find((f) => listFieldNames.has(f)) || null;
    const categoryIsLookup = categoryFieldName
      ? /^lookup/i.test(String(listFieldTypes[categoryFieldName] || ''))
      : false;
    const categorySelectFields = Array.from(
      new Set(['Id', ...(categoryFieldName ? [categoryFieldName] : [])])
    );
    const pickCategoryValue = (source: any): any => {
      if (!source || typeof source !== 'object') return undefined;
      for (const key of categoryFieldCandidates) {
        const value = source[key];
        if (value !== undefined && value !== null) return value;
      }
      if (source.category !== undefined && source.category !== null) return source.category;
      return undefined;
    };
    const normalizeCategoryValue = (value: any): string => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^\d+(?:\.\d+)?$/.test(trimmed)) return String(parseInt(trimmed, 10));
        return trimmed;
      }
      if (Array.isArray(value)) {
        for (const entry of value) {
          const normalized = normalizeCategoryValue(entry);
          if (normalized) return normalized;
        }
        return '';
      }
      if (typeof value === 'object') {
        const obj: any = value;
        if (Array.isArray(obj.results)) {
          for (const nested of obj.results) {
            const normalized = normalizeCategoryValue(nested);
            if (normalized) return normalized;
          }
        }
        const possibleKeys = [
          'Id',
          'ID',
          'Value',
          'LookupId',
          'lookupId',
          'LookupValue',
          'lookupValue',
          'Title',
          'Name',
        ];
        for (const key of possibleKeys) {
          if (obj[key] !== undefined && obj[key] !== null) {
            const normalized = normalizeCategoryValue(obj[key]);
            if (normalized) return normalized;
          }
        }
      }
      return '';
    };
    const getNormalizedCategoryFromEntity = (entity: any): string => {
      const primary = normalizeCategoryValue(pickCategoryValue(entity));
      if (primary) return primary;
      return normalizeCategoryValue(entity?.category);
    };
    const webUrl = this.getWebUrl();
    const baseItemsUrl = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items`;

    const fetchItems = async (
      selectFields: string[]
    ): Promise<any[] | { error: string; body?: string; status?: number }> => {
      const sel = buildSelect(selectFields);
      const params = new URLSearchParams();
      params.set('$select', sel);
      if (categoryFieldName && categoryIsLookup) params.set('$expand', categoryFieldName);
      params.set('$orderby', 'Id desc');
      params.set('$top', '5000');
      const endpoint = `${baseItemsUrl}?${params.toString()}`;
      let resp = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      let bodyText: string | null = null;
      if (!resp.ok) {
        bodyText = await resp.text();
        const invalid = /InvalidClientQuery|Invalid argument/i.test(bodyText);
        if (invalid) {
          // Retry verbose
          resp = await this.spFetch(endpoint, {
            headers: { Accept: 'application/json;odata=verbose' },
          });
          if (!resp.ok) {
            const second = await resp.text();
            return { error: 'http', body: second, status: resp.status };
          }
          try {
            const dataVerbose = await resp.json();
            return dataVerbose?.d?.results || [];
          } catch (e: any) {
            return { error: 'parse', body: e?.message };
          }
        } else {
          return { error: 'http', body: bodyText, status: resp.status };
        }
      }
      try {
        const json = await resp.json();
        if (Array.isArray(json?.value)) return json.value;
        if (Array.isArray(json?.d?.results)) return json.d.results;
        return [];
      } catch (e: any) {
        return { error: 'parse', body: e?.message };
      }
    };

    // Attempt full fetch first (use cached successful set if we already probed)
    let fieldsToUse = (this as any)._validProjectFields || candidateFields.slice();
    let initialResult = await fetchItems(fieldsToUse);

    // Detect InvalidClientQueryException / invalid argument / unknown field errors
    const isInvalidArg = (r: any) => {
      if (!(r && typeof r === 'object' && 'error' in r && r.error === 'http')) return false;
      const body = String((r as any).body || '');
      const status = Number((r as any).status || 0);
      // SharePoint often returns messages like:
      // "The property 'StartQuarter' does not exist on type..." or "The field or property..."
      // Older farms may also emit "PropertyNotFoundException"
      const fieldErr =
        /InvalidClientQuery|Invalid argument|does not exist|PropertyNotFound|The field or property|Could not find a property named/i.test(
          body
        );
      return fieldErr || status === 400; // treat generic 400 on first attempt as a bad $select
    };

    if (isInvalidArg(initialResult)) {
      console.warn(
        '[clientDataService] Full select failed, probing individual fields to isolate invalid ones'
      );
      const valid: string[] = [];
      for (const f of candidateFields) {
        const testRes = await fetchItems(['Id', f]); // builder adds Id again but harmless
        if (Array.isArray(testRes)) {
          valid.push(f);
        } else if (isInvalidArg(testRes)) {
          console.warn(`[clientDataService] Field excluded due to invalid query: ${f}`);
        } else {
          console.warn(`[clientDataService] Field ${f} excluded due to unexpected error`, testRes);
        }
      }
      // Always ensure required base fields present
      if (!valid.includes('Title')) valid.unshift('Title');
      (this as any)._validProjectFields = valid;
      fieldsToUse = valid;
      initialResult = await fetchItems(fieldsToUse);
    }

    if (!Array.isArray(initialResult)) {
      console.error('Error fetching projects (after fallback if any):', initialResult);
      // Final defensive fallback using generic helper (handles Atom/XML etc.)
      try {
        const minimal = await this.fetchFromSharePoint(
          resolvedProjects,
          'Id,Title,Category,StartQuarter,EndQuarter,Description,Status,Projektleitung,Bisher,Zukunft,Fortschritt,GeplantUmsetzung,Budget,StartDate,EndDate,ProjectFields,Projektphase,NaechsterMeilenstein'
        );
        initialResult = Array.isArray(minimal) ? minimal : [];
      } catch (e) {
        console.warn('[clientDataService] minimal project fetch also failed', e);
        return [];
      }
    }

    let items = initialResult;

    // Phase 1 minimal category fetch (avoid problematic fields like CategoryId that trigger SP exceptions on this farm)
    const earlyCategoryMap: Record<string, string> = {};
    try {
      const catMinimal = await this.fetchFromSharePoint(
        resolvedProjects,
        categorySelectFields.join(',')
      );
      if (Array.isArray(catMinimal)) {
        for (const r of catMinimal) {
          const pid = (r.Id ?? r.ID ?? '').toString();
          if (!pid) continue;
          const normalized = normalizeCategoryValue(pickCategoryValue(r));
          if (normalized) {
            earlyCategoryMap[pid] = normalized;
          }
        }
      }
    } catch (ecErr) {
      console.warn('[clientDataService] early minimal category fetch failed', ecErr);
    }
    // If we got an empty array (possible Atom-minimal normalization), try generic helper as a second chance
    if (Array.isArray(items) && items.length === 0) {
      try {
        const alt = await this.fetchFromSharePoint(
          resolvedProjects,
          'Id,Title,Category,StartQuarter,EndQuarter,Description,Status,Projektleitung,Bisher,Zukunft,Fortschritt,GeplantUmsetzung,Budget,StartDate,EndDate,ProjectFields,Projektphase,NaechsterMeilenstein'
        );
        if (Array.isArray(alt) && alt.length > 0) items = alt;
      } catch {
        /* ignore */
      }
    }

    // Final ultra-minimal fallback: Id,Title only
    if (Array.isArray(items) && items.length === 0) {
      try {
        const minimal = await this.fetchFromSharePoint(resolvedProjects, 'Id,Title');
        if (Array.isArray(minimal) && minimal.length > 0) {
          items = minimal.map((m: any) => ({
            Id: m.Id,
            Title: m.Title,
            Category: '',
            StartQuarter: 'Q1',
            EndQuarter: 'Q1',
            Description: '',
            Status: 'planned',
            Projektleitung: '',
            Bisher: '',
            Zukunft: '',
            Fortschritt: 0,
            GeplantUmsetzung: '',
            Budget: '',
            StartDate: '',
            EndDate: '',
            ProjectFields: [],
          }));
        }
      } catch {
        /* ignore */
      }
    }

    // Category recovery fetch: if after all fallbacks every item still lacks ANY category signal, do one extremely tolerant fetch
    // Pre-patch items with early category map before deciding on recovery
    if (Array.isArray(items) && Object.keys(earlyCategoryMap).length) {
      for (const it of items) {
        const pid = (it.Id ?? it.ID ?? '').toString();
        const existing = getNormalizedCategoryFromEntity(it);
        if (pid && !existing) {
          if (earlyCategoryMap[pid]) it.Category = earlyCategoryMap[pid];
        }
      }
    }
    const needsCategoryRecovery =
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((it) => {
        const v = it.Category ?? it.Bereich ?? it.Bereiche;
        return v === undefined || v === null || String(v).trim() === '';
      });
    if (needsCategoryRecovery) {
      try {
        const catOnly = await this.fetchFromSharePoint(
          resolvedProjects,
          categorySelectFields.join(',')
        );
        if (Array.isArray(catOnly) && catOnly.length > 0) {
          const catMap: Record<string, string> = {};
          for (const c of catOnly) {
            const idStr = (c.Id ?? c.ID ?? '').toString();
            const normalized = normalizeCategoryValue(pickCategoryValue(c));
            if (normalized) {
              catMap[idStr] = normalized;
            }
          }
          if (Object.keys(catMap).length) {
            for (const it of items) {
              const idStr = (it.Id ?? it.ID ?? '').toString();
              if (idStr && (!it.Category || String(it.Category).trim() === '')) {
                if (catMap[idStr]) it.Category = catMap[idStr];
              }
            }
            if ((process as any)?.env?.NEXT_PUBLIC_DEBUG_EXPOSE === '1') {
              console.warn('[clientDataService] Applied category recovery fetch', {
                count: Object.keys(catMap).length,
              });
            }
          }
        }
      } catch (recErr) {
        console.warn('[clientDataService] Category recovery fetch failed', recErr);
      }
    }
    // Dynamic detection of alternative category field if current selection produced only empty categories
    const shouldProbeAltCategory =
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((it) => {
        return !getNormalizedCategoryFromEntity(it);
      });
    if (shouldProbeAltCategory) {
      try {
        // Fetch list fields (InternalName + Title) to discover any custom category field naming (e.g., 'Kategorie')
        const webUrl2 = this.getWebUrl();
        const fieldsEndpoint = `${webUrl2}/_api/web/lists/getByTitle('${resolvedProjects}')/fields?$select=InternalName,Title`;
        let fResp = await this.spFetch(fieldsEndpoint, {
          headers: { Accept: 'application/json;odata=nometadata' },
        });
        if (!fResp.ok) {
          // retry verbose
          fResp = await this.spFetch(fieldsEndpoint, {
            headers: { Accept: 'application/json;odata=verbose' },
          });
        }
        if (fResp.ok) {
          const fJson = await fResp.json();
          const fieldArray: any[] = Array.isArray(fJson?.value)
            ? fJson.value
            : fJson?.d?.results || [];
          // Find candidate internal names containing category/kategorie/bereich not already selected
          const candidates: string[] = [];
          for (const f of fieldArray) {
            const internal = f.InternalName || f.internalName || '';
            const title = f.Title || f.title || '';
            if (
              /kategor|categor|bereich/i.test(internal) ||
              /kategor|categor|bereich/i.test(title)
            ) {
              if (!['Category'].includes(internal)) candidates.push(internal);
            }
          }
          if (candidates.length > 0) {
            const altCatField = candidates[0];
            if (!fieldsToUse.includes(altCatField)) {
              // Refetch including alternative category field
              const refetchFields = fieldsToUse.concat([altCatField]);
              const second = await fetchItems(refetchFields);
              if (Array.isArray(second) && second.length > 0) {
                items = second;
                (this as any)._validProjectFields = refetchFields; // cache for future
                // annotate items with Category if missing so downstream mapping picks it up
                for (const it of items) {
                  if (
                    (it.Category === undefined || it.Category === '' || it.Category === null) &&
                    it[altCatField] !== undefined
                  ) {
                    const normalizedAlt = normalizeCategoryValue(it[altCatField]);
                    if (normalizedAlt) it.Category = normalizedAlt;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[clientDataService] Alternate category probe failed', e);
      }
    }

    const projects = items.map((item) => {
      if (
        (process as any)?.env?.NEXT_PUBLIC_DEBUG_EXPOSE === '1' &&
        typeof window !== 'undefined'
      ) {
        try {
          console.debug('[getAllProjects] raw item keys:', Object.keys(item));
        } catch {}
      }
      let projectFields: string[] = [];
      const raw = item.ProjectFields;
      if (raw) {
        if (Array.isArray(raw)) projectFields = raw;
        else if (typeof raw === 'string') {
          if (raw.includes('\n'))
            projectFields = raw
              .split('\n')
              .map((s: string) => s.trim())
              .filter(Boolean);
          else if (raw.includes(';') || raw.includes(','))
            projectFields = raw
              .split(/[;,]/)
              .map((s: string) => s.trim())
              .filter(Boolean);
          else projectFields = [raw.trim()];
        }
      }
      const normalizedCategory = getNormalizedCategoryFromEntity(item);
      if (normalizedCategory) item.Category = normalizedCategory;

      const project: Project = {
        id: item.Id?.toString?.() || String(item.Id),
        title: item.Title,
        category: normalizedCategory,
        startQuarter:
          item.StartQuarter !== undefined && item.StartQuarter !== null
            ? String(item.StartQuarter).replace(/(Q[1-4])\s+20\d{2}/, '$1')
            : '',
        endQuarter:
          item.EndQuarter !== undefined && item.EndQuarter !== null
            ? String(item.EndQuarter).replace(/(Q[1-4])\s+20\d{2}/, '$1')
            : '',
        description: item.Description || '',
        status: String(item.Status || 'planned').toLowerCase() as any,
        ProjectFields: projectFields,
        projektleitung: item.Projektleitung || '',
        bisher: item.Bisher || '',
        zukunft: item.Zukunft || '',
        fortschritt: Number(item.Fortschritt || 0),
        geplante_umsetzung: item.GeplantUmsetzung || '',
        budget: item.Budget || '',
        startDate:
          item.StartDate !== undefined && item.StartDate !== null ? String(item.StartDate) : '',
        endDate: item.EndDate !== undefined && item.EndDate !== null ? String(item.EndDate) : '',
        projektphase: (item.Projektphase
          ? String(item.Projektphase).toLowerCase()
          : undefined) as any,
        naechster_meilenstein: item.NaechsterMeilenstein || undefined,
        links: [],
        teamMembers: [],
      };
      const derive = (q: string, end = false): string => {
        const year = new Date().getFullYear();
        switch (q) {
          case 'Q1':
            return end
              ? new Date(Date.UTC(year, 2, 31, 23, 59, 59)).toISOString()
              : new Date(Date.UTC(year, 0, 1)).toISOString();
          case 'Q2':
            return end
              ? new Date(Date.UTC(year, 5, 30, 23, 59, 59)).toISOString()
              : new Date(Date.UTC(year, 3, 1)).toISOString();
          case 'Q3':
            return end
              ? new Date(Date.UTC(year, 8, 30, 23, 59, 59)).toISOString()
              : new Date(Date.UTC(year, 6, 1)).toISOString();
          case 'Q4':
            return end
              ? new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString()
              : new Date(Date.UTC(year, 9, 1)).toISOString();
          default:
            return new Date(Date.UTC(year, 0, 1)).toISOString();
        }
      };
      if (!project.startDate) project.startDate = derive(project.startQuarter || 'Q1');
      if (!project.endDate)
        project.endDate = derive(project.endQuarter || project.startQuarter || 'Q1', true);
      return project;
    });
    try {
      const [allLinks, allTeam] = await Promise.all([
        this.fetchAllProjectLinks(),
        this.fetchAllTeamMembers(),
      ]);
      const linksByProject: Record<string, ProjectLink[]> = {};
      allLinks.forEach((l) => {
        const pid = l.projectId || '';
        (linksByProject[pid] ||= []).push(l);
      });
      const teamByProject: Record<string, TeamMember[]> = {};
      allTeam.forEach((t) => {
        const pid = t.projectId || '';
        (teamByProject[pid] ||= []).push(t);
      });
      for (const p of projects) {
        p.links = linksByProject[p.id] || [];
        p.teamMembers = (teamByProject[p.id] || []).filter(
          (tm) => tm.name && tm.name !== p.projektleitung
        );
      }
    } catch (aggErr) {
      console.warn('[clientDataService] Aggregation failed', aggErr);
    }
    if ((process as any)?.env?.NEXT_PUBLIC_DEBUG_EXPOSE === '1' && typeof window !== 'undefined') {
      console.debug(
        '[getAllProjects] mapped sample:',
        projects.slice(0, 5).map((p) => ({ id: p.id, cat: p.category }))
      );
    }

    // Forced final category hydration: if every project still has empty category, perform a minimal refetch (Id,Category)
    if (projects.length > 0 && projects.every((p) => !p.category)) {
      try {
        const catHydrate = await this.fetchFromSharePoint(
          resolvedProjects,
          categorySelectFields.join(',')
        );
        if (Array.isArray(catHydrate) && catHydrate.length) {
          const cMap: Record<string, string> = {};
          for (const row of catHydrate) {
            const pid = (row.Id ?? row.ID ?? '').toString();
            const normalized = normalizeCategoryValue(pickCategoryValue(row));
            if (normalized) {
              cMap[pid] = normalized;
            }
          }
          if (Object.keys(cMap).length) {
            for (const p of projects) {
              if (!p.category && cMap[p.id]) p.category = cMap[p.id];
            }
            if (
              (process as any)?.env?.NEXT_PUBLIC_DEBUG_EXPOSE === '1' &&
              typeof window !== 'undefined'
            ) {
              console.warn('[getAllProjects] forced category hydration applied', {
                hydrated: Object.keys(cMap).length,
              });
            }
          }
        }
      } catch (fhErr) {
        console.warn('[clientDataService] forced category hydration failed', fhErr);
      }
    }
    return projects;
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const webUrl = this.getWebUrl();
      const selectFields = [
        'Id',
        'Title',
        'Category',
        'StartQuarter',
        'EndQuarter',
        'Description',
        'Status',
        'Projektleitung',
        'Bisher',
        'Zukunft',
        'Fortschritt',
        'GeplantUmsetzung',
        'Budget',
        'StartDate',
        'EndDate',
        'ProjectFields',
        'Projektphase',
        'NaechsterMeilenstein',
      ].join(',');
      const resolvedProjects = await this.resolveListTitle(SP_LISTS.PROJECTS, ['Roadmap Projects']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${id})?$select=${selectFields}`;

      let response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json;odata=nometadata' },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        // Retry verbose then atom similar to bulk fetch
        const firstBody = await response.text();
        if (/InvalidClientQuery|Invalid argument/i.test(firstBody)) {
          response = await this.spFetch(endpoint, {
            method: 'GET',
            headers: { Accept: 'application/json;odata=verbose' },
            credentials: 'same-origin',
          });
          if (!response.ok) {
            const second = await response.text();
            console.error('Project Fetch Error Response (verbose retry):', {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              body: second,
            });
            return null;
          }
          try {
            const verboseData = await response.json();
            const item = verboseData?.d || null;
            if (!item) return null;
            return await this.buildSingleProject(item, id);
          } catch (e) {
            console.error('Project verbose parse error', e);
            return null;
          }
        } else {
          console.error('Project Fetch Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: firstBody,
          });
          return null;
        }
      }
      let item = await response.json();
      // If proxy returned minimal Atom-normalized shape (d.results array with only Id/Title), refetch without $select in verbose
      if (item && item.d && Array.isArray(item.d.results)) {
        const endpoint2 = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${id})`;
        const resp2 = await this.spFetch(endpoint2, {
          method: 'GET',
          headers: { Accept: 'application/json;odata=verbose' },
          credentials: 'same-origin',
        });
        if (resp2.ok) {
          const verbose = await resp2.json();
          item = verbose?.d || item;
        }
      }
      const built = await this.buildSingleProject(item, id);
      if (!built) return null;
      // If critical text fields are empty, merge from the bulk list as a fallback
      const needsMerge =
        !built.title ||
        !built.description ||
        !built.bisher ||
        !built.zukunft ||
        !built.geplante_umsetzung ||
        !built.budget ||
        !built.category ||
        !built.startQuarter ||
        !built.endQuarter;
      if (needsMerge) {
        try {
          const all = await this.getAllProjects();
          const fromList = all.find((p) => p.id === id);
          if (fromList) {
            built.title = built.title || fromList.title;
            built.category = built.category || fromList.category;
            built.startQuarter = built.startQuarter || fromList.startQuarter;
            built.endQuarter = built.endQuarter || fromList.endQuarter;
            built.status = built.status || fromList.status;
            built.description = built.description || fromList.description;
            built.bisher = built.bisher || fromList.bisher;
            built.zukunft = built.zukunft || fromList.zukunft;
            built.geplante_umsetzung = built.geplante_umsetzung || fromList.geplante_umsetzung;
            built.budget = built.budget || fromList.budget;
            if (!built.ProjectFields?.length && fromList.ProjectFields?.length)
              built.ProjectFields = fromList.ProjectFields;
            if (!built.projektphase && fromList.projektphase)
              built.projektphase = fromList.projektphase;
            if (!built.naechster_meilenstein && fromList.naechster_meilenstein)
              built.naechster_meilenstein = fromList.naechster_meilenstein;
          }
        } catch {
          /* ignore */
        }
      }
      return built;
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      return null;
    }
  }

  // Helper to normalize a single project (shared by getProjectById fallbacks)
  private async buildSingleProject(item: any, id: string): Promise<Project | null> {
    if (!item) return null;
    let projectFields: string[] = [];
    const raw = item.ProjectFields;
    if (raw) {
      if (Array.isArray(raw)) projectFields = raw;
      else if (typeof raw === 'string') {
        if (raw.includes('\n'))
          projectFields = raw
            .split('\n')
            .map((s: string) => s.trim())
            .filter(Boolean);
        else if (raw.includes(';') || raw.includes(','))
          projectFields = raw
            .split(/[;,]/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        else projectFields = [raw.trim()];
      }
    }

    const teamMembers = await this.getTeamMembersForProject(id);
    const links = await this.getProjectLinks(id);
    const project: Project = {
      id: item.Id?.toString?.() || id,
      title: item.Title,
      category: item.Category,
      startQuarter: item.StartQuarter,
      endQuarter: item.EndQuarter,
      description: item.Description || '',
      status: (item.Status?.toLowerCase?.() || 'planned') as any,
      ProjectFields: projectFields,
      projektleitung: item.Projektleitung || '',
      projektleitungImageUrl: null,
      teamMembers: teamMembers,
      bisher: item.Bisher || '',
      zukunft: item.Zukunft || '',
      fortschritt: item.Fortschritt || 0,
      geplante_umsetzung: item.GeplantUmsetzung || '',
      budget: item.Budget || '',
      startDate: item.StartDate || '',
      endDate: item.EndDate || '',
      projektphase: (item.Projektphase?.toLowerCase?.() || undefined) as any,
      naechster_meilenstein: item.NaechsterMeilenstein || undefined,
      links,
    };
    // derive dates from quarters if missing
    const derive = (q: string, end = false): string => {
      const year = new Date().getFullYear();
      switch (q) {
        case 'Q1':
          return end
            ? new Date(Date.UTC(year, 2, 31, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(year, 0, 1)).toISOString();
        case 'Q2':
          return end
            ? new Date(Date.UTC(year, 5, 30, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(year, 3, 1)).toISOString();
        case 'Q3':
          return end
            ? new Date(Date.UTC(year, 8, 30, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(year, 6, 1)).toISOString();
        case 'Q4':
          return end
            ? new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString()
            : new Date(Date.UTC(year, 9, 1)).toISOString();
        default:
          return new Date(Date.UTC(year, 0, 1)).toISOString();
      }
    };
    if (!project.startDate) project.startDate = derive(project.startQuarter || 'Q1');
    if (!project.endDate)
      project.endDate = derive(project.endQuarter || project.startQuarter || 'Q1', true);

    // Attempt to resolve project lead image
    if (project.projektleitung) {
      const parts = project.projektleitung.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        const mail = `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}@jsd.bs.ch`;
        try {
          project.projektleitungImageUrl = await this.getUserProfilePictureUrl(mail);
        } catch {}
      }
    }
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.PROJECTS}')/items(${id})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Try to get the response text for better error messages
        const errorText = await response.text();
        console.error('Project Delete Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText,
        });
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }

      // Also delete related team members, fields, and links
      await this.deleteTeamMembersForProject(id);
      await this.deleteProjectLinks(id);
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    try {
      // Fetch existing project first to ensure we have all the data
      const existingProject = await this.getProjectById(id);

      if (!existingProject) {
        throw new Error(`Project with ID ${id} not found`);
      }

      // Get SharePoint environment details
      const webUrl = this.getWebUrl();
      const resolvedProjects = await this.resolveListTitle(SP_LISTS.PROJECTS, ['Roadmap Projects']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${id})`;
      const requestDigest = await this.getRequestDigest();
      const itemType = await this.getListMetadata(resolvedProjects);

      // Process ProjectFields value
      let projectFieldsValue = '';

      if (projectData.ProjectFields !== undefined) {
        if (Array.isArray(projectData.ProjectFields)) {
          projectFieldsValue = projectData.ProjectFields.join('; ');
        } else if (typeof projectData.ProjectFields === 'string') {
          projectFieldsValue = projectData.ProjectFields;
        } else if (projectData.ProjectFields) {
          projectFieldsValue = String(projectData.ProjectFields);
        }
      } else if (existingProject.ProjectFields) {
        // Use existing value if available
        if (Array.isArray(existingProject.ProjectFields)) {
          projectFieldsValue = existingProject.ProjectFields.join('; ');
        } else {
          projectFieldsValue = String(existingProject.ProjectFields);
        }
      }

      // Create a clean request body with all fields included
      const body: any = {
        __metadata: { type: itemType },
        Title: projectData.title || existingProject.title || '',
        Category: projectData.category || existingProject.category || '', // may be removed if lookup (CategoryId)
        StartQuarter: projectData.startQuarter || existingProject.startQuarter || '',
        EndQuarter: projectData.endQuarter || existingProject.endQuarter || '',
        Description: projectData.description || existingProject.description || '',
        Status: projectData.status || existingProject.status || 'planned',
        Projektleitung: projectData.projektleitung || existingProject.projektleitung || '',
        Bisher: projectData.bisher || existingProject.bisher || '',
        Zukunft: projectData.zukunft || existingProject.zukunft || '',
        Fortschritt:
          typeof projectData.fortschritt === 'number'
            ? projectData.fortschritt
            : existingProject.fortschritt || 0,
        GeplantUmsetzung:
          projectData.geplante_umsetzung || existingProject.geplante_umsetzung || '',
        Budget: projectData.budget || existingProject.budget || '',
        StartDate: projectData.startDate || existingProject.startDate || '',
        EndDate: projectData.endDate || existingProject.endDate || '',
        ProjectFields: projectFieldsValue,
      };

      // Conditionally include optional new fields if list supports them
      try {
        const fields = await this.getListFieldNames(resolvedProjects);
        if (fields.has('Projektphase')) {
          const phaseRaw =
            (projectData as any).projektphase || (existingProject as any).projektphase || '';
          const phase = String(phaseRaw || '').toLowerCase();
          body['Projektphase'] = phase === 'einführung' ? 'einfuehrung' : phase;
        }
        if (fields.has('NaechsterMeilenstein')) {
          body['NaechsterMeilenstein'] =
            (projectData as any).naechster_meilenstein ||
            (existingProject as any).naechster_meilenstein ||
            '';
        }
        // Category handling: decide between CategoryId (lookup) vs Category (number/text)
        const catVal = projectData.category || existingProject.category || '';
        const num = parseInt(String(catVal).trim(), 10);
        if (!isNaN(num)) {
          console.log('[updateProject] Available fields:', Array.from(fields));
          let choseLookup = false;
          let catType: string | undefined;
          try {
            const types = await this.getListFieldTypes(resolvedProjects);
            catType = types['Category'];
            // Prefer lookup if Category is a lookup-type (Lookup/LookupMulti)
            if (catType && /lookup/i.test(catType) && fields.has('CategoryId')) {
              body['CategoryId'] = num;
              delete body['Category'];
              choseLookup = true;
            }
          } catch {}
          if (choseLookup) {
            console.log('[updateProject] Using CategoryId (lookup) for category value', num);
          } else {
            // Use Category for Number/Text-based columns and match type
            if (catType && /number/i.test(catType)) body['Category'] = num;
            else body['Category'] = String(num);
            delete body['CategoryId'];
            console.log(
              '[updateProject] Using Category (',
              catType || 'text',
              ') for category value',
              body['Category']
            );
          }
        }
      } catch {}

      console.log('Data being sent to SharePoint:', JSON.stringify(body));

      // Send the update request to SharePoint
      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'MERGE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Enhanced error logging
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error('SharePoint Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: errorText,
          });
        } catch {
          errorDetails = 'Could not read error details';
        }

        throw new Error(
          `Failed to update project: ${response.statusText}. Details: ${errorDetails}`
        );
      }

      // Create the updated project object to return
      const updatedProject: Project = {
        ...existingProject,
        ...projectData,
        id,
        projektphase: ((body as any).Projektphase ||
          (projectData as any).projektphase ||
          (existingProject as any).projektphase) as any,
        naechster_meilenstein:
          (body as any).NaechsterMeilenstein ||
          (projectData as any).naechster_meilenstein ||
          (existingProject as any).naechster_meilenstein,
      } as Project;

      // Read-back minimal fields to confirm persistence (esp. Category)
      try {
        const verifyEndpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${id})?$select=Id,Category`;
        const v = await this.spFetch(verifyEndpoint, {
          headers: { Accept: 'application/json;odata=nometadata' },
          credentials: 'same-origin',
        });
        if (!v.ok) {
          const txt = await v.text().catch(() => '');
          console.warn('[updateProject] read-back failed', { status: v.status, body: txt });
        } else {
          const j = await v.json();
          let cat: any = j?.Category;
          if (cat && typeof cat === 'object') cat = cat.Id ?? cat.ID ?? '';
          if (cat !== undefined && cat !== null) updatedProject.category = String(cat).trim();
          console.log('[updateProject] read-back Category =', updatedProject.category);
        }
      } catch (vbErr) {
        console.warn('[updateProject] read-back threw', vbErr);
      }

      // Return the updated project
      return updatedProject;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  async createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    try {
      // Erstellen Sie ein neues Projekt-Objekt mit einer temporären ID
      // Die tatsächliche ID wird von SharePoint beim Speichern generiert
      const newProject: Project = {
        ...projectData,
        id: 'new', // Diese ID wird von saveProject ersetzt
        links: projectData.links || [],
      };

      // Die saveProject-Methode verwenden, um das neue Projekt zu speichern
      return await this.saveProject(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // CATEGORY OPERATIONS
  async createCategory(categoryData: Omit<Category, 'id'>): Promise<Category> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedCategories = await this.resolveListTitle(SP_LISTS.CATEGORIES, [
        'Roadmap Categories',
      ]);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedCategories}')/items`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(resolvedCategories);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: categoryData.name,
          Color: categoryData.color,
          Icon: categoryData.icon,
          ParentCategoryId: categoryData.parentId,
          IsSubcategory: categoryData.isSubcategory,
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to create category: ${response.statusText}`);
      }

      const newItem = await response.json();
      const d = newItem?.d || newItem;
      const newId = d?.Id ?? d?.ID ?? d?.id;
      return {
        id: String(newId),
        name: categoryData.name,
        color: categoryData.color,
        icon: categoryData.icon,
        parentId: categoryData.parentId,
        isSubcategory: categoryData.isSubcategory,
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedCategories = await this.resolveListTitle(SP_LISTS.CATEGORIES, [
        'Roadmap Categories',
      ]);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedCategories}')/items(${id})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(resolvedCategories);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'MERGE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: categoryData.name,
          Color: categoryData.color,
          Icon: categoryData.icon,
          ParentCategoryId: categoryData.parentId,
          IsSubcategory: categoryData.isSubcategory,
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to update category: ${response.statusText}`);
      }

      // Return the updated category
      return {
        id,
        name: categoryData.name || '',
        color: categoryData.color || '',
        icon: categoryData.icon || '',
        parentId: categoryData.parentId,
        isSubcategory: categoryData.isSubcategory,
      };
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      const resolvedCategories = await this.resolveListTitle(SP_LISTS.CATEGORIES, [
        'Roadmap Categories',
      ]);
      const items = await this.fetchFromSharePoint(
        resolvedCategories,
        'Id,Title,Color,Icon,ParentCategoryId,IsSubcategory'
      );
      if (!Array.isArray(items) || items.length === 0) {
        console.warn(
          '[clientDataService] getAllCategories returned no items for list resolved as',
          resolvedCategories
        );
      }

      return items.map((item) => {
        const parentRaw =
          item.ParentCategoryId ?? item.ParentCategoryID ?? item.ParentId ?? item.ParentCategory;
        let parentId: string | undefined;
        if (parentRaw !== undefined && parentRaw !== null) {
          if (typeof parentRaw === 'object') {
            const obj: any = parentRaw;
            if (obj.Id !== undefined && obj.Id !== null) parentId = String(obj.Id);
            else if (obj.ID !== undefined && obj.ID !== null) parentId = String(obj.ID);
          } else {
            parentId = String(parentRaw);
          }
          if (parentId) {
            parentId = parentId.trim();
            if (/^\d+(?:\.\d+)?$/.test(parentId)) parentId = String(parseInt(parentId, 10));
            if (!parentId) parentId = undefined;
          }
        }

        return {
          id: item.Id.toString(),
          name: item.Title,
          color: item.Color,
          icon: item.Icon || '',
          parentId,
          isSubcategory: item.IsSubcategory === true,
        };
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.CATEGORIES}')/items(${id})?$select=Id,Title,Color,Icon,ParentCategoryId,IsSubcategory`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch category: ${response.statusText}`);
      }

      const item = await response.json();

      return {
        id: item.Id.toString(),
        name: item.Title,
        color: item.Color,
        icon: item.Icon || '',
        parentId: item.ParentCategoryId ? item.ParentCategoryId.toString() : undefined,
        isSubcategory: item.IsSubcategory === true,
      };
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      return null;
    }
  }

  // PROJECT LINKS OPERATIONS
  async getProjectLinks(projectId: string): Promise<ProjectLink[]> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedLinks = await this.resolveListTitle(SP_LISTS.PROJECT_LINKS, [
        'Roadmap Project Links',
      ]);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedLinks}')/items?$filter=ProjectId eq '${projectId}'&$select=Id,Title,Url,ProjectId`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project links: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.value || [];

      return items.map((item: any) => ({
        id: item.Id.toString(),
        title: item.Title,
        url: item.Url,
        projectId: item.ProjectId,
      }));
    } catch (error) {
      console.error(`Error fetching links for project ${projectId}:`, error);
      return [];
    }
  }

  // Bulk helpers
  private async fetchAllProjectLinks(): Promise<ProjectLink[]> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedLinks = await this.resolveListTitle(SP_LISTS.PROJECT_LINKS, [
        'Roadmap Project Links',
      ]);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedLinks}')/items?$select=Id,Title,Url,ProjectId`;
      const response = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      const items = data.value || [];
      return items.map((i: any) => ({
        id: i.Id.toString(),
        title: i.Title,
        url: i.Url,
        projectId: i.ProjectId,
      }));
    } catch {
      return [];
    }
  }
  private async fetchAllTeamMembers(): Promise<TeamMember[]> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedMembers = await this.resolveListTitle(SP_LISTS.TEAM_MEMBERS, [
        'Roadmap Team Members',
      ]);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedMembers}')/items?$select=Id,Title,Role,ProjectId`;
      const response = await this.spFetch(endpoint, {
        headers: { Accept: 'application/json;odata=nometadata' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      const items = data.value || [];
      return items.map((i: any) => ({
        id: i.Id.toString(),
        name: i.Title,
        role: i.Role,
        projectId: i.ProjectId,
      }));
    } catch {
      return [];
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.CATEGORIES}')/items(${categoryId})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete category: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting category ${categoryId}:`, error);
      throw error;
    }
  }

  async createProjectLink(link: Omit<ProjectLink, 'id'>): Promise<ProjectLink> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.PROJECT_LINKS}')/items`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(SP_LISTS.PROJECT_LINKS);

      // SharePoint might expect ProjectId as a complex object if it's a lookup field
      // We need to examine the actual structure required

      // First, try to determine if ProjectId is a lookup field
      const isLookupField = true; // We're assuming it's a lookup field based on the error

      let requestBody;
      if (isLookupField) {
        // For lookup fields, we need to structure differently
        requestBody = {
          __metadata: { type: itemType },
          Title: link.title,
          Url: link.url,
          // If ProjectId is a lookup field, SharePoint expects it in a different format
          ProjectId: link.projectId, // Use ProjectId
        };
      } else {
        // Original approach for non-lookup fields
        requestBody = {
          __metadata: { type: itemType },
          Title: link.title,
          Url: link.url,
          ProjectId: link.projectId,
        };
      }

      console.log('Creating project link with data:', JSON.stringify(requestBody));

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify(requestBody),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Enhanced error logging
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText;
          console.error('SharePoint Error Response for createProjectLink:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: errorText,
            requestBody: requestBody,
          });
        } catch {
          errorDetails = 'Could not read error details';
        }

        throw new Error(
          `Failed to create project link: ${response.statusText}. Details: ${errorDetails}`
        );
      }

      const newItem = await response.json();
      const d = newItem?.d || newItem;
      return {
        id: (d?.Id ?? d?.ID ?? '').toString(),
        title: d?.Title || link.title,
        url: d?.Url || link.url,
        projectId: d?.ProjectId || link.projectId,
      };
    } catch (error) {
      console.error('Error creating project link:', error);
      throw error;
    }
  }

  async updateProjectLink(link: ProjectLink): Promise<ProjectLink> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.PROJECT_LINKS}')/items(${link.id})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(SP_LISTS.PROJECT_LINKS);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'MERGE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: link.title,
          Url: link.url,
          ProjectId: link.projectId,
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to update project link: ${response.statusText}`);
      }

      return link;
    } catch (error) {
      console.error(`Error updating project link ${link.id}:`, error);
      throw error;
    }
  }

  async deleteProjectLink(linkId: string): Promise<void> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.PROJECT_LINKS}')/items(${linkId})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project link: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting project link ${linkId}:`, error);
      throw error;
    }
  }

  async deleteProjectLinks(projectId: string): Promise<void> {
    try {
      // Get all links for the project
      const links = await this.getProjectLinks(projectId);

      // Delete links in parallel to reduce latency
      await Promise.all(links.map((link) => this.deleteProjectLink(link.id)));
    } catch (error) {
      console.error(`Error deleting links for project ${projectId}:`, error);
      throw error;
    }
  }

  async saveProject(project: Project): Promise<Project> {
    const cleanFields = (fields: string | string[] | undefined): string => {
      if (!fields) return '';

      if (Array.isArray(fields)) {
        return fields
          .map((field) => String(field).trim())
          .filter(Boolean)
          .join('; ');
      }

      // If it's a string, clean it up
      const fieldStr = String(fields);

      // If it already contains semicolons or commas, assume it's already formatted
      if (fieldStr.includes(';') || fieldStr.includes(',')) {
        return fieldStr
          .split(/[;,]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .join('; ');
      }

      // Otherwise, treat it as a single field
      return fieldStr.trim();
    };

    try {
      const webUrl = this.getWebUrl();
      const isNewProject = !project.id || project.id === 'new';

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Resolve actual list title and get the correct metadata type
      const resolvedProjects = await this.resolveListTitle(SP_LISTS.PROJECTS, ['Roadmap Projects']);
      const itemType = await this.getListMetadata(resolvedProjects);

      // Clone project to avoid modifying the original
      const projectData = { ...project };

      // Store links separately
      const links = projectData.links || [];
      delete projectData.links;

      // Store team members separately
      const _teamMembers = projectData.teamMembers || [];
      delete projectData.teamMembers;

      // Prepare the endpoint and method
      const endpoint = isNewProject
        ? `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items`
        : `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${project.id})`;

      const method = isNewProject ? 'POST' : 'POST'; // POST for both, but with different headers for update

      // Prepare headers
      const headers: Record<string, string> = {
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
        'X-RequestDigest': requestDigest,
      };

      // Add additional headers for update
      if (!isNewProject) {
        headers['X-HTTP-Method'] = 'MERGE';
        headers['IF-MATCH'] = '*';
      }

      // Prepare the request body
      const body: any = {
        __metadata: { type: itemType },
        Title: projectData.title,
        Category: projectData.category, // will be replaced by CategoryId if lookup detected
        StartQuarter: projectData.startQuarter,
        EndQuarter: projectData.endQuarter,
        Description: projectData.description,
        Status: projectData.status,
        Projektleitung: projectData.projektleitung,
        Bisher: projectData.bisher,
        Zukunft: projectData.zukunft,
        Fortschritt: projectData.fortschritt,
        GeplantUmsetzung: projectData.geplante_umsetzung,
        Budget: projectData.budget,
        StartDate: projectData.startDate,
        EndDate: projectData.endDate,
        ProjectFields: cleanFields(projectData.ProjectFields),
      };

      try {
        const fields = await this.getListFieldNames(resolvedProjects);
        if (fields.has('Projektphase')) {
          const phaseRaw = (projectData as any).projektphase || '';
          const phase = String(phaseRaw || '').toLowerCase();
          body['Projektphase'] = phase === 'einführung' ? 'einfuehrung' : phase;
        }
        if (fields.has('NaechsterMeilenstein')) {
          body['NaechsterMeilenstein'] = (projectData as any).naechster_meilenstein || '';
        }
        const catVal = projectData.category || '';
        const num = parseInt(String(catVal).trim(), 10);
        if (!isNaN(num)) {
          console.log('[saveProject] Available fields:', Array.from(fields));
          let choseLookup = false;
          let catType: string | undefined;
          try {
            const types = await this.getListFieldTypes(resolvedProjects);
            catType = types['Category'];
            if (catType && /lookup/i.test(catType) && fields.has('CategoryId')) {
              body['CategoryId'] = num;
              delete body['Category'];
              choseLookup = true;
            }
          } catch {}
          if (choseLookup) {
            console.log('[saveProject] Using CategoryId (lookup) for category value', num);
          } else {
            if (catType && /number/i.test(catType)) body['Category'] = num;
            else body['Category'] = String(num);
            delete body['CategoryId'];
            console.log(
              '[saveProject] Using Category (',
              catType || 'text',
              ') for category value',
              body['Category']
            );
          }
        }
      } catch {}

      console.log('[saveProject] Body payload:', body);

      // Send the request
      const response = await this.spFetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Project Save Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText,
        });
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      // Get the saved project data
      let savedProject: Project;

      if (isNewProject) {
        const newItem = await response.json();
        const d = newItem?.d || newItem;
        const newId = d?.Id ?? d?.ID ?? d?.id;
        savedProject = {
          ...projectData,
          id: String(newId),
          links: [],
          teamMembers: [],
          projektphase: (body as any).Projektphase || (projectData as any).projektphase,
          naechster_meilenstein:
            (body as any).NaechsterMeilenstein || (projectData as any).naechster_meilenstein,
        };
      } else {
        savedProject = {
          ...projectData,
          id: project.id,
          links: [],
          teamMembers: [],
          projektphase: (body as any).Projektphase || (projectData as any).projektphase,
          naechster_meilenstein:
            (body as any).NaechsterMeilenstein || (projectData as any).naechster_meilenstein,
        };
      }

      // Handle links
      if (links && links.length > 0) {
        // Delete existing links
        await this.deleteProjectLinks(savedProject.id);
        // Create new links in parallel
        await Promise.all(
          links.map((link) =>
            this.createProjectLink({
              title: link.title,
              url: link.url,
              projectId: savedProject.id,
            })
          )
        );
        savedProject.links = links;
      }

      // Read-back minimal fields (Id,Category) to confirm persistence
      try {
        const verifyEndpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedProjects}')/items(${savedProject.id})?$select=Id,Category`;
        const v = await this.spFetch(verifyEndpoint, {
          headers: { Accept: 'application/json;odata=nometadata' },
          credentials: 'same-origin',
        });
        if (!v.ok) {
          const txt = await v.text().catch(() => '');
          console.warn('[saveProject] read-back failed', { status: v.status, body: txt });
        } else {
          const j = await v.json();
          let cat: any = j?.Category;
          if (cat && typeof cat === 'object') cat = cat.Id ?? cat.ID ?? '';
          if (cat !== undefined && cat !== null) savedProject.category = String(cat).trim();
          console.log('[saveProject] read-back Category =', savedProject.category);
        }
      } catch (vbErr) {
        console.warn('[saveProject] read-back threw', vbErr);
      }

      return savedProject;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  // TEAM MEMBERS OPERATIONS
  // Get user profile picture URL from SharePoint
  async getUserProfilePictureUrl(userNameOrEmail: string): Promise<string | null> {
    try {
      const webUrl = this.getWebUrl();

      // First, try to find the user account in SharePoint
      // Remove domain part if username contains it
      let accountName = userNameOrEmail;

      // If it's an email, try to format it for SharePoint
      if (userNameOrEmail.includes('@')) {
        // For SharePoint Online format (example: i:0#.f|membership|user@domain.com)
        accountName = `i:0#.f|membership|${userNameOrEmail}`;
      } else {
        // For on-premises SharePoint format (example: domain\\username)
        // You may need to adjust this based on your SharePoint configuration
        accountName = `i:0#.w|${userNameOrEmail}`;
      }

      // URL encode the account name
      const encodedAccount = encodeURIComponent(`'${accountName}'`);

      // Call the SharePoint API to get user profile
      const endpoint = `${webUrl}/_api/SP.UserProfiles.PeopleManager/GetPropertiesFor(accountName=@v)?@v=${encodedAccount}`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=verbose',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        console.warn(`Could not find user profile for ${userNameOrEmail}: ${response.statusText}`);
        return null;
      }

      const userData = await response.json();

      // Get the picture URL from user profile properties
      if (userData && userData.d && userData.d.PictureUrl) {
        return userData.d.PictureUrl;
      }

      // Alternative: Return the userphoto handler URL directly; avoid extra HEAD probe
      const pictureUrl = `${webUrl}/_layouts/15/userphoto.aspx?size=L&accountname=${encodeURIComponent(userNameOrEmail)}`;
      return pictureUrl;
    } catch (error) {
      console.warn(`Error getting profile picture for ${userNameOrEmail}:`, error);
      return null;
    }
  }

  async getTeamMembersForProject(projectId: string): Promise<TeamMember[]> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.TEAM_MEMBERS}')/items?$filter=ProjectId eq '${projectId}'&$select=Id,Title,Role,ProjectId`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch team members: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.value || [];

      // Create team members with basic info
      const teamMembers = items.map((item: any) => ({
        id: item.Id?.toString() || '',
        name: item.Title || '',
        role: item.Role || 'Teammitglied',
        projectId: item.ProjectId || projectId,
        // Store the username or email for profile lookup
        userIdentifier: item.Title || '',
        imageUrl: null,
      }));

      // Fetch profile pictures for each team member
      await Promise.all(
        teamMembers.map(async (member: TeamMember) => {
          if (member.userIdentifier) {
            // Check if the name contains a space (indicating first and last name)
            const mailParts = member.userIdentifier.split(' ');
            if (mailParts.length >= 2 && mailParts[0] && mailParts[1]) {
              const mail =
                mailParts[0].toLowerCase() + '.' + mailParts[1].toLowerCase() + '@jsd.bs.ch';
              if (mail) {
                // Try to get profile picture using their identifier
                member.imageUrl = await this.getUserProfilePictureUrl(mail);
              }
            }
          }
        })
      );

      return teamMembers;
    } catch (error) {
      console.error(`Error fetching team members for project ${projectId}:`, error);
      return [];
    }
  }

  async deleteTeamMembersForProject(projectId: string): Promise<void> {
    try {
      // Get all team members for the project
      const teamMembers = await this.getTeamMembersForProject(projectId);

      // Delete team members in parallel
      await Promise.all(teamMembers.filter((m) => m.id).map((m) => this.deleteTeamMember(m.id!)));
    } catch (error) {
      console.error(`Error deleting team members for project ${projectId}:`, error);
      throw error;
    }
  }

  async createTeamMember(teamMemberData: {
    name: string;
    role: string;
    projectId: string;
  }): Promise<TeamMember> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.TEAM_MEMBERS}')/items`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(SP_LISTS.TEAM_MEMBERS);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: teamMemberData.name,
          Role: teamMemberData.role,
          ProjectId: teamMemberData.projectId,
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to create team member: ${response.statusText}`);
      }

      const newItem = await response.json();
      const d2 = newItem?.d || newItem;
      return {
        id: String(d2?.Id ?? d2?.ID ?? d2?.id),
        name: teamMemberData.name,
        role: teamMemberData.role,
        projectId: teamMemberData.projectId,
      };
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  }

  async deleteTeamMember(memberId: string): Promise<void> {
    try {
      const webUrl = this.getWebUrl();
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${SP_LISTS.TEAM_MEMBERS}')/items(${memberId})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete team member: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting team member ${memberId}:`, error);
      throw error;
    }
  }

  // SETTINGS OPERATIONS
  async createSetting(settingData: {
    key: string;
    value: string;
    description?: string;
  }): Promise<AppSettings> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedSettings = await this.resolveListTitle(SP_LISTS.SETTINGS, ['Roadmap Settings']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedSettings}')/items`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(resolvedSettings);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: settingData.key,
          Value: settingData.value,
          Description: settingData.description || '',
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to create setting: ${response.statusText}`);
      }

      const newItem = await response.json();

      return {
        id: newItem.Id.toString(),
        key: settingData.key,
        value: settingData.value,
        description: settingData.description,
      };
    } catch (error) {
      console.error('Error creating setting:', error);
      throw error;
    }
  }

  async getAppSettings(): Promise<AppSettings[]> {
    try {
      const resolvedSettings = await this.resolveListTitle(SP_LISTS.SETTINGS, ['Roadmap Settings']);
      const items = await this.fetchFromSharePoint(resolvedSettings, 'Id,Title,Value,Description');

      // Map SharePoint items to AppSettings format
      return items.map((item) => ({
        id: item.Id.toString(),
        key: item.Title,
        value: item.Value || '',
        description: item.Description,
      }));
    } catch (error) {
      console.error('Error fetching app settings:', error);
      // Return default settings if fetch fails
      return [
        {
          id: '1',
          key: 'defaultSettings',
          value: JSON.stringify({
            theme: 'dark',
            defaultView: 'quarters',
            showCompletedProjects: true,
            enableNotifications: false,
            customColors: {},
          }),
          description: 'Default application settings',
        },
      ];
    }
  }

  async getSettingByKey(key: string): Promise<AppSettings | null> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedSettings = await this.resolveListTitle(SP_LISTS.SETTINGS, ['Roadmap Settings']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedSettings}')/items?$filter=Title eq '${key}'&$select=Id,Title,Value,Description`;

      const response = await this.spFetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json;odata=nometadata',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch setting: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.value || [];

      if (items.length === 0) {
        return null;
      }

      const item = items[0];
      return {
        id: item.Id.toString(),
        key: item.Title,
        value: item.Value || '',
        description: item.Description || '',
      };
    } catch (error) {
      console.error(`Error fetching setting with key ${key}:`, error);
      return null;
    }
  }

  async updateSetting(setting: AppSettings): Promise<AppSettings> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedSettings = await this.resolveListTitle(SP_LISTS.SETTINGS, ['Roadmap Settings']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedSettings}')/items(${setting.id})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      // Get the correct metadata type
      const itemType = await this.getListMetadata(resolvedSettings);

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=verbose',
          'X-HTTP-Method': 'MERGE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify({
          __metadata: { type: itemType },
          Title: setting.key,
          Value: setting.value,
          Description: setting.description || '',
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.statusText}`);
      }

      // Return the updated setting
      return setting;
    } catch (error) {
      console.error(`Error updating setting ${setting.id}:`, error);
      throw error;
    }
  }

  async deleteSetting(id: string): Promise<void> {
    try {
      const webUrl = this.getWebUrl();
      const resolvedSettings = await this.resolveListTitle(SP_LISTS.SETTINGS, ['Roadmap Settings']);
      const endpoint = `${webUrl}/_api/web/lists/getByTitle('${resolvedSettings}')/items(${id})`;

      // Get request digest for write operations
      const requestDigest = await this.getRequestDigest();

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=nometadata',
          'X-HTTP-Method': 'DELETE',
          'IF-MATCH': '*',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete setting: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting setting ${id}:`, error);
      throw error;
    }
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const webUrl = this.getWebUrl();

      // Check if user is a Site Collection Administrator
      const userEndpoint = `${webUrl}/_api/web/currentuser`;
      const userResponse = await this.spFetch(userEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json;odata=nometadata' },
        credentials: 'same-origin',
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to get current user: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      if (userData.IsSiteAdmin === true || userData?.d?.IsSiteAdmin === true) {
        return true;
      }

      // Fallback: Check membership in the site's Associated Owners group
      const ownerGroupResp = await this.spFetch(
        `${webUrl}/_api/web/AssociatedOwnerGroup?$select=Id,Title`,
        {
          headers: { Accept: 'application/json;odata=nometadata' },
          credentials: 'same-origin',
        }
      );

      if (!ownerGroupResp.ok) {
        // Heuristic fallback: check group titles for "owner", "besitzer", or "Roadmapadmin"
        const groupsHeuristic = await this.spFetch(
          `${webUrl}/_api/web/currentuser/Groups?$select=Id,Title`,
          {
            headers: { Accept: 'application/json;odata=nometadata' },
            credentials: 'same-origin',
          }
        );

        if (groupsHeuristic.ok) {
          const gj = await groupsHeuristic.json();
          const titles: string[] = (gj?.value || gj?.d?.results || [])
            .map((g: any) => String(g.Title || ''))
            .filter(Boolean);
          const matchOwner = titles.some((t) => /\b(owner|besitzer|roadmapadmin)\b/i.test(t));
          if (matchOwner) return true;
        }
        return false;
      }

      const ownerGroup = await ownerGroupResp.json();
      const ownerId: number | undefined = ownerGroup?.Id ?? ownerGroup?.d?.Id;
      const ownerTitle: string | undefined = ownerGroup?.Title ?? ownerGroup?.d?.Title;

      if (!ownerId && !ownerTitle) return false;

      // Fetch current user's groups and check membership against owners group
      const groupsResp = await this.spFetch(
        `${webUrl}/_api/web/currentuser/Groups?$select=Id,Title`,
        {
          headers: { Accept: 'application/json;odata=nometadata' },
          credentials: 'same-origin',
        }
      );

      if (!groupsResp.ok) return false;

      const groups = await groupsResp.json();
      const entries: any[] = (groups?.value || groups?.d?.results || []) as any[];

      return entries.some(
        (g) =>
          (ownerId && g.Id === ownerId) || (ownerTitle && String(g.Title) === String(ownerTitle))
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Add this method to the ClientDataService class

  async searchUsers(query: string): Promise<TeamMember[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const webUrl = this.getWebUrl();

      // Using SharePoint's People Picker API to search users across the entire environment
      const endpoint = `${webUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`;

      // Get request digest for this POST operation
      const requestDigest = await this.getRequestDigest();

      // Configure search parameters
      const searchRequest = {
        queryParams: {
          AllowEmailAddresses: true,
          AllowMultipleEntities: false,
          AllUrlZones: false,
          MaximumEntitySuggestions: 20,
          PrincipalSource: 15, // All sources (15)
          PrincipalType: 1, // User (1)
          QueryString: query,
        },
      };

      const response = await this.spFetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        body: JSON.stringify(searchRequest),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse the ClientPeoplePickerSearchUser response
      // It returns a string that needs to be parsed as JSON
      const clientPeoplePickerData = JSON.parse(data.d.ClientPeoplePickerSearchUser);

      // Map user data to TeamMember format
      return clientPeoplePickerData.map((item: any) => {
        // Extract display name - usually in format "Lastname, Firstname"
        let displayName = item.DisplayText || '';

        // If name is in "Lastname, Firstname" format, reformat to "Firstname Lastname"
        if (displayName.includes(',')) {
          const parts = displayName.split(',').map((part: string) => part.trim());
          displayName = `${parts[1]} ${parts[0]}`;
        }

        return {
          id: item.Key || item.EntityData?.SPUserID || `user-${Date.now()}`,
          name: displayName,
          role: 'Teammitglied', // Default role
          email: item.EntityData?.Email || '',
          userIdentifier: item.Key || '',
          imageUrl: null,
        };
      });
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // ATTACHMENTS
  async listAttachments(
    projectId: string
  ): Promise<Array<{ FileName: string; ServerRelativeUrl: string }>> {
    try {
      const r = await this.spFetch(`/api/attachments/${encodeURIComponent(projectId)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async uploadAttachment(
    projectId: string,
    file: File,
    opts?: { onProgress?: (pct: number) => void; signal?: AbortSignal }
  ): Promise<{ ok: boolean; error?: string; aborted?: boolean }> {
    const maxSize = 25 * 1024 * 1024; // 25MB default SP classic limit
    const allowed = [
      /\.pdf$/i,
      /\.docx?$/i,
      /\.xlsx?$/i,
      /\.pptx?$/i,
      /\.png$/i,
      /\.jpe?g$/i,
      /\.txt$/i,
      /\.csv$/i,
      /\.zip$/i,
    ];
    if (file.size > maxSize) return { ok: false, error: 'Datei ist zu groß (max. 25MB)' };
    if (!allowed.some((rx) => rx.test(file.name)))
      return { ok: false, error: 'Dateityp nicht erlaubt' };

    const url = `/api/attachments/${encodeURIComponent(projectId)}?name=${encodeURIComponent(file.name)}`;
    // Use XHR to get progress
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && opts?.onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            opts.onProgress(pct);
          }
        };
        // Abort handling
        let aborted = false;
        const onAbort = () => {
          aborted = true;
          try {
            xhr.abort();
          } catch {}
        };
        if (opts?.signal) {
          if (opts.signal.aborted) onAbort();
          else opts.signal.addEventListener('abort', onAbort);
        }
        xhr.onload = () => {
          if (opts?.signal) opts.signal.removeEventListener('abort', onAbort);
          if (aborted) return reject(new DOMException('Aborted', 'AbortError'));
          if (xhr.status >= 200 && xhr.status < 300) return resolve();
          reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => {
          if (opts?.signal) opts.signal.removeEventListener('abort', onAbort);
          if (aborted) return reject(new DOMException('Aborted', 'AbortError'));
          reject(new Error('Netzwerkfehler beim Upload'));
        };
        xhr.send(file);
      });
      return { ok: true };
    } catch (e: any) {
      if (e?.name === 'AbortError')
        return { ok: false, aborted: true, error: 'Upload abgebrochen' };
      return { ok: false, error: e?.message || 'Upload fehlgeschlagen' };
    }
  }

  async deleteAttachment(projectId: string, fileName: string): Promise<boolean> {
    const url = `/api/attachments/${encodeURIComponent(projectId)}?name=${encodeURIComponent(fileName)}`;
    try {
      const r = await this.spFetch(url, { method: 'DELETE' });
      return r.ok;
    } catch {
      return false;
    }
  }
}

// Create a singleton instance
export const clientDataService = new ClientDataService();
