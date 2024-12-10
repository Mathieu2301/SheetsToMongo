# SheetsToMongo

This is a Google Apps Script project that allows you to import data from Google Sheets into MongoDB.

## Setup

1. In your Google Sheets document, click on "Extensions" in the menu bar and then click on "Apps Script".
2. Create a new `SheetsToMongo` file and paste the code below into the editor:

```typescript
// Function called by the button
function submitData() {
  const field = SheetsToMongo.field;

  SheetsToMongo.createUpdateRequest({
    lang: 'en',
    apiUrl: 'https://<url-of-the-stm-bridge>',
    collectName: 'users',
    tableMap: (row, i) => row.some(Boolean)
      ? {
        _id:       i + 3,
        name:      field('string', row[0]),
        email:     field('string', row[1]),
        age:       field('number', row[3]),
        birthDate: field('date', row[4]),
        comment:   field('string', row[5], null),
        isActive:  field('boolean', row[6], false),
      }
      : null,
  });
}

// Create a menu in the menu bar
const ui = SpreadsheetApp.getUi();
ui.createMenu('SheetsToMongo')
  .addItem('Submit', 'submitData')
  .addToUi();

// Necessary for SheetsToMongo to work
function sendCommand() {
  SheetsToMongo.sendCommand(arguments);
}
```
