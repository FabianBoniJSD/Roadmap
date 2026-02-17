# Phase Information Feature - SharePoint Setup Guide

## Overview
This feature adds the ability to store and display informational text for each project phase. This document describes the required SharePoint list field configuration.

## Required SharePoint Fields

Add the following fields to the **RoadmapProjects** SharePoint list:

### 1. PhaseninfoInitialisierung
- **Field Name**: `PhaseninfoInitialisierung`
- **Type**: Multiple lines of text (Plain text)
- **Description**: Informationstext für die Initialisierungsphase
- **Required**: No
- **Maximum length**: 500 characters (recommended)

### 2. PhaseninfoKonzept
- **Field Name**: `PhaseninfoKonzept`
- **Type**: Multiple lines of text (Plain text)
- **Description**: Informationstext für die Konzeptphase
- **Required**: No
- **Maximum length**: 500 characters (recommended)

### 3. PhaseninfoRealisierung
- **Field Name**: `PhaseninfoRealisierung`
- **Type**: Multiple lines of text (Plain text)
- **Description**: Informationstext für die Realisierungsphase
- **Required**: No
- **Maximum length**: 500 characters (recommended)

### 4. PhaseninfoEinfuehrung
- **Field Name**: `PhaseninfoEinfuehrung`
- **Type**: Multiple lines of text (Plain text)
- **Description**: Informationstext für die Einführungsphase
- **Required**: No
- **Maximum length**: 500 characters (recommended)

### 5. PhaseninfoAbschluss
- **Field Name**: `PhaseninfoAbschluss`
- **Type**: Multiple lines of text (Plain text)
- **Description**: Informationstext für die Abschlussphase
- **Required**: No
- **Maximum length**: 500 characters (recommended)

## Field Creation Steps (SharePoint 2013/2016/2019/Online)

### Option 1: Using SharePoint UI

1. Navigate to the **RoadmapProjects** list
2. Click **Settings** (gear icon) → **List Settings**
3. Under **Columns**, click **Create column**
4. For each field:
   - Enter the field name exactly as shown above
   - Select "Multiple lines of text"
   - Select "Plain text" (not Rich text or Enhanced rich text)
   - Set "Number of lines for editing" to 3-5
   - Set "Require that this column contains information" to **No**
   - Click **OK**
5. Repeat for all 5 fields

### Option 2: Using PowerShell (for SharePoint admins)

```powershell
# Connect to SharePoint site
$siteUrl = "https://your-sharepoint-site-url"
Connect-PnPOnline -Url $siteUrl -Interactive

# Add fields to RoadmapProjects list
$listName = "RoadmapProjects"

# Field definitions
$fields = @(
    @{Name="PhaseninfoInitialisierung"; Title="Phaseninfo Initialisierung"},
    @{Name="PhaseninfoKonzept"; Title="Phaseninfo Konzept"},
    @{Name="PhaseninfoRealisierung"; Title="Phaseninfo Realisierung"},
    @{Name="PhaseninfoEinfuehrung"; Title="Phaseninfo Einführung"},
    @{Name="PhaseninfoAbschluss"; Title="Phaseninfo Abschluss"}
)

foreach ($field in $fields) {
    Add-PnPField -List $listName -DisplayName $field.Title -InternalName $field.Name -Type Note -AddToDefaultView
    Write-Host "Created field: $($field.Name)"
}

Write-Host "All phase info fields created successfully!"
```

## Verification

After adding the fields, verify they are accessible:

1. Open a project item in the list
2. Check that all 5 new fields appear in the edit form
3. Test adding text to each field and saving

## Application Behavior

### Without SharePoint Fields
- The application will work normally
- Phase info fields will not be saved or displayed
- No errors will occur (fields are optional)

### With SharePoint Fields
- Users can add informational text for each phase in the project form
- Text will be displayed in the phase timeline on the project detail page
- Each phase card will show the custom text in a highlighted box below the default description

## UI Location

**Project Form** (Create/Edit):
- Located in a dedicated "Phaseninformationen" section
- 5 text areas (one for each phase)
- Each labeled with the corresponding phase name

**Project Detail Page**:
- Phase timeline section (5 cards, one per phase)
- Custom text appears in a bordered box below the default phase description
- Only shown if text is present for that phase

## Rollback

If you need to remove these fields:
1. Navigate to List Settings
2. Click on each field name under "Columns"
3. Click "Delete" at the bottom
4. The application will continue to work without the fields (they are optional)
