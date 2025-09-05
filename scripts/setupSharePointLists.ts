// Dynamic ESM imports to avoid CommonJS/ESM conflict under NodeNext when executed as a standalone script
import { SP_LISTS } from "../utils/spConfig";

// You'll need to authenticate this script with appropriate credentials
// This is just a template - you'd need to run this with proper authentication
async function setupSharePointLists() {
  const { spfi } = await import("@pnp/sp");
  await import("@pnp/sp/webs");
  await import("@pnp/sp/lists");
  await import("@pnp/sp/fields");

  const siteUrl = process.env.SHAREPOINT_SITE_URL || "https://spi-u.intranet.bs.ch/JSD/QMServices/Roadmap/roadmap-app";
  const sp = spfi(siteUrl);
  
  try {
    // Create Projects list
    const projectsList = await sp.web.lists.ensure(SP_LISTS.PROJECTS, "Roadmap Projects", 100);
    if (projectsList.created) {
      console.log("Created Projects list");
      // Add fields to the list
      await projectsList.list.fields.addText("Category", { MaxLength: 100 });
      await projectsList.list.fields.addText("StartQuarter", { MaxLength: 50 });
      await projectsList.list.fields.addText("EndQuarter", { MaxLength: 50 });
      await projectsList.list.fields.addText("Description", { MaxLength: 500, Required: false });
      await projectsList.list.fields.addText("Status", { MaxLength: 50 });
      await projectsList.list.fields.addText("Projektleitung", { MaxLength: 100, Required: false });
      await projectsList.list.fields.addText("Bisher", { MaxLength: 1000, Required: false });
      await projectsList.list.fields.addText("Zukunft", { MaxLength: 1000, Required: false });
      await projectsList.list.fields.addNumber("Fortschritt");
      await projectsList.list.fields.addText("GeplantUmsetzung", { MaxLength: 100, Required: false });
      await projectsList.list.fields.addText("Budget", { MaxLength: 100, Required: false });
  await projectsList.list.fields.addText("Projektphase", { MaxLength: 50, Required: false });
  await projectsList.list.fields.addText("NaechsterMeilenstein", { MaxLength: 255, Required: false });
    }
    
    // Create Categories list
    const categoriesList = await sp.web.lists.ensure(SP_LISTS.CATEGORIES, "Roadmap Categories", 100);
    if (categoriesList.created) {
      console.log("Created Categories list");
      await categoriesList.list.fields.addText("Color", { MaxLength: 20 });
      await categoriesList.list.fields.addText("Icon", { MaxLength: 50 });
    }
    
    // Create FieldTypes list
    const fieldTypesList = await sp.web.lists.ensure(SP_LISTS.FIELD_TYPES, "Roadmap Field Types", 100);
    if (fieldTypesList.created) {
      console.log("Created Field Types list");
      await fieldTypesList.list.fields.addText("Type", { MaxLength: 50, Required: true });
      await fieldTypesList.list.fields.addText("Description", { MaxLength: 500, Required: false });
    }
    
    // Create Fields list (for storing field values for projects)
    const fieldsList = await sp.web.lists.ensure(SP_LISTS.FIELDS, "Roadmap Fields", 100);
    if (fieldsList.created) {
      console.log("Created Fields list");
      await fieldsList.list.fields.addText("Type", { MaxLength: 50 });
      await fieldsList.list.fields.addText("Value", { MaxLength: 500 });
      await fieldsList.list.fields.addText("ProjectId", { MaxLength: 100 });
    }
    
    // Create TeamMembers list
    const teamMembersList = await sp.web.lists.ensure(SP_LISTS.TEAM_MEMBERS, "Roadmap Team Members", 100);
    if (teamMembersList.created) {
      console.log("Created Team Members list");
      await teamMembersList.list.fields.addText("Role", { MaxLength: 100 });
      await teamMembersList.list.fields.addText("ProjectId", { MaxLength: 100 });
    }
    
    // Create Users list (for authentication if needed)
    const usersList = await sp.web.lists.ensure(SP_LISTS.USERS, "Roadmap Users", 100);
    if (usersList.created) {
      console.log("Created Users list");
      await usersList.list.fields.addText("Email", { MaxLength: 100, Required: true });
      await usersList.list.fields.addText("Role", { MaxLength: 50 });
      await usersList.list.fields.addText("HashedPassword", { MaxLength: 255, Required: false }); 
      // Note: Consider using SharePoint permissions instead of storing passwords
    }
    
    console.log("SharePoint list setup complete!");
    
  } catch (error) {
    console.error("Error setting up SharePoint lists:", error);
  }
}

// Execute the function
setupSharePointLists().then(() => console.log("Setup script completed"));