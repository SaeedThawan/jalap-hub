/**
 * تطبيق بوابة جلب العالمية - كود الواجهة المتكامل والنهائي v40.0
 * إصلاح خطأ نافذة التفاصيل وعرض الإجماليات بدقة
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
      if (mListRes && mListRes.months && mListRes.months.length > 0) setAvailableMonths(mListRes.months);

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

  useEffect(() => { if (currentUser) loadData(currentUser, monthKey); }, [monthKey]);

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
    } catch(e) { showToast('خطأ أثناء التجميد'); }
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
    } catch(e) { showToast('تعذر فك التجميد'); }
    setSyncLoading(false);
  };

  const processedReps = useMemo(() => {
    if (!Array.isArray(repsData)) return [];
    return repsData.map(rep => CalcEngine.processRepData(rep, generalRules, groupRules)).filter(Boolean);
  }, [repsData, generalRules, groupRules]);

  const companyTotals = useMemo(() => CalcEngine.calculateCompanyTotals(processedReps), [processedReps]);

  const departmentsList = useMemo(() => {
    const set = new Set();
    processedReps.forEach(r => { if (r.department) set.add(r.department); });
    return Array.from(set);
  }, [processedReps]);

  const visibleReps = useMemo(() => {
    let list = processedReps.filter(r => {
      const role = String(r.role || '').toLowerCase();
      const name = String(r.name || '');
      const isManagement = r.id === 2 || r.id === 2011 || role === 'admin' || role === 'manager' || role === 'supervisor' || role === 'branch_supervisor' || name.includes('المدير العام') || name.includes('Saeed');
      return !isManagement;
    });

    if (selectedDepartment !== 'ALL') list = list.filter(r => r.department === selectedDepartment);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(r => (r.name && r.name.toLowerCase().includes(q)) || (r.id && r.id.toString().includes(q)));
    }
    return list;
  }, [processedReps, selectedDepartment, searchTerm]);

  // فرز المجموعات: المحققة أولاً، ثم المكلفة غير المحققة، ثم غير المكلفة
  const sortedModalGroups = useMemo(() => {
    if (!selectedRep || !selectedRep.detailedGroups) return [];
    return [...selectedRep.detailedGroups].sort((a, b) => {
      if (a.isQualified && !b.isQualified) return -1;
      if (!a.isQualified && b.isQualified) return 1;
      if (a.isAssigned && !b.isAssigned) return -1;
      if (!a.isAssigned && b.isAssigned) return 1;
      return (b.grpPct || 0) - (a.grpPct || 0);
    });
  }, [selectedRep]);

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
                type="text" required value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin / 14"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">كلمة المرور</label>
              <input
                type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
              />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full bg-[#48a042] hover:bg-[#3d8c37] text-white font-black py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
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
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md p-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl"><img src={CONFIG.LOGO_PATH} alt="Jalap Logo" className="h-9 object-contain" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-black text-white">{CONFIG.COMPANY_NAME}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${monthStatus === 'archived' ? 'jalap-badge-green' : 'jalap-badge-blue'}`}>
                  <i className={`fa-solid ${monthStatus === 'archived' ? 'fa-lock' : 'fa-pen-to-square'} ml-1`}></i>
                  {monthStatus === 'archived' ? 'شهر مؤرشف ومجمد 🔒' : 'شهر مفتوح للتعديل ✍️'}
                </span>
                {archivedAt && <span className="text-[10px] text-slate-400 font-mono">تاريخ التجميد: {archivedAt}</span>}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">المستخدم: <b className="text-emerald-400">{currentUser.fullName}</b> | القسم: <b className="text-slate-200">{currentUser.department}</b> | الفرع: <b className="text-slate-200">{currentUser.branch}</b></p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-xl">
              <i className="fa-solid fa-calendar text-[#48a042]"></i>
              <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer">
                {availableMonths.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
              </select>
            </div>

            {(currentUser.role === 'admin' || currentUser.role === 'manager') && monthStatus !== 'archived' && (
              <button onClick={() => ApiService.recalculateRawData(monthKey, currentUser).then(() => loadData(currentUser, monthKey))} disabled={syncLoading} className="bg-[#026cb5] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow">
                <i className={`fa-solid fa-rotate ${syncLoading ? 'fa-spin' : ''}`}></i>
                <span>تجميع مبيعات الشهر</span>
              </button>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              monthStatus === 'archived' ? (
                <button onClick={handleUnlockMonth} disabled={syncLoading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-xl shadow"><i className="fa-solid fa-lock-open ml-1"></i> فك تجميد الشهر</button>
              ) : (
                <button onClick={handleFreezeMonth} disabled={syncLoading} className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-3 py-1.5 rounded-xl shadow"><i className="fa-solid fa-snowflake ml-1"></i> تجميد وأرشفة الشهر 🔒</button>
              )
            )}
            <button onClick={handleLogout} className="bg-rose-950/60 text-rose-300 border border-rose-800/40 px-3 py-1.5 rounded-xl hover:bg-rose-900">خروج</button>
          </div>
        </div>

        {currentUser.role !== 'rep' && (
          <div className="flex space-x-2 space-x-reverse mt-2 border-t border-slate-800 pt-2 overflow-x-auto text-xs">
            <button onClick={() => setActiveTab('summary')} className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${activeTab === 'summary' ? 'bg-[#48a042] text-white font-black' : 'bg-slate-800 text-slate-300'}`}>
              <i className="fa-solid fa-table-list"></i> خلاصة المناديب والعمولات
            </button>
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <button onClick={() => setActiveTab('rules')} className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${activeTab === 'rules' ? 'bg-[#026cb5] text-white font-black' : 'bg-slate-800 text-slate-300'}`}>
                <i className="fa-solid fa-sliders"></i> ضبط شروط وقواعد الشهر
              </button>
            )}
          </div>
        )}
      </header>

      {notification && <div className="fixed bottom-5 left-5 z-50 bg-[#48a042] text-white px-4 py-2.5 rounded-2xl shadow-2xl font-bold text-xs animate-bounce">{notification}</div>}

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* كروت الإجماليات التنفيذية - منسقة باتجاه LTR لمنع اختفاء الأرقام والعملة */}
        {currentUser.role !== 'rep' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 font-mono">
            <div className="jalap-card p-3.5 rounded-2xl text-right">
              <span className="text-slate-400 text-xs block mb-1 font-sans">المبيعات العامة</span>
              <span className="text-base font-extrabold text-white block">{formatNum(companyTotals.genSales)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">المستهدف: {formatNum(companyTotals.genTarget)}</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl text-right">
              <span className="text-slate-400 text-xs block mb-1 font-sans">نسبة الإنجاز</span>
              <span className={`text-base font-extrabold block ${companyTotals.overallGenPct >= generalRules.generalThresholdPct ? 'text-emerald-400' : 'text-amber-400'}`}>
                {companyTotals.overallGenPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">المتبقي: {formatNum(companyTotals.remainingGenSalesTotal)}</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl text-right">
              <span className="text-slate-400 text-xs block mb-1 font-sans">عمولات المجموعات</span>
              <span className="text-base font-extrabold text-teal-300 block" dir="ltr">{formatNum(companyTotals.groupCommSum)} SAR</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">{companyTotals.qualifiedCount} مؤهلين</span>
            </div>
            <div className="jalap-card p-3.5 rounded-2xl text-right">
              <span className="text-slate-400 text-xs block mb-1 font-sans">عمولة الهدف العام</span>
              <span className="text-base font-extrabold text-amber-300 block" dir="ltr">{formatNum(companyTotals.genTargetCommSum)} SAR</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">شرط {generalRules.generalThresholdPct}%</span>
            </div>
            <div className="jalap-card border border-emerald-500/40 bg-emerald-950/20 p-3.5 rounded-2xl col-span-2 md:col-span-1 text-right">
              <span className="text-emerald-300 text-xs font-bold mb-1 font-sans block">إجمالي العمولات المستحقة</span>
              <span className="text-lg font-black text-emerald-400 block" dir="ltr">{formatNum(companyTotals.grandComm)} SAR</span>
            </div>
          </div>
        )}

        {/* شريط التحقق والمطابقة المالية الرقابي */}
        {currentUser.role !== 'rep' && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-md">
            <div className="flex items-center gap-2 font-sans">
              <i className="fa-solid fa-scale-balanced text-[#48a042] text-base"></i>
              <div>
                <span className="font-bold text-white block">المطابقة والتحقق الرقابي للمبيعات:</span>
                <span className="text-[11px] text-slate-400">مقارنة صافي مبيعات الفواتير مع مجموع مبيعات المجموعات</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-right">
                <span className="text-slate-400 text-[10px] block font-sans">داخل المجموعات الـ 14:</span>
                <b className="text-emerald-400 text-sm block" dir="ltr">{formatNum(companyTotals.repGroupsSalesTotal)} SAR</b>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-right">
                <span className="text-slate-400 text-[10px] block font-sans">أصناف خارج المجموعات:</span>
                <b className={`text-sm block ${companyTotals.unmappedSalesTotal > 0 ? 'text-amber-400' : 'text-slate-400'}`} dir="ltr">
                  {formatNum(companyTotals.unmappedSalesTotal)} SAR
                </b>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-right">
                <span className="text-slate-400 text-[10px] block font-sans">نسبة التغطية والمطابقة:</span>
                <b className={`text-sm block ${companyTotals.coveragePct >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {companyTotals.coveragePct.toFixed(1)}%
                </b>
              </div>
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
                  <input type="text" placeholder="ابحث بالمندوب أو الرقم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-green-500" />
                </div>
                {currentUser.role !== 'rep' && (
                  <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none">
                    <option value="ALL">كافة الأقسام</option>
                    {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
              {(currentUser.role === 'admin' || currentUser.role === 'manager') && monthStatus !== 'archived' && (
                <button onClick={handleSaveConfig} disabled={syncLoading} className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow">
                  <i className="fa-solid fa-floppy-disk text-amber-300"></i><span>حفظ الأهداف المدخلة 💾</span>
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
                          <input type="number" disabled={currentUser.role !== 'admin' && currentUser.role !== 'manager' || monthStatus === 'archived'} value={rep.genTarget} onChange={(e) => { const val = e.target.value === '' ? '' : Number(e.target.value); setRepsData(prev => prev.map(r => r.id === rep.id ? { ...r, generalTarget: val } : r)); }} className="w-24 bg-slate-950 border border-slate-800 rounded p-1 text-center text-emerald-400 font-bold disabled:opacity-70" />
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{formatNum(rep.genSales)}</td>
                        <td className="py-3 px-3"><span className={`font-bold ${rep.passGate_GenTarget ? 'text-emerald-400' : 'text-rose-400'}`}>{rep.genPct.toFixed(1)}%</span></td>
                        <td className="py-3 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rep.isGroupsGateQualified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>{rep.qualifiedGroupsCount} / {rep.assignedGroupsCount}</span></td>
                        <td className="py-3 px-3 text-teal-300 font-bold" dir="ltr">{formatNum(rep.totalGroupCommissionEarned)} SAR</td>
                        <td className="py-3 px-3 text-amber-300 font-bold" dir="ltr">{formatNum(rep.generalTargetCommEarned)} SAR</td>
                        <td className="py-3 px-3 bg-emerald-950/30 font-black text-emerald-400" dir="ltr">
                          {formatNum(rep.grandTotalCommission)} SAR
                        </td>
                        <td className="py-3 px-3 font-sans text-[11px]">
                          <span className={rep.isGroupsGateQualified ? 'text-emerald-400 font-bold' : 'text-rose-300'}>
                            {rep.eligibilityStatusText}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <button onClick={() => setSelectedRep(rep)} className="bg-slate-800 hover:bg-[#48a042] hover:text-white text-slate-200 px-3 py-1 rounded-lg text-xs font-bold transition">
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

        {/* TAB: ضبط القواعد الرسمية */}
        {activeTab === 'rules' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
          <div className="jalap-card p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2"><i className="fa-solid fa-sliders text-[#48a042]"></i> ضبط شروط وبوابات شهر {monthKey}</h2>
                <p className="text-xs text-slate-400 mt-1">تحديد نسب التأهل، عمولة الهدف، وتفعيل المجموعات الإلزامية</p>
              </div>
              {monthStatus !== 'archived' && (
                <button onClick={handleSaveConfig} className="bg-[#48a042] hover:bg-[#3d8c37] text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"><i className="fa-solid fa-floppy-disk text-amber-300"></i><span>حفظ وتثبيت الشروط لشهر {monthKey} 💾</span></button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="text-slate-400 block mb-1.5 font-bold">نسبة شرط الهدف العام (%)</label>
                <input type="number" disabled={monthStatus === 'archived'} value={generalRules.generalThresholdPct ?? 80} onChange={(e) => setGeneralRules({ ...generalRules, generalThresholdPct: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center text-emerald-400 font-bold font-mono" />
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="text-slate-400 block mb-1.5 font-bold">عمولة الهدف العام (ر.س)</label>
                <input type="number" disabled={monthStatus === 'archived'} value={generalRules.generalTargetCommValue ?? 0} onChange={(e) => setGeneralRules({ ...generalRules, generalTargetCommValue: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center text-amber-300 font-bold font-mono" />
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="text-slate-400 block mb-1.5 font-bold">أدنى عدد مجموعات مطلوبة للعمولة</label>
                <input type="number" disabled={monthStatus === 'archived'} value={generalRules.minGroupsRequired ?? 7} onChange={(e) => setGeneralRules({ ...generalRules, minGroupsRequired: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center text-teal-300 font-bold font-mono" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2"><i className="fa-solid fa-boxes-stacked text-[#48a042]"></i> شروط وعمولات المجموعات الـ 14:</h3>
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-xs text-right text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr><th className="p-3">#</th><th className="p-3">اسم المجموعة</th><th className="p-3">القسم</th><th className="p-3 text-center">إلزامية؟ ⚠️</th><th className="p-3">نسبة الشرط (%)</th><th className="p-3">قيمة العمولة (ر.س)</th><th className="p-3 text-center">مفعلة ✅</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono bg-slate-900/50">
                    {(groupRules || []).map((grp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-500 font-sans">{idx + 1}</td>
                        <td className="p-3 font-sans font-bold text-white">{grp.name}</td>
                        <td className="p-3 font-sans text-slate-400 text-[11px]">{grp.department || 'عام'}</td>
                        <td className="p-3 text-center"><input type="checkbox" disabled={monthStatus === 'archived'} checked={grp.isMandatory === true} onChange={(e) => { const updated = [...groupRules]; updated[idx] = { ...updated[idx], isMandatory: e.target.checked }; setGroupRules(updated); }} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" /></td>
                        <td className="p-3"><input type="number" disabled={monthStatus === 'archived'} value={grp.thresholdPct ?? 70} onChange={(e) => { const updated = [...groupRules]; updated[idx] = { ...updated[idx], thresholdPct: Number(e.target.value) }; setGroupRules(updated); }} className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center text-teal-300 font-bold" /></td>
                        <td className="p-3"><input type="number" disabled={monthStatus === 'archived'} value={grp.commValue ?? 250} onChange={(e) => { const updated = [...groupRules]; updated[idx] = { ...updated[idx], commValue: Number(e.target.value) }; setGroupRules(updated); }} className="w-24 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center text-emerald-400 font-bold" /></td>
                        <td className="p-3 text-center"><input type="checkbox" disabled={monthStatus === 'archived'} checked={grp.isActive !== false} onChange={(e) => { const updated = [...groupRules]; updated[idx] = { ...updated[idx], isActive: e.target.checked }; setGroupRules(updated); }} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* نافذة التفاصيل المصححة والآمنة 100% */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 font-sans text-right max-h-[95vh] flex flex-col">
            
            {/* الترويسة */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-check text-[#48a042]"></i>
                  تقرير تفصيلي: <span className="text-[#48a042]">{selectedRep.name}</span> (#{selectedRep.id})
                </h3>
                <span className="text-xs text-slate-400 font-mono mt-0.5 block">القسم: {selectedRep.department} | الفرع: {selectedRep.branch}</span>
              </div>
              <button onClick={() => setSelectedRep(null)} className="text-slate-400 hover:text-rose-400 transition text-xl p-1">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* بطاقات المؤشرات العلوية */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
                <span className="text-slate-400 block text-[11px] font-sans">الهدف العام / المبيعات</span>
                <b className="text-white text-sm">{formatNum(selectedRep.genSales)}</b>
                <span className="text-slate-500 text-[10px] block">من أصل {formatNum(selectedRep.genTarget)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
                <span className="text-slate-400 block text-[11px] font-sans">نسبة الهدف العام</span>
                <b className={`text-sm ${selectedRep.passGate_GenTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedRep.genPct.toFixed(1)}%
                </b>
                <span className="text-slate-500 text-[10px] block">
                  {selectedRep.passGate_GenTarget ? 'محققة بنجاح ✅' : `باقي ${formatNum(selectedRep.remainingGenSales)} ر.س`}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
                <span className="text-slate-400 block text-[11px] font-sans">المجموعات المحققة</span>
                <b className={`text-sm ${selectedRep.isGroupsGateQualified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedRep.qualifiedGroupsCount} / {selectedRep.minGroupsReq} مطلوب
                </b>
                <span className="text-slate-500 text-[10px] block">مكلف بـ {selectedRep.assignedGroupsCount} مجموعة</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-2.5 rounded-2xl">
                <span className="text-emerald-300 block text-[11px] font-sans font-bold">العمولة المستحقة</span>
                <b className="text-emerald-400 text-base block" dir="ltr">{formatNum(selectedRep.grandTotalCommission)} SAR</b>
                <span className="text-slate-400 text-[10px] block font-sans">{selectedRep.isGroupsGateQualified ? 'مؤهلة للصرف 🎯' : 'محجوبة ⚠️'}</span>
              </div>
            </div>

            {/* شريط سبب الحجب أو الاستحقاق */}
            <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
              selectedRep.isGroupsGateQualified ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
            }`}>
              <i className={`fa-solid ${selectedRep.isGroupsGateQualified ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-rose-400'}`}></i>
              <span>{selectedRep.eligibilityStatusText}</span>
            </div>

            {/* جدول المجموعات المرتب والمصحح */}
            <div className="overflow-x-auto flex-1 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-xs text-right text-slate-200">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 font-bold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">المجموعة</th>
                    <th className="p-2.5">الهدف</th>
                    <th className="p-2.5">المبيعات</th>
                    <th className="p-2.5">نسبة الإنجاز</th>
                    <th className="p-2.5">شرط التأهل</th>
                    <th className="p-2.5">المتبقي للشرط</th>
                    <th className="p-2.5 text-center">الحالة</th>
                    <th className="p-2.5 text-left">العمولة المستحقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sortedModalGroups.map((grp, idx) => (
                    <tr key={idx} className={
                      grp.isQualified ? 'bg-emerald-950/20 hover:bg-emerald-900/30' : 
                      grp.isAssigned ? 'hover:bg-slate-800/40' : 'opacity-40 bg-slate-950/30'
                    }>
                      <td className="p-2.5 font-sans font-bold text-white flex items-center gap-1.5">
                        {grp.isQualified && <i className="fa-solid fa-check text-emerald-400 text-[10px]"></i>}
                        <span>{grp.name}</span>
                        {grp.isMandatory && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">إلزامي</span>}
                      </td>
                      <td className="p-2.5 text-slate-300">{formatNum(grp.target)}</td>
                      <td className="p-2.5 font-bold text-white">{formatNum(grp.sales)}</td>
                      <td className="p-2.5">
                        <span className={`font-bold ${grp.isQualified ? 'text-emerald-400' : (grp.grpPct > 0 ? 'text-amber-400' : 'text-slate-500')}`}>
                          {grp.isAssigned ? `${grp.grpPct.toFixed(1)}%` : '-'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 font-sans text-[11px]">{grp.thresholdPct}%</td>
                      <td className="p-2.5 font-sans">
                        {!grp.isAssigned ? (
                          <span className="text-slate-600">-</span>
                        ) : grp.isQualified ? (
                          <span className="text-emerald-400 font-bold">محققة ✅</span>
                        ) : (
                          <span className="text-rose-400 font-bold">{formatNum(grp.remainingToThreshold)} ر.س</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        {!grp.isAssigned ? (
                          <span className="text-slate-600 text-[10px]">غير مكلف</span>
                        ) : grp.isQualified ? (
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">محققة</span>
                        ) : (
                          <span className="bg-rose-950 text-rose-400 px-2 py-0.5 rounded-full text-[10px]">غير محققة</span>
                        )}
                      </td>
                      <td className="p-2.5 text-left font-bold font-mono">
                        <span className={grp.commEarned > 0 ? 'text-teal-300 text-sm' : 'text-slate-500'} dir="ltr">
                          {formatNum(grp.commEarned)} SAR
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 text-slate-200 font-bold border-t border-slate-700 font-mono text-xs">
                  <tr>
                    <td className="p-2.5 font-sans">إجمالي المجموعات:</td>
                    <td className="p-2.5">{formatNum(sortedModalGroups.reduce((s, g) => s + (g.target || 0), 0))}</td>
                    <td className="p-2.5 text-emerald-400">{formatNum(selectedRep.repGroupsSalesTotal)}</td>
                    <td colSpan="4" className="p-2.5 text-center text-slate-400 font-sans">
                      أصناف خارج المجموعات: <b className="text-amber-400" dir="ltr">{formatNum(selectedRep.unmappedSales)} SAR</b>
                    </td>
                    <td className="p-2.5 text-left text-teal-300 font-black text-sm" dir="ltr">
                      {formatNum(selectedRep.totalGroupCommissionEarned)} SAR
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* الإغلاق */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-500 font-sans">تم فرز المجموعات المحققة في الأعلى لتسهيل المراجعة</span>
              <button
                onClick={() => setSelectedRep(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-xl text-xs transition"
              >
                إغلاق النافذة
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
