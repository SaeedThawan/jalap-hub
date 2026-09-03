/**
 * طبقة الاتصال بقاعدة البيانات السحابية (API Layer) v2.0
 */
const ApiService = {
  // جلب مساحة العمل للشهر المحدد وفق المعرف
  async fetchWorkspace(userId, monthKey) {
    const url = `${CONFIG.API_URL}?action=getWorkspace&userId=${userId || ''}&monthKey=${monthKey}`;
    const res = await fetch(url);
    return await res.json();
  },

  // جلب قائمة الشهور المسجلة والمؤرشفة
  async getAvailableMonths() {
    const url = `${CONFIG.API_URL}?action=getAvailableMonths`;
    const res = await fetch(url);
    return await res.json();
  },

  // إعادة تجميع الفواتير من شيت المبيعات الخام لشهر محدد
  async recalculateRawData(monthKey, userContext) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'recalculateRawSales',
        monthKey,
        userContext
      })
    });
    return await res.json();
  },

  // حفظ الأهداف والقواعد يدوياً
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

  // تجميد وحفظ عمولات وأداء الشهر في الأرشيف الدائم
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

  // فك تجميد الشهر لتمكين التعديل مجدداً
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