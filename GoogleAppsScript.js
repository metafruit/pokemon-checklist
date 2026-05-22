/**
 * Google Apps Script - Pokémon Checklist Database Sync Gateway
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.google.com).
 * 2. Create a new blank spreadsheet.
 * 3. Go to "Extensions" > "Apps Script".
 * 4. Delete any code in the editor and paste this code.
 * 5. Click "Save" (floppy disk icon).
 * 6. Click "Deploy" > "New deployment".
 * 7. Click the gear icon (Select type) and choose "Web app".
 * 8. Set Description: "Pokemon Checklist API"
 * 9. Set Execute as: "Me"
 * 10. Set Who has access: "Anyone"
 * 11. Click "Deploy".
 * 12. Authorize permissions when prompted (Advanced > Go to Untitled project > Allow).
 * 13. Copy the "Web app URL" and paste it into the Settings of the Pokémon Checklist app.
 */

// Handle GET requests (Fetching and Single-Item Sync)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = e.parameter.action || "fetch";
    
    // Check if sheet has data
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      // Return empty checklist if sheet is uninitialized
      return createJSONResponse({ 
        initialized: false, 
        checkedIds: [],
        message: "Sheet is empty. Use the 'Initialize Sheet' button in the app settings to populate it."
      });
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var idIndex = headers.indexOf("ID");
    var checkedIndex = headers.indexOf("Checked");
    
    if (idIndex === -1 || checkedIndex === -1) {
      return createJSONResponse({ 
        initialized: false, 
        checkedIds: [], 
        message: "Required columns 'ID' or 'Checked' not found." 
      });
    }
    
    // ACTION: FETCH - Returns list of checked Pokémon IDs
    if (action === "fetch") {
      var checkedIds = [];
      for (var i = 1; i < data.length; i++) {
        var isChecked = data[i][checkedIndex];
        if (isChecked === true || String(isChecked).toUpperCase() === "TRUE") {
          checkedIds.push(Number(data[i][idIndex]));
        }
      }
      return createJSONResponse({ 
        initialized: true, 
        checkedIds: checkedIds 
      });
    }
    
    // ACTION: SYNC - Updates a single Pokémon check status
    if (action === "sync") {
      var targetId = Number(e.parameter.id);
      var checkedValue = e.parameter.checked === "true";
      
      if (isNaN(targetId)) {
        return createJSONResponse({ success: false, error: "Invalid or missing ID parameter" });
      }
      
      // Look for the row with matching ID
      var foundRow = -1;
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][idIndex]) === targetId) {
          foundRow = i + 1; // 1-indexed row number
          break;
        }
      }
      
      if (foundRow === -1) {
        return createJSONResponse({ success: false, error: "Pokémon ID " + targetId + " not found in sheet." });
      }
      
      // Update cell in sheet (row is foundRow, column is checkedIndex + 1)
      sheet.getRange(foundRow, checkedIndex + 1).setValue(checkedValue);
      
      return createJSONResponse({ 
        success: true, 
        id: targetId, 
        checked: checkedValue 
      });
    }
    
    return createJSONResponse({ success: false, error: "Unknown action parameter" });
    
  } catch (err) {
    return createJSONResponse({ success: false, error: err.toString() });
  }
}

// Handle POST requests (Bulk Sync and Sheet Population)
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    // ACTION: POPULATE - Bulk initialize the sheet with all Pokémon data
    if (action === "populate") {
      var pokemons = payload.pokemons; // Array of { id, name, types, generation }
      if (!pokemons || !pokemons.length) {
        return createJSONResponse({ success: false, error: "No Pokémon data provided" });
      }
      
      // Clear existing content
      sheet.clear();
      
      // Setup headers
      var headers = ["ID", "Name", "Types", "Generation", "Checked"];
      sheet.appendRow(headers);
      
      // Format headers
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#3b82f6");
      headerRange.setFontColor("#ffffff");
      headerRange.setHorizontalAlignment("center");
      
      // Prepare values array for bulk insert
      var values = [];
      for (var i = 0; i < pokemons.length; i++) {
        var p = pokemons[i];
        values.push([
          p.id,
          p.name,
          p.types.join(", "),
          p.generation,
          false // Checked: starts as FALSE
        ]);
      }
      
      // Bulk write values (starts from row 2, col 1)
      sheet.getRange(2, 1, values.length, 5).setValues(values);
      
      // Enable checkbox data validation in column E (Checked)
      var checkboxRange = sheet.getRange(2, 5, values.length, 1);
      var checkboxValidation = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      checkboxRange.setDataValidation(checkboxValidation);
      
      // Format sheets columns
      sheet.autoResizeColumns(1, 5);
      
      return createJSONResponse({ 
        success: true, 
        message: "Successfully populated sheet with " + pokemons.length + " Pokémon." 
      });
    }
    
    // ACTION: BULK_SYNC - Overwrite Checked column based on client state
    if (action === "bulk_sync") {
      var checkedIds = payload.checkedIds || [];
      var lastRow = sheet.getLastRow();
      
      if (lastRow < 2) {
        return createJSONResponse({ success: false, error: "Sheet is empty, please populate it first." });
      }
      
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idIndex = headers.indexOf("ID");
      var checkedIndex = headers.indexOf("Checked");
      
      if (idIndex === -1 || checkedIndex === -1) {
        return createJSONResponse({ success: false, error: "Required columns 'ID' or 'Checked' not found." });
      }
      
      // Map checked IDs to a Set for quick lookup
      var checkedSet = {};
      checkedIds.forEach(function(id) {
        checkedSet[id] = true;
      });
      
      // Create column update array
      var updates = [];
      for (var i = 1; i < data.length; i++) {
        var id = Number(data[i][idIndex]);
        updates.push([checkedSet[id] ? true : false]);
      }
      
      // Write updates in one API call
      sheet.getRange(2, checkedIndex + 1, updates.length, 1).setValues(updates);
      
      return createJSONResponse({ 
        success: true, 
        message: "Synced " + checkedIds.length + " checked items to Google Sheet." 
      });
    }
    
    return createJSONResponse({ success: false, error: "Unknown action in POST" });
    
  } catch (err) {
    return createJSONResponse({ success: false, error: err.toString() });
  }
}

// Utility to create a JSON output with proper headers (supports CORS via JSONP/Standard redirects)
function createJSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
