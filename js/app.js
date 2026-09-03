/**
 * واجهة بوابة جلب العالمية للتجارة
 */
const { useState, useEffect, useMemo } = React;

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('jalap_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [monthKey, setMonthKey] = useState('2026-08');
  const [availableMonths, setAvailableMonths] = useState(['2026-08']);
  const [monthStatus, setMonthStatus] = useState('open');
  const [archivedAt, setArchivedAt] = useState(null);

  const [activeTab, setActiveTab] = useState('summary');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRep, setSelectedRep] = useState(null);
  const [notification, setNotification] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  const [generalRules, setGeneralRules] = useState(CONFIG.DEFAULT_GENERAL_RULES);
  const [groupRules, setGroupRules] = useState([]);
  const [repsData, setRepsData] = useState([]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const formatNum = (num) => Math.round(num || 0).toLocaleString('en-US');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await AuthService.login(usernameInput, passwordInput);
      if (res && res.status === 'success') {
        setCurrentUser(res.user);
        localStorage.setItem('jalap_user_session', JSON.stringify(res.user));
        showToast(`مرحباً بك: ${res.user.fullName}`);
        loadData(res.user, monthKey);
      } else {
        showToast(`خطأ: ${res ? res.message : 'بيانات الدخول غير صحيحة'}`);
      }
    } catch(err) {
      showToast('تعذر الاتصال بقاعدة البيانات');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('jalap_user_session');
    setCurrentUser(null);
  };

  const loadData = async (user, targetMonth) => {
    setSyncLoading(true);
    const activeUser = user || currentUser;
    const m = targetMonth || monthKey;
    try {
      const mListRes = await ApiService.getAvailableMonths();
      if (mListRes && mListRes.months && mListRes.months.length > 0) {
        setAvailableMonths(mListRes.months);
      }

      const data = await ApiService.fetchWorkspace(activeUser.userId, m);
      if (data && data.status === 'success') {
        if (data.generalRules) setGeneralRules(data.generalRules);
        if (data.groupRules) setGroupRules(data.groupRules);
        if (data.reps) setRepsData(data.reps);
        setMonthStatus(data.monthStatus || 'open');
        setArchivedAt(data.archivedAt || null);
      }
    } catch (err) {
      showToast('تعذر استرجاع البيانات');
    }
    setSyncLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadData(currentUser, monthKey);
  }, [monthKey]);

  const handleSaveConfig = async () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return;
    setSyncLoading(true);
    try {
      const res = await ApiService.saveOfficialConfig(monthKey, { generalRules, reps: repsData }, currentUser);
      showToast(res.message || 'تم حفظ التعديلات بنجاح 💾');
      loadData(currentUser, monthKey);
    } catch(e) {
      showToast('خطأ أثناء الحفظ');
    }
    setSyncLoading(false);
  };

  const handleFreezeMonth = async () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return;
    if (!confirm(`هل أنت متأكد من تجميد شهر ${monthKey} في أرشيف جلب؟`)) return;
    setSyncLoading(true);
    try {
      const res = await ApiService.freezeAndArchiveMonth(monthKey, processedReps, generalRules, currentUser);
      showToast(res.message || 'تم تجميد الشهر بنجاح 🔒');
      loadData(currentUser, monthKey);
    } catch(e) {
      showToast('خطأ أثناء التجميد');
    }
    setSyncLoading(false);
  };

  const handleUnlockMonth = async () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return;
    if (!confirm(`هل تريد فك تجميد شهر ${monthKey}؟`)) return;
    setSyncLoading(true);
    try {
      const res = await ApiService.unlockMonth(monthKey, currentUser);
      showToast(res.message || 'تم فك التجميد');
      loadData(currentUser, monthKey);
    } catch(e) {
      showToast('تعذر فك التجميد');
    }
    setSyncLoading(false);
  };

  const processedReps = useMemo(() => {
    if (!Array.isArray(repsData)) return [];
    return repsData.map(rep => CalcEngine.processRepData(rep, generalRules, groupRules)).filter(Boolean);
  }, [repsData, generalRules, groupRules]);

  const companyTotals = useMemo(() => {
    return CalcEngine.calculateCompanyTotals(processedReps);
  }, [processedReps]);

  const departmentsList = useMemo(() => {
    const set = new Set();
    processedReps.forEach(r => { if (r.department) set.add(r.department); });
    return Array.from(set);
  }, [processedReps]);

  const visibleReps = useMemo(() => {
    let list = processedReps;
    if (selectedDepartment !== 'ALL') {
      list = list.filter(r => r.department === selectedDepartment);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(r => (r.name && r.name.toLowerCase().includes(q)) || (r.id && r.id.toString().includes(q)));
    }
    return list;
  }, [processedReps, selectedDepartment, searchTerm]);

  // شاشة تسجيل الدخول بشعار جلب العالمية
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full jalap-card rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="bg-white rounded-2xl p-4 inline-block shadow-md">
              <img src={CONFIG.LOGO_PATH} alt={CONFIG.COMPANY_NAME} className="h-16 mx-auto object-contain" />
            </div>
            <h1 className="text-xl font-black text-white">{CONFIG.COMPANY_NAME}</h1>
            <p className="text-xs text-slate-400">بوابة متابعة الأداء ومستهدفات المبيعات</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم المستخدم / رقم المندوب</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin / gm / 14"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#48a042] hover:bg-[#3d8c37] text-white font-black py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loginLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
              <span>تسجيل الدخول</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* الشريط العلوي مع الشعار */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md p-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl">
              <img src={CONFIG.LOGO_PATH} alt="Jalap Logo" className="h-9 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-black text-white">{CONFIG.COMPANY_NAME}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  monthStatus === 'archived' ? 'jalap-badge-green' : 'jalap-badge-blue'
                }`}>
                  <i className={`fa-solid ${monthStatus === 'archived' ? 'fa-lock' : 'fa-pen-to-square'} ml-1`}></i>
                  {monthStatus === 'archived' ? 'شهر مؤرشف ومجمد 🔒' : 'شهر مفتوح للتعديل ✍️'}
                </span>
                {archivedAt && (
                  <span className="text-[10px] text-slate-400 font-mono">تاريخ التجميد: {archivedAt}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                المستخدم: <b className="text-emerald-400">{currentUser.fullName}</b> | القسم: <b className="text-slate-200">{currentUser.department}</b> | الفرع: <b className="text-slate-200">{currentUser.branch}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <i className="fa-solid fa-calendar text-[#48a042]"></i>
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m} className="bg-slate-900">{m}</option>
                ))}
              </select>
            </div>

            {(currentUser.role === 'admin' || currentUser.role === 'manager') && monthStatus !== 'archived' && (
              <button
                onClick={() => ApiService.recalculateRawData(monthKey, currentUser).then(() => loadData(currentUser, monthKey))}
                disabled={syncLoading}
                className="bg-[#026cb5] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow"
              >
                <i className={`fa-solid fa-rotate ${syncLoading ? 'fa-spin' : ''}`}></i>
                <span>تجميع مبيعات الشهر</span>
              </button>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              monthStatus === 'archived' ? (
                <button onClick={handleUnlockMonth} disabled={syncLoading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-xl shadow">
                  <i className="fa-solid fa-lock-open ml-1"></i> فك تجميد الشهر
                </button>
              ) : (
                <button onClick={handleFreezeMonth} disabled={syncLoading} className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-3 py-1.5 rounded-xl shadow">
                  <i className="fa-solid fa-snowflake ml-1"></i> تجميد وأرشفة الشهر 🔒
                </button>
              )
            )}

            <button onClick={handleLogout} className="bg-rose-950/60 text-rose-300 border border-rose-800/40 px-3 py-1.5 rounded-xl hover:bg-rose-900">
              خروج
            </button>
          </div>
        </div>

        {currentUser.role !== 'rep' && (
          <div className="flex space-x-2 space-x-reverse mt-2 border-t border-slate-800 pt-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${activeTab === 'summary' ? 'bg-[#48a042] text-white font-black' : 'bg-slate-800 text-slate-300'}`}
            >
              <i className="fa-solid fa-table-list"></i> خلاصة المناديب والعمولات
            </button>
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${activeTab === 'rules' ? 'bg-[#026cb5] text-white font-black' : 'bg-slate-800 text-slate-300'}`}
              >
                <i className="fa-solid fa-sliders"></i> ضبط شروط وقواعد الشهر
              </button>
            )}
          </div>
        )}
      </header>

      {/* التنبيهات */}
      {notification && (
        <div className="fixed bottom-5 left-5 z-50 bg-[#48a042] text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs animate-bounce">
          {notification}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* كروت الإجماليات التنفيذية */}
        {currentUser.role !== 'rep' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 font-mono">
            <div className="jalap-card p-3.5 rounded-2xl">
              <span className="text-slate-400 text-xs block mb-1 font-sans">المبيعات العامة</span>
              <span className="text-base font-extrabold text-white">{formatNum(companyTotals.genSales)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">المستهدف: {formatNum(companyTotals.genTarget)}</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl">
              <span className="text-slate-400 text-xs block mb-1 font-sans">نسبة الإنجاز</span>
              <span className={`text-base font-extrabold ${companyTotals.overallGenPct >= generalRules.generalThresholdPct ? 'text-emerald-400' : 'text-amber-400'}`}>
                {companyTotals.overallGenPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">المتبقي: {formatNum(companyTotals.remainingGenSalesTotal)}</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl">
              <span className="text-slate-400 text-xs block mb-1 font-sans">عمولات المجموعات</span>
              <span className="text-base font-extrabold text-teal-300">{formatNum(companyTotals.groupCommSum)} ر.س</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">{companyTotals.qualifiedCount} مؤهلين</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl">
              <span className="text-slate-400 text-xs block mb-1 font-sans">عمولة الهدف العام</span>
              <span className="text-base font-extrabold text-amber-300">{formatNum(companyTotals.genTargetCommSum)} ر.س</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">شرط {generalRules.generalThresholdPct}%</span>
            </div>
            <div className="jalap-card border border-emerald-500/40 bg-emerald-950/20 p-3.5 rounded-2xl col-span-2 md:col-span-1">
              <span className="text-emerald-300 text-xs font-bold mb-1 font-sans">إجمالي العمولات المستحقة</span>
              <span className="text-lg font-black text-emerald-400">{formatNum(companyTotals.grandComm)} ر.س</span>
            </div>
          </div>
        )}

        {/* TAB: جدول أداء المناديب */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-3 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="ابحث بالمندوب أو الرقم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                {currentUser.role !== 'rep' && (
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="ALL">كافة الأقسام</option>
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {(currentUser.role === 'admin' || currentUser.role === 'manager') && monthStatus !== 'archived' && (
                <button
                  onClick={handleSaveConfig}
                  disabled={syncLoading}
                  className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <i className="fa-solid fa-floppy-disk text-amber-300"></i>
                  <span>حفظ الأهداف المدخلة 💾</span>
                </button>
              )}
            </div>

            <div className="jalap-card rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">اسم المندوب</th>
                      <th className="py-3 px-3">القسم / الفرع</th>
                      <th className="py-3 px-3">الهدف العام</th>
                      <th className="py-3 px-3">صافي المبيعات</th>
                      <th className="py-3 px-3">نسبة الإنجاز</th>
                      <th className="py-3 px-3 text-center">المجموعات المحققة</th>
                      <th className="py-3 px-3 text-teal-300">عمولة المجموعات</th>
                      <th className="py-3 px-3 text-amber-300">عمولة الهدف العام</th>
                      <th className="py-3 px-3 text-emerald-400 font-bold">إجمالي العمولة</th>
                      <th className="py-3 px-3">حالة الاستحقاق</th>
                      <th className="py-3 px-3 text-center">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {visibleReps.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-400">{rep.id}</td>
                        <td className="py-3 px-3 font-sans font-bold text-white">{rep.name}</td>
                        <td className="py-3 px-3 font-sans text-[11px] text-slate-400">{rep.department} - {rep.branch}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            disabled={currentUser.role !== 'admin' && currentUser.role !== 'manager' || monthStatus === 'archived'}
                            value={rep.genTarget}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setRepsData(prev => prev.map(r => r.id === rep.id ? { ...r, generalTarget: val } : r));
                            }}
                            className="w-24 bg-slate-950 border border-slate-800 rounded p-1 text-center text-emerald-400 font-bold disabled:opacity-70"
                          />
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{formatNum(rep.genSales)}</td>
                        <td className="py-3 px-3">
                          <span className={`font-bold ${rep.passGate_GenTarget ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {rep.genPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rep.isGroupsGateQualified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {rep.qualifiedGroupsCount} / {rep.assignedGroupsCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-teal-300 font-bold">{formatNum(rep.totalGroupCommissionEarned)} ر.س</td>
                        <td className="py-3 px-3 text-amber-300 font-bold">{formatNum(rep.generalTargetCommEarned)} ر.س</td>
                        <td className="py-3 px-3 bg-emerald-950/30 font-black text-emerald-400">
                          {formatNum(rep.grandTotalCommission)} ر.س
                        </td>
                        <td className="py-3 px-3 font-sans text-[11px]">
                          <span className={rep.isGroupsGateQualified ? 'text-emerald-400 font-bold' : 'text-rose-300'}>
                            {rep.eligibilityStatusText}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <button
                            onClick={() => setSelectedRep(rep)}
                            className="bg-slate-800 hover:bg-[#48a042] hover:text-white text-slate-200 px-3 py-1 rounded-lg text-xs font-bold transition"
                          >
                            التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ضبط القواعد */}
        {activeTab === 'rules' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <div className="jalap-card p-6 rounded-3xl space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-sliders text-[#48a042]"></i> ضبط شروط وبوابات شهر {monthKey}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">نسبة شرط الهدف العام (%)</label>
                <input
                  type="number"
                  disabled={monthStatus === 'archived'}
                  value={generalRules.generalThresholdPct ?? 80}
                  onChange={(e) => setGeneralRules({ ...generalRules, generalThresholdPct: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">قيمة عمولة الهدف العام (ر.س)</label>
                <input
                  type="number"
                  disabled={monthStatus === 'archived'}
                  value={generalRules.generalTargetCommValue ?? 0}
                  onChange={(e) => setGeneralRules({ ...generalRules, generalTargetCommValue: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center text-amber-300 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">أدنى عدد مجموعات مطلوبة للعمولة</label>
                <input
                  type="number"
                  disabled={monthStatus === 'archived'}
                  value={generalRules.minGroupsRequired ?? 7}
                  onChange={(e) => setGeneralRules({ ...generalRules, minGroupsRequired: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center text-teal-300 font-bold"
                />
              </div>
            </div>
            {monthStatus !== 'archived' && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow"
                >
                  <i className="fa-solid fa-floppy-disk"></i> حفظ الشروط رسمياً لشهر {monthKey}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* نافذة تفاصيل المجموعات للمندوب */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                تفاصيل أداء مندوب جلب: <b className="text-[#48a042]">{selectedRep.name}</b> (#{selectedRep.id})
              </h3>
              <button onClick={() => setSelectedRep(null)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right text-slate-200">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 font-bold">
                  <tr>
                    <th className="p-2.5">المجموعة</th>
                    <th className="p-2.5">الهدف</th>
                    <th className="p-2.5">المبيعات</th>
                    <th className="p-2.5">النسبة</th>
                    <th className="p-2.5">المتبقي للشرط</th>
                    <th className="p-2.5 text-center">الحالة</th>
                    <th className="p-2.5">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {(selectedRep.detailedGroups || []).map((grp, idx) => (
                    <tr key={idx} className={grp.isQualified ? 'bg-emerald-950/20' : ''}>
                      <td className="p-2.5 font-sans font-bold text-white">{grp.name}</td>
                      <td className="p-2.5">{formatNum(grp.target)}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{formatNum(grp.sales)}</td>
                      <td className="p-2.5">{grp.grpPct.toFixed(1)}%</td>
                      <td className="p-2.5 font-sans">
                        {grp.remainingToThreshold > 0 ? (
                          <span className="text-rose-400">{formatNum(grp.remainingToThreshold)}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">محققة ✅</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        {grp.isQualified ? <span className="text-emerald-400 font-bold">محققة</span> : <span className="text-slate-500">غير محققة</span>}
                      </td>
                      <td className="p-2.5 text-teal-300 font-bold">{formatNum(grp.commEarned)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedRep(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);