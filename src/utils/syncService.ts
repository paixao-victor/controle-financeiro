const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export async function postToScript(action: string, payload: any) {
    try {
        if (!APPS_SCRIPT_URL) {
            console.error('ERRO CRÍTICO: VITE_APPS_SCRIPT_URL não definida no ambiente!');
            throw new Error('Configuração de sincronização ausente. Verifique o arquivo .env');
        }

        console.log(`[Sync] Iniciando ${action} para: ${APPS_SCRIPT_URL}`);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action, payload }),
        });

        const text = await response.text();
        let json: any;
        try {
            json = JSON.parse(text);
        } catch (err) {
            throw new Error(`Erro de resposta: O Script retornou um formato inválido ou erro de servidor (500).`);
        }

        if (!json.success) {
            throw new Error(json.error || 'Erro interno reportado pelo Google Apps Script.');
        }

        return json;
    } catch (err: any) {
        console.error('Sync error:', err);
        throw err;
    }
}

export async function loginUser(username: string, password?: string) {
    return postToScript('login', { username, password });
}

export async function loginWithGoogle(email: string, name: string, photo?: string) {
    return postToScript('loginGoogle', { email, name, photo });
}

export async function registerUser(userData: any) {
    return postToScript('register', userData);
}

export async function updateProfileOnCloud(userData: any) {
    return postToScript('updateProfile', userData);
}

export async function fetchAppData(username: string, full: boolean = false) {
    return postToScript('getAppData', { username, full });
}

export async function syncAllData(data: { username: string, transactions?: any[], accounts?: any[], cards?: any[], categories?: any[], predicted?: any[], predictedIncomes?: any[] }) {
    return postToScript('syncAppData', data);
}

export async function cleanOrphanData() {
    return postToScript('cleanOrphanData', {});
}

export async function updateSubcategoryInSheets(username: string, oldName: string, newName: string, categoryId?: string) {
    return postToScript('updateSubcategory', { username, oldName, newName, categoryId });
}

export async function syncNotifications(username: string, notifications: any[]) {
    return postToScript('syncNotifications', { username, notifications });
}

export async function fetchNotifications(username: string) {
    return postToScript('getNotifications', { username });
}

