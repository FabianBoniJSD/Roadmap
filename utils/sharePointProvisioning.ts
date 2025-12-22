import { clientDataService } from '@/utils/clientDataService';
import type {
  RoadmapInstanceConfig,
  RoadmapInstanceHealth,
  RoadmapInstanceHealthStatus,
} from '@/types/roadmapInstance';
import type { SharePointFieldDefinition, SharePointListDefinition } from '@/utils/sharePointLists';
import { SHAREPOINT_LIST_DEFINITIONS, encodeSharePointValue } from '@/utils/sharePointLists';

const verboseHeaders = (digest: string) => ({
  Accept: 'application/json;odata=verbose',
  'Content-Type': 'application/json;odata=verbose',
  'X-RequestDigest': digest,
});

const jsonHeaders = {
  Accept: 'application/json;odata=nometadata',
};

const getListCandidates = (def: SharePointListDefinition): string[] => {
  const candidates = [def.title, def.key, ...(def.aliases ?? [])].filter(Boolean);
  return Array.from(new Set(candidates.map((value) => value.trim()))).filter(Boolean);
};

const LIST_INFO_SELECT =
  '?$select=Title,Id,ItemCount,Created,LastItemModifiedDate,DefaultViewUrl,RootFolder/ServerRelativeUrl&$expand=RootFolder';

export type SharePointListOverviewEntry = {
  key: string;
  title: string;
  exists: boolean;
  resolvedTitle?: string;
  matchedAlias?: string;
  itemCount?: number;
  created?: string;
  modified?: string;
  defaultViewUrl?: string;
  serverRelativeUrl?: string;
  errors?: string[];
};

export type SharePointListEnsureResult = {
  key: string;
  title: string;
  resolvedTitle: string;
  lists: RoadmapInstanceHealth['lists'];
};

export type SharePointListDeleteResult = {
  key: string;
  title: string;
  resolvedTitle?: string;
  status: 'deleted' | 'missing';
  errors?: string[];
};

const readError = async (resp: Response): Promise<string> => {
  try {
    const text = await resp.text();
    return text.slice(0, 500);
  } catch (error) {
    return error instanceof Error ? error.message : 'Unbekannter Fehler';
  }
};

const ensureField = async (
  listTitle: string,
  field: SharePointFieldDefinition,
  digest: string,
  health: RoadmapInstanceHealth
) => {
  const encodedList = encodeSharePointValue(listTitle);
  const encodedField = encodeSharePointValue(field.name);
  const fieldCheck = await clientDataService.sharePointFetch(
    `/api/sharepoint/_api/web/lists/getByTitle('${encodedList}')/fields/getByInternalNameOrTitle('${encodedField}')?$select=InternalName`,
    { headers: jsonHeaders }
  );
  if (fieldCheck.ok) return;

  let allowCreation = fieldCheck.status === 404;
  let lastErrorMessage: string | null = null;

  if (!allowCreation) {
    const message = await readError(fieldCheck);
    lastErrorMessage = message;
    if (
      fieldCheck.status === 400 &&
      /InvalidClientQuery|Invalid argument|does not exist|PropertyNotFound|Could not find a property named/i.test(
        message
      )
    ) {
      allowCreation = true;
    } else {
      health.lists.errors[`${listTitle}.${field.name}`] = message;
    }
  }

  if (!allowCreation) {
    return;
  }

  const endpoint = `/api/sharepoint/_api/web/lists/getByTitle('${encodedList}')/fields/CreateFieldAsXml`;
  const bodyWithParameters = JSON.stringify({
    parameters: {
      __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
      SchemaXml: field.schemaXml,
      Options: 0,
    },
  });
  const fallbackBody = JSON.stringify({
    __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
    SchemaXml: field.schemaXml,
    Options: 0,
  });

  let createResp = await clientDataService.sharePointFetch(endpoint, {
    method: 'POST',
    headers: verboseHeaders(digest),
    body: bodyWithParameters,
  });

  if (!createResp.ok) {
    const primaryError = await readError(createResp);
    createResp = await clientDataService.sharePointFetch(endpoint, {
      method: 'POST',
      headers: verboseHeaders(digest),
      body: fallbackBody,
    });
    if (!createResp.ok) {
      const fallbackError = await readError(createResp);
      health.lists.errors[`${listTitle}.${field.name}`] =
        `${lastErrorMessage ? `${lastErrorMessage}\n` : ''}${primaryError}\n${fallbackError}`.trim();
      return;
    }
  }

  const listFields = health.lists.fieldsCreated[listTitle] || [];
  if (!listFields.includes(field.name)) {
    listFields.push(field.name);
    health.lists.fieldsCreated[listTitle] = listFields;
  }
};

const ensureList = async (
  def: SharePointListDefinition,
  digest: string,
  health: RoadmapInstanceHealth
): Promise<string | null> => {
  const candidates = getListCandidates(def);
  let resolved: string | null = null;

  for (const candidate of candidates) {
    const check = await clientDataService.sharePointFetch(
      `/api/sharepoint/_api/web/lists/getByTitle('${encodeSharePointValue(candidate)}')?$select=Id`,
      { headers: jsonHeaders }
    );
    if (check.ok) {
      resolved = candidate;
      if (!health.lists.ensured.includes(candidate)) {
        health.lists.ensured.push(candidate);
      }
      break;
    }
    if (check.status !== 404) {
      const message = await readError(check);
      health.lists.errors[candidate] = message;
    }
  }

  if (!resolved) {
    const createResp = await clientDataService.sharePointFetch(`/api/sharepoint/_api/web/lists`, {
      method: 'POST',
      headers: verboseHeaders(digest),
      body: JSON.stringify({
        __metadata: { type: 'SP.List' },
        AllowContentTypes: true,
        BaseTemplate: def.template,
        ContentTypesEnabled: true,
        Description: def.description || def.title,
        Title: def.title,
      }),
    });
    if (!createResp.ok) {
      const message = await readError(createResp);
      health.lists.errors[def.title] = message;
      return null;
    }
    health.lists.created.push(def.title);
    resolved = def.title;
  }

  for (const field of def.fields) {
    await ensureField(resolved, field, digest, health);
  }

  return resolved;
};

const deleteListByTitle = async (title: string, digest: string) => {
  await clientDataService.sharePointFetch(
    `/api/sharepoint/_api/web/lists/getByTitle('${encodeSharePointValue(title)}')`,
    {
      method: 'POST',
      headers: {
        ...verboseHeaders(digest),
        'X-HTTP-Method': 'DELETE',
        'IF-MATCH': '*',
      },
    }
  );
};

const probePermissions = async (
  digest: string
): Promise<{
  status: RoadmapInstanceHealthStatus;
  message?: string;
  probeList?: string;
}> => {
  const probeList = `RoadmapHealthProbe_${Date.now().toString(36)}`;
  const payload = {
    __metadata: { type: 'SP.List' },
    AllowContentTypes: false,
    BaseTemplate: 100,
    ContentTypesEnabled: false,
    Description: 'Roadmap health permission probe',
    Title: probeList,
  };

  let status: RoadmapInstanceHealthStatus = 'unknown';
  let message: string | undefined;
  let created = false;

  try {
    const createResp = await clientDataService.sharePointFetch(`/api/sharepoint/_api/web/lists`, {
      method: 'POST',
      headers: verboseHeaders(digest),
      body: JSON.stringify(payload),
    });
    if (!createResp.ok) {
      message = await readError(createResp);
      status = createResp.status === 403 ? 'insufficient' : 'error';
      return { status, message, probeList };
    }
    created = true;
    status = 'ok';
    return { status, probeList };
  } catch (error) {
    status = 'error';
    message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return { status, message, probeList };
  } finally {
    if (created) {
      try {
        await deleteListByTitle(probeList, digest);
      } catch (cleanupError) {
        // eslint-disable-next-line no-console
        console.warn('[sharePointProvisioning] Failed to delete probe list', cleanupError);
      }
    }
  }
};

export async function getSharePointListOverview(
  instance: RoadmapInstanceConfig
): Promise<SharePointListOverviewEntry[]> {
  const overview: SharePointListOverviewEntry[] = [];
  await clientDataService.withInstance(instance.slug, async () => {
    for (const def of SHAREPOINT_LIST_DEFINITIONS) {
      const entry: SharePointListOverviewEntry = {
        key: def.key,
        title: def.title,
        exists: false,
      };
      const errors: string[] = [];
      const candidates = getListCandidates(def);
      for (const candidate of candidates) {
        const resp = await clientDataService.sharePointFetch(
          `/api/sharepoint/_api/web/lists/getByTitle('${encodeSharePointValue(candidate)}')${LIST_INFO_SELECT}`,
          { headers: jsonHeaders }
        );
        if (resp.ok) {
          const data = await resp.json();
          entry.exists = true;
          entry.resolvedTitle = typeof data.Title === 'string' ? data.Title : candidate;
          entry.matchedAlias = candidate;
          if (typeof data.ItemCount === 'number') entry.itemCount = data.ItemCount;
          if (typeof data.Created === 'string') entry.created = data.Created;
          if (typeof data.LastItemModifiedDate === 'string') {
            entry.modified = data.LastItemModifiedDate;
          }
          if (typeof data.DefaultViewUrl === 'string') entry.defaultViewUrl = data.DefaultViewUrl;
          if (typeof data?.RootFolder?.ServerRelativeUrl === 'string') {
            entry.serverRelativeUrl = data.RootFolder.ServerRelativeUrl;
          }
          break;
        }
        if (resp.status !== 404) {
          const message = await readError(resp);
          errors.push(`${candidate}: ${message}`);
        }
      }
      if (!entry.exists && errors.length > 0) {
        entry.errors = errors;
      }
      overview.push(entry);
    }
  });
  return overview;
}

export async function ensureSharePointListForInstance(
  instance: RoadmapInstanceConfig,
  key: string
): Promise<SharePointListEnsureResult> {
  const def = SHAREPOINT_LIST_DEFINITIONS.find((candidate) => candidate.key === key);
  if (!def) {
    throw new Error(`Unbekannter Listen-Schlüssel "${key}"`);
  }

  const health: RoadmapInstanceHealth = {
    checkedAt: new Date().toISOString(),
    permissions: { status: 'unknown' },
    lists: { ensured: [], created: [], missing: [], fieldsCreated: {}, errors: {} },
  };
  let resolvedTitle: string | null = null;

  const candidateKeys = getListCandidates(def);

  await clientDataService.withInstance(instance.slug, async () => {
    let digest: string;
    try {
      digest = await clientDataService.requestDigest();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      health.lists.errors.__digest = message;
      throw new Error(`Digest Fehler: ${message}`);
    }

    resolvedTitle = await ensureList(def, digest, health);
    if (!resolvedTitle) {
      const relevantErrors = Object.entries(health.lists.errors)
        .filter(([errorKey]) => candidateKeys.some((candidate) => errorKey.startsWith(candidate)))
        .map(([, errorMessage]) => errorMessage);
      if (health.lists.errors.__digest) {
        relevantErrors.push(`Digest: ${health.lists.errors.__digest}`);
      }
      const message =
        relevantErrors.length > 0
          ? relevantErrors.join('; ')
          : 'SharePoint Liste konnte nicht erstellt werden';
      throw new Error(message);
    }
  });

  return {
    key: def.key,
    title: def.title,
    resolvedTitle: resolvedTitle ?? def.title,
    lists: health.lists,
  };
}

export async function deleteSharePointListForInstance(
  instance: RoadmapInstanceConfig,
  key: string
): Promise<SharePointListDeleteResult> {
  const def = SHAREPOINT_LIST_DEFINITIONS.find((candidate) => candidate.key === key);
  if (!def) {
    throw new Error(`Unbekannter Listen-Schlüssel "${key}"`);
  }

  const result: SharePointListDeleteResult = {
    key: def.key,
    title: def.title,
    status: 'missing',
  };
  const errors: string[] = [];

  await clientDataService.withInstance(instance.slug, async () => {
    let digest: string;
    try {
      digest = await clientDataService.requestDigest();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      errors.push(`Digest: ${message}`);
      throw new Error(`Digest Fehler: ${message}`);
    }

    const candidates = getListCandidates(def);
    let resolved: string | null = null;
    for (const candidate of candidates) {
      const check = await clientDataService.sharePointFetch(
        `/api/sharepoint/_api/web/lists/getByTitle('${encodeSharePointValue(candidate)}')?$select=Id`,
        { headers: jsonHeaders }
      );
      if (check.ok) {
        resolved = candidate;
        break;
      }
      if (check.status !== 404) {
        const message = await readError(check);
        errors.push(`${candidate}: ${message}`);
      }
    }

    if (!resolved) {
      return;
    }

    try {
      await deleteListByTitle(resolved, digest);
      result.status = 'deleted';
      result.resolvedTitle = resolved;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      errors.push(message);
      throw new Error(message);
    }
  });

  if (errors.length > 0) {
    result.errors = errors;
  }
  return result;
}

export async function provisionSharePointForInstance(
  instance: RoadmapInstanceConfig
): Promise<RoadmapInstanceHealth> {
  const health: RoadmapInstanceHealth = {
    checkedAt: new Date().toISOString(),
    permissions: { status: 'unknown' },
    lists: { ensured: [], created: [], missing: [], fieldsCreated: {}, errors: {} },
  };

  await clientDataService.withInstance(instance.slug, async () => {
    let digest: string;
    try {
      digest = await clientDataService.requestDigest();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      health.permissions = { status: 'error', message: `Digest Fehler: ${message}` };
      health.lists.errors.__digest = message;
      return;
    }

    for (const def of SHAREPOINT_LIST_DEFINITIONS) {
      const resolved = await ensureList(def, digest, health);
      if (!resolved) {
        health.lists.missing.push(def.title);
      }
    }

    const permissionResult = await probePermissions(digest);
    health.permissions = permissionResult;
  });

  return health;
}
