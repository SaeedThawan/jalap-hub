/**
 * محرك الاتصال بالسيرفر - ApiService v43.0
 */
const ApiService = {
  getUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_URL) {
      return CONFIG.APPS_SCRIPT_URL;
    }
    throw new Error('CONFIG.APPS_SCRIPT_URL is not defined');
  },

  async fetchWorkspace(userId, monthKey) {
    const url = `${this.getUrl()}?monthKey=${encodeURIComponent(monthKey || '2026-09')}&userId=${encodeURIComponent(userId || '')}`;
    const res = await fetch(url);
    return await res.json();
  },

  async getAvailableMonths() {
    const url = `${this.getUrl()}?action=getMonths`;
    const res = await fetch(url);
    return await res.json();
  },

  async sendPost(payload) {
    const res = await fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async recalculateRawData(monthKey, userContext) {
    return await this.sendPost({
      action: 'recalculateRawSales',
      monthKey: monthKey,
      userContext: userContext
    });
  },

  async saveOfficialConfig(monthKey, data, userContext) {
    return await this.sendPost({
      action: 'saveOfficialConfig',
      monthKey: monthKey,
      generalRules: data.generalRules,
      groupRules: data.groupRules,
      reps: data.reps,
      userContext: userContext
    });
  },

  async freezeAndArchiveMonth(monthKey, processedReps, generalRules, userContext) {
    return await this.sendPost({
      action: 'freezeAndArchiveMonth',
      monthKey: monthKey,
      processedReps: processedReps,
      generalRules: generalRules,
      userContext: userContext
    });
  },

  async unlockMonth(monthKey, userContext) {
    return await this.sendPost({
      action: 'unlockMonth',
      monthKey: monthKey,
      userContext: userContext
    });
  }
};

const AuthService = {
  async login(username, password) {
    return await ApiService.sendPost({
      action: 'login',
      username: username,
      password: password
    });
  }
};
