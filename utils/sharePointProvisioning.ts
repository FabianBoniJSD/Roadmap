import { clientDataService } from '@/utils/clientDataService';
import type {
  RoadmapInstanceConfig,
  RoadmapInstanceHealth,
  RoadmapInstanceHealthStatus,
} from '@/types/roadmapInstance';

type FieldDefinition = { name: string; schemaXml: string };

type ListDefinition = {
  key: string;
  title: string;
  template: number;
  description?: string;
  aliases?: string[];
  fields: FieldDefinition[];
};

const LIST_DEFINITIONS: ListDefinition[] = [
  {
    key: 'RoadmapProjects',
    title: 'Roadmap Projects',
    template: 100,
    description: 'Roadmap project records',
    aliases: ['RoadmapProjects'],
    fields: [
      {
        name: 'Category',
        schemaXml: '<Field DisplayName="Category" Name="Category" Type="Text" MaxLength="100" />',
      },
      {
        name: 'StartQuarter',
        schemaXml:
          '<Field DisplayName="StartQuarter" Name="StartQuarter" Type="Text" MaxLength="50" />',
      },
      {
        name: 'EndQuarter',
        schemaXml:
          '<Field DisplayName="EndQuarter" Name="EndQuarter" Type="Text" MaxLength="50" />',
      },
      {
        name: 'Description',
        schemaXml:
          '<Field DisplayName="Description" Name="Description" Type="Note" NumLines="12" RichText="FALSE" />',
      },
      {
        name: 'Status',
        schemaXml: '<Field DisplayName="Status" Name="Status" Type="Text" MaxLength="50" />',
      },
      {
        name: 'Projektleitung',
        schemaXml:
          '<Field DisplayName="Projektleitung" Name="Projektleitung" Type="Text" MaxLength="120" />',
      },
      {
        name: 'Bisher',
        schemaXml:
          '<Field DisplayName="Bisher" Name="Bisher" Type="Note" NumLines="10" RichText="FALSE" />',
      },
      {
        name: 'Zukunft',
        schemaXml:
          '<Field DisplayName="Zukunft" Name="Zukunft" Type="Note" NumLines="10" RichText="FALSE" />',
      },
      {
        name: 'Fortschritt',
        schemaXml:
          '<Field DisplayName="Fortschritt" Name="Fortschritt" Type="Number" MinValue="0" MaxValue="100" />',
      },
      {
        name: 'GeplantUmsetzung',
        schemaXml:
          '<Field DisplayName="GeplantUmsetzung" Name="GeplantUmsetzung" Type="Text" MaxLength="100" />',
      },
      {
        name: 'Budget',
        schemaXml: '<Field DisplayName="Budget" Name="Budget" Type="Text" MaxLength="120" />',
      },
      {
        name: 'StartDate',
        schemaXml:
          '<Field DisplayName="StartDate" Name="StartDate" Type="DateTime" Format="DateOnly" />',
      },
      {
        name: 'EndDate',
        schemaXml:
          '<Field DisplayName="EndDate" Name="EndDate" Type="DateTime" Format="DateOnly" />',
      },
      {
        name: 'ProjectFields',
        schemaXml:
          '<Field DisplayName="ProjectFields" Name="ProjectFields" Type="Note" NumLines="6" RichText="FALSE" />',
      },
      {
        name: 'Projektphase',
        schemaXml:
          '<Field DisplayName="Projektphase" Name="Projektphase" Type="Text" MaxLength="60" />',
      },
      {
        name: 'NaechsterMeilenstein',
        schemaXml:
          '<Field DisplayName="NaechsterMeilenstein" Name="NaechsterMeilenstein" Type="Text" MaxLength="255" />',
      },
    ],
  },
  {
    key: 'RoadmapCategories',
    title: 'Roadmap Categories',
    template: 100,
    aliases: ['RoadmapCategories'],
    fields: [
      {
        name: 'Color',
        schemaXml: '<Field DisplayName="Color" Name="Color" Type="Text" MaxLength="20" />',
      },
      {
        name: 'Icon',
        schemaXml: '<Field DisplayName="Icon" Name="Icon" Type="Text" MaxLength="50" />',
      },
      {
        name: 'ParentCategoryId',
        schemaXml: '<Field DisplayName="ParentCategoryId" Name="ParentCategoryId" Type="Number" />',
      },
      {
        name: 'IsSubcategory',
        schemaXml: '<Field DisplayName="IsSubcategory" Name="IsSubcategory" Type="Boolean" />',
      },
    ],
  },
  {
    key: 'RoadmapFieldTypes',
    title: 'Roadmap Field Types',
    template: 100,
    aliases: ['RoadmapFieldTypes', 'Roadmap FieldTypes'],
    fields: [
      {
        name: 'Type',
        schemaXml: '<Field DisplayName="Type" Name="Type" Type="Text" MaxLength="50" />',
      },
      {
        name: 'Description',
        schemaXml:
          '<Field DisplayName="Description" Name="Description" Type="Note" NumLines="8" RichText="FALSE" />',
      },
    ],
  },
  {
    key: 'RoadmapFields',
    title: 'Roadmap Fields',
    template: 100,
    aliases: ['RoadmapFields'],
    fields: [
      {
        name: 'Type',
        schemaXml: '<Field DisplayName="Type" Name="Type" Type="Text" MaxLength="50" />',
      },
      {
        name: 'Value',
        schemaXml:
          '<Field DisplayName="Value" Name="Value" Type="Note" NumLines="8" RichText="FALSE" />',
      },
      {
        name: 'ProjectId',
        schemaXml: '<Field DisplayName="ProjectId" Name="ProjectId" Type="Text" MaxLength="120" />',
      },
    ],
  },
  {
    key: 'RoadmapTeamMembers',
    title: 'Roadmap Team Members',
    template: 100,
    aliases: ['RoadmapTeamMembers'],
    fields: [
      {
        name: 'Role',
        schemaXml: '<Field DisplayName="Role" Name="Role" Type="Text" MaxLength="100" />',
      },
      {
        name: 'ProjectId',
        schemaXml: '<Field DisplayName="ProjectId" Name="ProjectId" Type="Text" MaxLength="120" />',
      },
    ],
  },
  {
    key: 'RoadmapUsers',
    title: 'Roadmap Users',
    template: 100,
    aliases: ['RoadmapUsers'],
    fields: [
      {
        name: 'Email',
        schemaXml: '<Field DisplayName="Email" Name="Email" Type="Text" MaxLength="150" />',
      },
      {
        name: 'Role',
        schemaXml: '<Field DisplayName="Role" Name="Role" Type="Text" MaxLength="60" />',
      },
      {
        name: 'HashedPassword',
        schemaXml:
          '<Field DisplayName="HashedPassword" Name="HashedPassword" Type="Text" MaxLength="255" />',
      },
    ],
  },
  {
    key: 'RoadmapProjectLinks',
    title: 'Roadmap Project Links',
    template: 100,
    aliases: ['RoadmapProjectLinks'],
    fields: [
      { name: 'Url', schemaXml: '<Field DisplayName="Url" Name="Url" Type="URL" />' },
      {
        name: 'ProjectId',
        schemaXml: '<Field DisplayName="ProjectId" Name="ProjectId" Type="Text" MaxLength="120" />',
      },
    ],
  },
];

const encodeValue = (value: string): string => value.replace(/'/g, "''");

const verboseHeaders = (digest: string) => ({
  Accept: 'application/json;odata=verbose',
  'Content-Type': 'application/json;odata=verbose',
  'X-RequestDigest': digest,
});

const jsonHeaders = {
  Accept: 'application/json;odata=nometadata',
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
  field: FieldDefinition,
  digest: string,
  health: RoadmapInstanceHealth
) => {
  const encodedList = encodeValue(listTitle);
  const encodedField = encodeValue(field.name);
  const fieldCheck = await clientDataService.sharePointFetch(
    `/api/sharepoint/_api/web/lists/getByTitle('${encodedList}')/fields/getByInternalNameOrTitle('${encodedField}')?$select=InternalName`,
    { headers: jsonHeaders }
  );
  if (fieldCheck.ok) return;
  if (fieldCheck.status !== 404) {
    const message = await readError(fieldCheck);
    health.lists.errors[`${listTitle}.${field.name}`] = message;
    return;
  }
  const createResp = await clientDataService.sharePointFetch(
    `/api/sharepoint/_api/web/lists/getByTitle('${encodedList}')/fields/CreateFieldAsXml`,
    {
      method: 'POST',
      headers: verboseHeaders(digest),
      body: JSON.stringify({
        __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
        SchemaXml: field.schemaXml,
        Options: 0,
      }),
    }
  );
  if (createResp.ok) {
    const listFields = health.lists.fieldsCreated[listTitle] || [];
    listFields.push(field.name);
    health.lists.fieldsCreated[listTitle] = listFields;
    return;
  }
  const message = await readError(createResp);
  health.lists.errors[`${listTitle}.${field.name}`] = message;
};

const ensureList = async (
  def: ListDefinition,
  digest: string,
  health: RoadmapInstanceHealth
): Promise<string | null> => {
  const candidates = [def.title, def.key, ...(def.aliases ?? [])];
  let resolved: string | null = null;

  for (const candidate of candidates) {
    const check = await clientDataService.sharePointFetch(
      `/api/sharepoint/_api/web/lists/getByTitle('${encodeValue(candidate)}')?$select=Id`,
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
    `/api/sharepoint/_api/web/lists/getByTitle('${encodeValue(title)}')`,
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

    for (const def of LIST_DEFINITIONS) {
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
