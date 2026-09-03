{/* Modal: تفاصيل المجموعات النشطة للمندوب آلياً */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>المبيعات والمجموعات المحققة للمندوب:</span>
                  <b className="text-[#48a042] text-base">{selectedRep.name}</b>
                  <span className="text-slate-400 font-mono">(#{selectedRep.id})</span>
                  <span className="bg-slate-800 text-teal-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-700">
                    قسم {selectedRep.department}
                  </span>
                </h3>
              </div>
              <button onClick={() => setSelectedRep(null)} className="text-slate-400 hover:text-white text-lg">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right text-slate-200">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">المجموعة</th>
                    <th className="p-2.5">تصنيفها</th>
                    <th className="p-2.5">الهدف</th>
                    <th className="p-2.5">صافي المبيعات</th>
                    <th className="p-2.5">نسبة الإنجاز</th>
                    <th className="p-2.5">حالة التكليف والتأهل</th>
                    <th className="p-2.5 text-teal-300">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {(selectedRep.detailedGroups || []).length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-slate-500 font-sans">
                        لا توجد مبيعات مسجلة لهذا المندوب في مجموعات هذا الشهر
                      </td>
                    </tr>
                  ) : (
                    selectedRep.detailedGroups.map((grp, idx) => (
                      <tr key={idx} className={grp.isQualified ? 'bg-emerald-950/25' : ''}>
                        <td className="p-2.5 font-sans font-bold text-white">{grp.name}</td>
                        <td className="p-2.5 font-sans text-slate-400 text-[11px]">{grp.department}</td>
                        <td className="p-2.5">{formatNum(grp.target)}</td>
                        <td className="p-2.5 font-bold text-emerald-400">{formatNum(grp.sales)}</td>
                        <td className="p-2.5">
                          {grp.isAssigned ? (
                            <span className={`font-bold ${grp.isQualified ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {grp.grpPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-blue-400 font-sans text-[11px]">مبيعات إضافية</span>
                          )}
                        </td>
                        <td className="p-2.5 font-sans">
                          {!grp.isAssigned ? (
                            <span className="bg-blue-950/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded text-[10px]">بيع عابر (بدون هدف)</span>
                          ) : grp.isQualified ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">مؤهلة للعمولة ✅</span>
                          ) : (
                            <span className="bg-rose-950/60 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded text-[10px]">
                              باقي: {formatNum(grp.remainingToThreshold)}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-teal-300 font-bold">{formatNum(grp.commEarned)} ر.س</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">
                المجموعات المكلف بها: <b className="text-white">{selectedRep.assignedGroupsCount}</b> | المجموعات المحققة: <b className="text-emerald-400">{selectedRep.qualifiedGroupsCount}</b>
              </span>
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
