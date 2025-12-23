export type SharePointFieldDefinition = {
  name: string;
  schemaXml: string;
};

export type SharePointListDefinition = {
  key: string;
  title: string;
  template: number;
  description?: string;
  aliases?: string[];
  fields: SharePointFieldDefinition[];
};

export const encodeSharePointValue = (value: string): string => value.replace(/'/g, "''");

export const SHAREPOINT_LIST_DEFINITIONS: SharePointListDefinition[] = [
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
    aliases: ['RoadmapFieldTypes', 'Roadmap Field Types'],
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
  {
    key: 'RoadmapSettings',
    title: 'Roadmap Settings',
    template: 100,
    aliases: ['RoadmapSettings'],
    fields: [
      {
        name: 'Value',
        schemaXml:
          '<Field DisplayName="Value" Name="Value" Type="Note" NumLines="12" RichText="FALSE" />',
      },
      {
        name: 'Description',
        schemaXml:
          '<Field DisplayName="Description" Name="Description" Type="Note" NumLines="8" RichText="FALSE" />',
      },
    ],
  },
];

export const SHAREPOINT_LIST_TITLES = SHAREPOINT_LIST_DEFINITIONS.map((def) => def.title);
