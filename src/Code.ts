const TEXTS = {
  fr: {
    ERROR_NOT_SUPPORTED_FIELD_TYPE: 'Type de champs non pris en charge',
    NO_NEW_CHANGES: 'Toutes les modifications sont déjà appliquées !',
    CONFIRM_CHANGES: 'Confirmer les modifications',
    PENDING_CHANGES: 'Modifications en attente...',
    SHEETS_CREATED_BY_SHEETSTOMONGO: 'Feuille crée par SheetsToMongo',
    ADDITIONS: 'Ajouts',
    DELETIONS: 'Suppressions',
    UPDATES: 'Modifications',
    FIELD_NAME: 'Nom du champs',
    OLD_VALUE: 'Ancienne valeur',
    NEW_VALUE: 'Nouvelle valeur',
    TYPE: 'Type',
    COUNT: 'Quantité',
    APPLY_ALL_UPDATES: 'Appliquer',
    CANCEL: 'Annuler',
    APPLIED_UPDATES: 'Modifications appliquées',
    CREATED_DOCUMENT: 'document créé',
    CREATED_DOCUMENTS: 'documents créés',
    DELETED_DOCUMENT: 'document supprimé',
    DELETED_DOCUMENTS: 'documents supprimés',
    UPDATED_FIELD: 'champ modifiés',
    UPDATED_FIELDS: 'champs modifiés',
    THERE_WAS: 'Il y a eu',
    THERE_WERE: 'Il y a eu',
    ERROR: 'erreur',
    ERRORS: 'erreurs',
    UPDATE_CANCELED: 'Les modifications ont été annulées',
  },
};

interface STMConfig {
  apiUrl: string;
  lang: 'fr';
  stmApiKey: string;
  collectName: string;
  tableMap: (
    value: unknown[],
    index: number,
    array: unknown[][],
  ) => Record<string, unknown> | null;
}

type FieldType = 'string' | 'number' | 'boolean' | 'date';

function sheetsToMongoApiRequest(
  config: STMConfig,
  method: GoogleAppsScript.URL_Fetch.HttpMethod,
  endpoint: string,
  payload: object = undefined,
) {
  // Define the URL of the API Endpoint
  const apiEndpointUrl = `${config.apiUrl}/${endpoint}`;

  // Set up options for URL Fetch
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': config.lang,
      'User-Metadata-Email': Session.getActiveUser().getEmail().toLowerCase(),
    },
    payload: payload ? JSON.stringify(payload) : undefined,
  };

  try {
    // Send the request
    const response = UrlFetchApp.fetch(apiEndpointUrl, options);
    const content = response.getContentText();
    return JSON.parse(content);
  } catch (e) {
    Browser.msgBox(e.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function field<T extends string | number>(
  type: FieldType,
  value: T,
  defVal: T = undefined,
) {
  if (type === 'string') return String(value) || '';
  if (type === 'number') {
    return typeof value === 'number' ? Number(value.toPrecision(12)) : defVal;
  }
  if (type === 'date') {
    if (!value) return defVal;
    return new Date(value).toDateString();
  }

  const [t] = Object.values(TEXTS);
  throw new Error(t.ERROR_NOT_SUPPORTED_FIELD_TYPE);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createUpdateRequest(config: STMConfig) {
  const { lang, collectName, tableMap } = config;
  const t = TEXTS[lang];

  // Select active spreadsheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // data is a 2D array, index0 is rows and index1 is cols
  const newRows = sheet
    .getDataRange()
    .getValues()
    // Filter out 2 first lines
    .slice(2)
    // Map each row to an object
    .map(tableMap)
    .filter(Boolean);

  const data = sheetsToMongoApiRequest(config, 'post', 'v1/updateRequest', {
    collectName,
    newRows,
    displayFields: ['nameEnteredManually', 'symbolEnteredManually'],
  });

  if (!data.changes.rowChanges.length) {
    Browser.msgBox(t.NO_NEW_CHANGES);
    return;
  }

  createDiffTableSidebar(config, data);
  // createDiffTableSheet(config, data);
}

function sidebarApplyUpdates(config: STMConfig, requestId: string) {
  const t = TEXTS[config.lang];
  // closeDiffTableSheet();

  const data = sheetsToMongoApiRequest(
    config,
    'post',
    `v1/updateRequest/${requestId}/apply`,
  );
  const { created, deleted, updated, errors } = data.applyResult;

  const f = (count: number, texts: string) =>
    `${count} ${texts
      .split(' ')
      .map((text) => (count > 1 ? `${text}s` : text))
      .join(' ')}`;

  Browser.msgBox(
    [
      `${t.APPLIED_UPDATES}:`,
      `${[
        created ? f(created, 'document créé') : null,
        deleted ? f(deleted, 'document supprimé') : null,
        updated ? f(updated, 'champ modifié') : null,
      ]
        .filter(Boolean)
        .join(', ')}.`,
      errors ? `Il y a eu ${f(errors, 'erreur')}.` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function sidebarCancelUpdates(config: STMConfig) {
  // closeDiffTableSheet();
  const t = TEXTS[config.lang];
  Browser.msgBox(t.UPDATE_CANCELED);
}

function createDiffTableSidebar(config: STMConfig, data: unknown) {
  const t = TEXTS[config.lang];

  const template = HtmlService.createTemplateFromFile('Index');

  template.data = data;
  template.config = config;
  template.strConfig = JSON.stringify(config);
  template.t = t;
  template.strT = JSON.stringify(t);

  const page = template.evaluate().setTitle(t.CONFIRM_CHANGES).setWidth(1000);

  const ui = SpreadsheetApp.getUi();
  ui.showSidebar(page);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sendCommand([command, options]: [
  string,
  { config?: STMConfig; requestId?: string },
]) {
  if (command === 'ApplyUpdateRequest') {
    const { config, requestId } = options;
    return sidebarApplyUpdates(config, requestId);
  }

  if (command === 'CancelUpdateRequest') {
    const { config } = options;
    return sidebarCancelUpdates(config);
  }

  Browser.msgBox(`Invalid command: '${command}'`);
}

/*function logToSheet({ lang }, data) {
  const t = TEXTS[lang];

  const logSheet = (
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs')
    ?? SpreadsheetApp.getActiveSpreadsheet().insertSheet('Logs')
  );

  // On insère la ligne
  logSheet.appendRow([new Date(), JSON.stringify(data)]);

  // On protège la feuille
  logSheet
    .protect()
    .setDescription(t.SHEETS_CREATED_BY_SHEETSTOMONGO)
    .setWarningOnly(true);
}

function createDiffTableSheet(config, data) {
  const t = TEXTS[config.lang];
  const { stats, rowChanges } = data.changes;
  const totalChangesCount = stats.additions + stats.deletions + stats.updates;

  const spreadsheet = SpreadsheetApp
    .getActiveSpreadsheet();

  const sheetName = t.PENDING_CHANGES;
  closeDiffTableSheet();

  const changesSheet = spreadsheet
    .insertSheet(sheetName)
    // Définit la couleur de l'onglet en rouge
    .setTabColor('#FF1111')
    // Cache les grilles  
    .setHiddenGridlines(true);

  // Protège la feuille de calcul
  changesSheet
    .protect()
    .setDescription(t.SHEETS_CREATED_BY_SHEETSTOMONGO)
    .setWarningOnly(true);

  // Supprime les lignes et colonnes existantes
  changesSheet.deleteRows(1, changesSheet.getMaxRows() - 1);
  changesSheet.deleteColumns(1, changesSheet.getMaxColumns() - 1);

  // Définit le nombre de lignes et de colonnes
  changesSheet.insertRows(1, Math.max(totalChangesCount, 2) + 2);
  changesSheet.insertColumns(1, 8);

  // Définit la largeur des colonnes
  changesSheet
    .setColumnWidth(1, 50) // A
    .setColumnWidth(2, 110) // B
    .setColumnWidth(3, 50) // C
    .setColumnWidth(4, 50) // D
    .setColumnWidth(5, 50) // E
    .setColumnWidth(6, 150) // F
    .setColumnWidth(7, 200) // G
    .setColumnWidth(8, 200) // H
    .setColumnWidth(9, 50); // I

  // Définit la hauteur des lignes
  changesSheet
    .setRowHeight(1, 50)
    .setRowHeight(changesSheet.getMaxRows(), 50);

  // Sélectionne la plage B2:B4
  // Définit les valeurs des cellules
  // Applique la couleur de fond "gris clair 2" et la couleur de police "gris foncé 4"
  changesSheet
    .getRange('B2:B4')
    .setValues([[t.ADDITIONS], [t.DELETIONS], [t.UPDATES]])
    .setBackground('#D9D9D9') // Gris clair 2
    .setFontColor('#595959');  // Gris foncé 4

  // Affiche les stats (Additions, Deletions, Updates)
  changesSheet
    .getRange('C2:C4')
    .setBackground('#efefef')
    .setFontColors([['#274e13'], ['#990000'], ['#0b5394']])
    .setValues([[stats.additions], [stats.deletions], [stats.updates]]);

  // Aligne le tableau des stats en haut 
  changesSheet
    .getRange('B2:C4')
    .setVerticalAlignment('top');

  const lastTableRow = totalChangesCount + 2;

  changesSheet
    .getRange('E2:H2') // Header du tableau
    .setFontColor('#595959') // Gris foncé 4
    .setFontStyle('italic');

  changesSheet
    .getRange(`E2:H${lastTableRow}`) // Tableau entier
    .setValues([
      ['ID', t.FIELD_NAME, t.OLD_VALUE, t.NEW_VALUE],
      ...rowChanges.map(({ documentId, fieldUpdates }) => 
        fieldUpdates.map(({ fieldName, oldValue, newValue }, i) => [
          !i ? documentId : '', fieldName, oldValue, newValue,
        ]),
      ).flat(),
    ])
    .setHorizontalAlignment('center')
    .applyRowBanding();

  changesSheet
    .getRange( // Toute la feuille
      changesSheet.getMaxRows(),
      changesSheet.getMaxColumns(),
    )
    .setFontFamily('Calibri')
    .setFontSize(12)
    .setWrap(true);
}

function closeDiffTableSheet() {
  const sheetName = t.PENDING_CHANGES;
  const spreadsheet = SpreadsheetApp
    .getActiveSpreadsheet();

  const existingSheet = spreadsheet.getSheetByName(sheetName);
  if (existingSheet) spreadsheet.deleteSheet(existingSheet);
}*/