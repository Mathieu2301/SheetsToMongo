# SheetsToMongo

This is a Google Apps Script project that allows you to import data from Google Sheets into MongoDB.

## Setup

1. In your Google Sheets document, click on `Extensions` in the menu bar and then click on `Apps Script`.

2. Click on the `+` button next to `Library` in the sidebar,
    paste the project ID `1LeC5V6SEzbqWreUBIarpEYPHBVljtNI6WUaPxKAqOF618DuSM4Ty4c-3`,
    click on `Search` and then click on `Add`.

3. Create a new `SheetsToMongo` file and paste the code below into the editor:

    ```typescript
    // Function called by the button
    function submitData() {
      const field = SheetsToMongo.field;

      SheetsToMongo.createUpdateRequest({
        lang: 'en',
        apiUrl: 'https://<url-of-the-stm-bridge>',
        collectName: 'stm_users_test',
        tableMap: (row, i) => row.some(Boolean)
          ? {
            _id: i + 3,
            email:     field('string', row[0]),
            username:  field('string', row[1]),
            firstName: field('string', row[2]),
            lastName:  field('string', row[3]),
            birthData: field('date', row[4]),
            age:       field('number', row[5]),
            role:      field('string', row[6]),
            active:    field('boolean', row[7]),
            comment:   field('string', row[8], null),
            imageUrl:  field('string', row[9]),
          }
          : null,
        displayTemplate: '{{username}} ({{role}})',
      });
    }

    // Create a menu in the menu bar
    function addMenu() {
      const ui = SpreadsheetApp.getUi();
      ui.createMenu('SheetsToMongo')
        .addItem('Submit', 'submitData')
        .addToUi();
    }

    // Necessary for SheetsToMongo to work
    function sendCommand() {
      SheetsToMongo.sendCommand(arguments);
    }
    ```

4. (optional) Go to `Triggers` in the sidebar and click on `Add Trigger`. The select the `addMenu` function and click on `Save`.

5. (optional) In your Google Sheets document, select the `A1` cell, click on `Insert` in the menu bar and then click on `Drawing`.
Add a rectangle shape with `Apply` title, then click on `Save and Close`.
Adjust the size of the rectangle to fit the `A1` cell.
Right-click on the rectangle and click on `Assign script`.
Type `submitData` and click on `OK`.

6. Copy the table from this example <https://docs.google.com/spreadsheets/d/1u4HZnrn-koOQDTpGA9DYg4P1ID4FVw0SXO--b22xhQ8/edit?usp=sharing> to your Google Sheets document.

7. You can now use `SheetsToMongo`
