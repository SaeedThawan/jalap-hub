/**
 * طبقة الاتصال بقاعدة البيانات السحابية (API Layer) v36.0
 */
const ApiService = {
  async fetchWorkspace(userId, monthKey) {
    const url = `${CONFIG.API_URL}?action=getWorkspace&userId=${userId || ''}&monthKey=${monthKey}`;
    const res = await fetch(url);
    return await res.json();
  },

  async getAvailableMonths() {
    const url = `${CONFIG.API_URL}?action=getAvailableMonths`;
    const res = await fetch(url);
    return await res.json();
  },

  async recalculateRawData(monthKey, userContext) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'recalculateRawData',
        monthKey,
        userContext
      })
    });
    return await res.json();
  },

  async saveOfficialConfig(monthKey, data, userContext) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveOfficialConfig',
        monthKey,
        generalRules: data.generalRules,
        reps: data.reps,
        userContext
      })
    });
    return await res.json();
  },

  async freezeAndArchiveMonth(monthKey, processedReps, generalRules, userContext) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'freezeAndArchiveMonth',
        monthKey,
        processedReps,
        generalRules,
        userContext
      })
    });
    return await res.json();
  },

  async unlockMonth(monthKey, userContext) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'unlockMonth',
        monthKey,
        userContext
      })
    });
    return await res.json();
  }
};

const AuthService = {
  async login(username, password) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });
    return await res.json();
  }
};
