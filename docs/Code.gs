/**
 * CONFIGURAÇÃO DO SERVIDOR (Google Apps Script)
 * v7.2 - Dynamic Mapping & Legacy Migration
 */
const CONFIG = {
  spreadsheetId: '1W5vEDWgNGqcrwSZww_cqcj1bvCHNkR7I-Lp7wCluorc', 
  sheets: {
    transactions: 'Transactions',
    categories: 'Categories',
    accounts: 'Accounts',
    cards: 'Cards',
    predicted: 'Predicted',
    predictedIncomes: 'PredictedIncomes',
    users: 'Users',
    notifications: 'Notifications'
  }
};

function getSS() {
  try {
    if (CONFIG.spreadsheetId === '1W5vEDWgNGqcrwSZww_cqcj1bvCHNkR7I-Lp7wCluorc') {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
    return SpreadsheetApp.openById(CONFIG.spreadsheetId);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;
    
    checkAndRepairHeaders();

    let result;
    switch(action) {
      case 'login':
        result = loginUser(payload.username, payload.password);
        break;
      case 'register':
        result = registerUser(payload);
        break;
      case 'updateProfile':
        result = updateProfile(payload);
        break;
      case 'getAppData':
        result = getAppData(payload.username);
        // After fetching, try to migrate legacy data if this is victor
        if (payload.username.toLowerCase() === 'victor') migrateLegacyData('victor');
        break;
      case 'syncAppData':
        result = syncAppData(payload);
        break;
      case 'loginGoogle':
        result = loginGoogleUser(payload);
        break;
      case 'cleanOrphanData':
        result = cleanOrphanData();
        break;
      case 'updateSubcategory':
        result = updateSubcategoryInTransactions(
          payload.username,
          payload.oldName,
          payload.newName,
          payload.categoryId || null
        );
        break;
      case 'syncNotifications':
        result = syncNotifications(payload.username, payload.notifications);
        break;
      case 'getNotifications':
        result = getNotifications(payload.username);
        break;
      default:
        throw new Error('Ação inválida: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Para login/auth, retornamos mensagem genérica se solicitado
    const msg = (error.message.includes('incorrect') || error.message.includes('not found')) 
      ? 'Usuário ou senha incorretos' 
      : error.message;
      
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Mapeia um objeto para uma linha com base nos cabeçalhos REAIS da planilha
 */
function mapObjectToRow(headers, obj, ownerUsername) {
  return headers.map(h => {
    if (h === 'username') return ownerUsername || obj[h] || '';
    let val = obj[h];
    if (h === 'subcategories' && Array.isArray(val)) return val.join(';');
    return (val !== undefined && val !== null) ? val : '';
  });
}

function checkAndRepairHeaders() {
  const ss = getSS();
  const map = {
    [CONFIG.sheets.users]: getUserHeaders(),
    [CONFIG.sheets.transactions]: getTransactionHeaders(),
    [CONFIG.sheets.accounts]: getAccountHeaders(),
    [CONFIG.sheets.cards]: getCardHeaders(),
    [CONFIG.sheets.categories]: getCategoryHeaders(),
    [CONFIG.sheets.categories]: getCategoryHeaders(),
    [CONFIG.sheets.predicted]: getPredictedHeaders(),
    [CONFIG.sheets.predictedIncomes]: getPredictedIncomeHeaders(),
    [CONFIG.sheets.notifications]: getNotificationHeaders()
  };

  Object.keys(map).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    const headers = map[sheetName];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      headers.forEach(h => {
        if (currentHeaders.indexOf(h) === -1) {
          sheet.getRange(1, Math.max(1, sheet.getLastColumn()) + 1).setValue(h);
        }
      });
    }
  });
}

function loginUser(username, password) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.users);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  const passIdx = headers.indexOf('password');
  
  if (userIdx === -1 || passIdx === -1) throw new Error('Estrutura Users inválida.');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).toLowerCase() === String(username).toLowerCase()) {
      if (data[i][passIdx] == password) {
        const userObj = {};
        headers.forEach((h, j) => userObj[h] = data[i][j]);
        delete userObj.password; 
        return { user: userObj };
      } else {
        throw new Error('password incorrect');
      }
    }
  }
  throw new Error('user not found');
}

function registerUser(payload) {
  const ss = getSS();
  let sheet = ss.getSheetByName(CONFIG.sheets.users);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const userIdx = headers.indexOf('username');
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).toLowerCase() === String(payload.username).toLowerCase()) {
      throw new Error('Este nome de usuário já está em uso.');
    }
  }
  
  const row = mapObjectToRow(headers, payload, payload.username);
  sheet.appendRow(row);
  const retUser = {...payload};
  delete retUser.password;
  return { user: retUser };
}

function updateProfile(payload) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.users);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).toLowerCase() === String(payload.username).toLowerCase()) {
      const row = headers.map((h, j) => payload[h] !== undefined ? payload[h] : data[i][j]);
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true };
    }
  }
  throw new Error('Usuário não encontrado.');
}

/**
 * Lida com login via Google. Se o usuário não existir (pelo email), ele é criado.
 */
function loginGoogleUser(payload) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.users);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIdx = headers.indexOf('email');
  
  if (emailIdx === -1) throw new Error('Coluna email não encontrada na aba Users.');

  // Procura por email existente
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailIdx]).toLowerCase() === String(payload.email).toLowerCase()) {
      const userObj = {};
      headers.forEach((h, j) => userObj[h] = data[i][j]);
      delete userObj.password;
      return { user: userObj };
    }
  }

  // Se não encontrou, cria um novo usuário (Registro Automático via Google)
  const newUser = {
    ...payload,
    username: payload.username || payload.email.split('@')[0],
    password: 'google-auth-bypass-' + Math.random().toString(36).substring(7), // Senha aleatória interna
    createdAt: new Date().toISOString()
  };

  const row = mapObjectToRow(headers, newUser, newUser.username);
  sheet.appendRow(row);
  
  const retUser = {...newUser};
  delete retUser.password;
  return { user: retUser };
}

function syncData(sheetName, items, headers, ownerUsername) {
  const ss = getSS();
  let sheet = ss.getSheetByName(sheetName);
  const realHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = realHeaders.indexOf('id');
  const userIdx = realHeaders.indexOf('username');
  
  const existingData = sheet.getDataRange().getValues();
  const existingMap = {};
  for (let i = 1; i < existingData.length; i++) {
    const id = existingData[i][idIdx];
    const rowUser = existingData[i][userIdx];
    if (id && String(rowUser).toLowerCase() === String(ownerUsername).toLowerCase()) {
      existingMap[id] = i + 1;
    }
  }
  
  items.forEach(item => {
    const row = mapObjectToRow(realHeaders, item, ownerUsername);
    if (existingMap[item.id]) {
      sheet.getRange(existingMap[item.id], 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
  
  return { status: 'ok' };
}

function getAppData(username, isFullPull = false) {
  if (!username) throw new Error('Username é obrigatório.');
  const ss = getSS();
  const result = {};
  
  Object.keys(CONFIG.sheets).forEach(key => {
    const sheetName = CONFIG.sheets[key];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { result[key] = []; return; }
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) { result[key] = []; return; }

    const headers = values[0];
    const userIdx = headers.indexOf('username');
    
    let filteredRows = values.slice(1).filter(row => {
        if (userIdx === -1) return false;
        return String(row[userIdx]).toLowerCase() === String(username).toLowerCase();
    });
    
    // Performance: limit transactions to last 200 items UNLESS full pull is requested
    if (!isFullPull && (key === CONFIG.sheets.transactions.toLowerCase() || key === 'transactions')) {
      filteredRows = filteredRows.slice(-200);
    }
    
    const data = filteredRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (h === 'subcategories' && typeof val === 'string' && val.includes(';')) val = val.split(';');
        obj[h] = (val === '' || val === undefined) ? null : val;
      });
      return obj;
    });
    
    if (key === 'users') {
        const u = data[0] || null;
        if (u) delete u.password;
        result[key] = u;
    } else {
        result[key] = data;
    }
  });
  return result;
}

function syncAppData(payload) {
  const username = payload.username;
  const results = {};
  if (payload.transactions) results.transactions = syncData(CONFIG.sheets.transactions, payload.transactions, getTransactionHeaders(), username);
  if (payload.accounts) results.accounts = syncData(CONFIG.sheets.accounts, payload.accounts, getAccountHeaders(), username);
  if (payload.categories) results.categories = syncData(CONFIG.sheets.categories, payload.categories, getCategoryHeaders(), username);
  if (payload.cards) results.cards = syncData(CONFIG.sheets.cards, payload.cards, getCardHeaders(), username);
  if (payload.predicted) results.predicted = syncData(CONFIG.sheets.predicted, payload.predicted, getPredictedHeaders(), username);
  if (payload.predictedIncomes) results.predictedIncomes = syncData(CONFIG.sheets.predictedIncomes, payload.predictedIncomes, getPredictedIncomeHeaders(), username);
  return results;
}

/**
 * Migra dados antigos (sem username) para o usuário victor
 */
function migrateLegacyData(username) {
  const ss = getSS();
  const sheetsToMigrate = [CONFIG.sheets.transactions, CONFIG.sheets.accounts, CONFIG.sheets.cards];
  
  sheetsToMigrate.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const userIdx = headers.indexOf('username');
    if (userIdx === -1) return;

    for (let i = 1; i < values.length; i++) {
      if (values[i][userIdx] === '' || values[i][userIdx] === null || values[i][userIdx] === undefined) {
        sheet.getRange(i + 1, userIdx + 1).setValue(username);
      }
    }
  });
}

/**
 * Remove registros sem username (dados órfãos)
 * Pode ser chamado manualmente ou via endpoint
 */
function cleanOrphanData() {
  const ss = getSS();
  const sheetsToClean = [
    CONFIG.sheets.transactions,
    CONFIG.sheets.accounts,
    CONFIG.sheets.categories,
    CONFIG.sheets.cards,
    CONFIG.sheets.cards,
    CONFIG.sheets.predicted,
    CONFIG.sheets.predictedIncomes,
    CONFIG.sheets.notifications
  ];
  
  let totalRemoved = 0;
  
  sheetsToClean.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    
    const headers = data[0];
    const userIdx = headers.indexOf('username');
    if (userIdx === -1) return;
    
    // Remove de baixo para cima para não afetar índices
    for (let i = data.length - 1; i > 0; i--) {
      const username = data[i][userIdx];
      if (!username || username === '' || username === null) {
        sheet.deleteRow(i + 1);
        totalRemoved++;
      }
    }
  });
  
  return { success: true, removed: totalRemoved };
}

/**
 * Atualiza nome de subcategoria em todas as transações
 * @param {string} username - Dono dos dados
 * @param {string} oldName - Nome antigo da subcategoria
 * @param {string} newName - Nome novo da subcategoria
 * @param {string} categoryId - ID da categoria (opcional, para filtrar)
 */
function updateSubcategoryInTransactions(username, oldName, newName, categoryId = null) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.transactions);
  if (!sheet) throw new Error('Aba Transactions não encontrada');
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { updated: 0 };
  
  const headers = data[0];
  const subcatIdx = headers.indexOf('subcategory');
  const userIdx = headers.indexOf('username');
  const catIdx = headers.indexOf('category');
  
  if (subcatIdx === -1 || userIdx === -1) {
    throw new Error('Estrutura inválida: faltam colunas subcategory ou username');
  }
  
  let updated = 0;
  
  for (let i = 1; i < data.length; i++) {
    const rowUser = String(data[i][userIdx]).toLowerCase();
    const rowSubcat = data[i][subcatIdx];
    const rowCat = data[i][catIdx];
    
    // Verifica se pertence ao usuário e tem a subcategoria antiga
    if (rowUser === String(username).toLowerCase() && rowSubcat === oldName) {
      // Se categoryId foi passado, valida também a categoria
      if (categoryId === null || rowCat === categoryId) {
        sheet.getRange(i + 1, subcatIdx + 1).setValue(newName);
        updated++;
      }
    }
  }
  
  return { success: true, updated };
}



function getTransactionHeaders() { return ['id', 'date', 'amount', 'description', 'category', 'subcategory', 'type', 'paymentMethod', 'cardId', 'accountId', 'status', 'createdAt', 'updatedAt', 'currentInstallment', 'installments', 'parentTransactionId', 'notes', 'predictedExpenseId', 'username']; }
function getCategoryHeaders() { return ['id', 'label', 'icon', 'type', 'subcategories', 'username']; }
function getAccountHeaders() { return ['id', 'name', 'icon', 'balance', 'status', 'updatedAt', 'username']; }
function getCardHeaders() { return ['id', 'alias', 'bank', 'brand', 'type', 'limit', 'closingDay', 'dueDay', 'color', 'status', 'initials', 'rechargeValue', 'rechargeDate', 'linkedAccountId', 'billStatusOverrides', 'updatedAt', 'username']; }
function getPredictedHeaders() { return ['id', 'subcategory', 'amount', 'predictedAmount', 'category', 'dueDay', 'icon', 'color', 'notes', 'username']; }
function getPredictedIncomeHeaders() { return ['id', 'subcategory', 'amount', 'predictedAmount', 'category', 'receiveDay', 'targetAccount', 'recurrencePeriod', 'customInterval', 'customPeriod', 'icon', 'color', 'notes', 'username']; }
function getUserHeaders() { return ['id', 'username', 'password', 'name', 'email', 'photo', 'currency', 'createdAt']; }
function getNotificationHeaders() { return ['username', 'notificationData', 'lastUpdate']; }

/**
 * Salva as notificações de um usuário como um JSON único por simplicidade e performance
 */
function syncNotifications(username, notifications) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.notifications);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  
  // Procura linha existente
  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).toLowerCase() === String(username).toLowerCase()) {
      rowIdx = i + 1;
      break;
    }
  }
  
  const payload = [username, JSON.stringify(notifications), new Date()];
  
  if (rowIdx !== -1) {
    sheet.getRange(rowIdx, 1, 1, 3).setValues([payload]);
  } else {
    sheet.appendRow(payload);
  }
  
  return { success: true };
}

function getNotifications(username) {
  const ss = getSS();
  const sheet = ss.getSheetByName(CONFIG.sheets.notifications);
  if (!sheet) return { notifications: [] };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  const dataIdx = headers.indexOf('notificationData');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][userIdx]).toLowerCase() === String(username).toLowerCase()) {
      return { 
        notifications: JSON.parse(data[i][dataIdx] || '[]') 
      };
    }
  }
  
  return { notifications: [] };
}

function doGet(e) {
  return ContentService.createTextOutput("Serviço Financeiro v7.4 Ativo (Predicted Incomes)").setMimeType(ContentService.MimeType.TEXT);
}
