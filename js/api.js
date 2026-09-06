/**
 * محرك الاتصال بالسيرفر - ApiService المباشر
 */
const JALAP_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbw1DTvmz2e-eoKP-FxRD0I-742FwPFi6Fk3ag201fw4QWC3Sodq63R4O07fGY92T7Yi/exec';

const ApiService = {
  getUrl() {
    return JALAP_BACKEND_URL;
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
