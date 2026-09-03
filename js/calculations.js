/**
 * محرك احتساب الأداء والفلترة الذكية التلقائية للمجموعات النشطة v3.0
 */
const CalcEngine = {
  processRepData(rep, generalRules, groupRules) {
    if (!rep) return null;

    const isRepActive = rep.isActive !== false;
    const gRules = generalRules || CONFIG.DEFAULT_GENERAL_RULES;
    const grpRulesList = Array.isArray(groupRules) ? groupRules : [];

    // 1. تقييم الهدف العام للمندوب
    const genTarget = Number(rep.generalTarget || rep.genTarget || 0);
    const genSales = Number(rep.generalSales || rep.genSales || 0);
    const genPct = genTarget > 0 ? (genSales / genTarget) * 100 : 0;
    
    const isGenTargetMandatory = gRules.isGenTargetMandatory !== false;
    const genThresholdPct = Number(gRules.generalThresholdPct ?? 80);
    const passGate_GenTarget = genTarget > 0 ? (genPct >= genThresholdPct) : false;
    const remainingGenSales = genTarget > 0 ? Math.max(0, (genTarget * (genThresholdPct / 100)) - genSales) : 0;

    // 2. فحص وتقييم المجموعات
    let assignedGroupsCount = 0;
    let qualifiedGroupsCount = 0;
    let rawGroupCommSum = 0;
    const repGroups = Array.isArray(rep.groups) ? rep.groups : [];

    // معالجة كافة المجموعات
    const processedGroups = grpRulesList.map((rule, gIdx) => {
      const repGrp = repGroups.find(rg => rg.name === rule.name || rg.id === rule.id) || repGroups[gIdx] || { target: 0, sales: 0, customComm: null };
      const isGroupActive = rule.isActive !== false;
      const isGroupMandatory = rule.isMandatory === true;

      const grpTarget = Number(repGrp.target || 0);
      const grpSales = Number(repGrp.sales || 0);
      const isAssigned = grpTarget > 0;
      const hasSales = grpSales > 0;

      const grpPct = isAssigned ? (grpSales / grpTarget) * 100 : 0;
      const thresholdPct = Number(rule.thresholdPct ?? 70);
      const thresholdTargetSales = grpTarget * (thresholdPct / 100);
      const remainingToThreshold = isAssigned ? Math.max(0, thresholdTargetSales - grpSales) : 0;

      // التأهل: إذا كان مكلفاً وتجاوز 70%
      const isQualified = isGroupActive && isAssigned && (grpPct >= thresholdPct);

      if (isAssigned) assignedGroupsCount++;
      if (isQualified) qualifiedGroupsCount++;

      const effectiveCommVal = (repGrp.customComm !== undefined && repGrp.customComm !== null && repGrp.customComm !== '')
        ? Number(repGrp.customComm)
        : Number(rule.commValue || 0);

      let potentialComm = 0;
      if (isQualified) {
        potentialComm = rule.commType === 'percent' ? (grpSales * (effectiveCommVal / 100)) : effectiveCommVal;
      }

      if (isGroupActive) {
        rawGroupCommSum += potentialComm;
      }

      return {
        id: rule.id ?? gIdx,
        originalIndex: gIdx,
        name: rule.name,
        department: rule.department || 'عام',
        target: grpTarget,
        sales: grpSales,
        customComm: repGrp.customComm,
        isAssigned,
        hasSales,
        // تظهر المجموعة إذا كان لها هدف أو لها مبيعات فعلية
        isVisibleForRep: isAssigned || hasSales,
        isActive: isGroupActive,
        isMandatory: isGroupMandatory,
        thresholdPct,
        commType: rule.commType || 'fixed',
        effectiveCommVal,
        grpPct,
        isQualified,
        thresholdTargetSales,
        remainingToThreshold,
        potentialComm
      };
    });

    // فلترة المجموعات النشطة فقط لهذا المندوب (التي باع منها أو كُلف بها)
    const activeGroupsForRep = processedGroups.filter(g => g.isVisibleForRep);

    // 3. تحديد الحد الأدنى المطلوب للمجموعات بمرونة
    const baseMinGroups = Number(gRules.minGroupsRequired ?? 7);
    const effectiveMinGroupsReq = assignedGroupsCount > 0 ? Math.min(baseMinGroups, assignedGroupsCount) : 0;
    const passGate_MinGroupsCount = assignedGroupsCount === 0 || qualifiedGroupsCount >= effectiveMinGroupsReq;

    // استحقاق العمولات
    const meetsGenTargetReq = !isGenTargetMandatory || passGate_GenTarget;
    const isEligibleForGroupCommissions = isRepActive && meetsGenTargetReq && passGate_MinGroupsCount;
    const totalGroupCommissionEarned = isEligibleForGroupCommissions ? rawGroupCommSum : 0;

    const isEligibleForGenTargetComm = isRepActive && passGate_GenTarget;
    const generalTargetCommEarned = isEligibleForGenTargetComm ? (Number(gRules.generalTargetCommValue) || 0) : 0;

    const grandTotalCommission = totalGroupCommissionEarned + generalTargetCommEarned;

    let blockers = [];
    if (isGenTargetMandatory && !passGate_GenTarget) {
      blockers.push(`باقي للهدف العام ${Math.round(remainingGenSales).toLocaleString()} ر.س`);
    }
    if (assignedGroupsCount > 0 && !passGate_MinGroupsCount) {
      blockers.push(`حقق ${qualifiedGroupsCount} من أصل ${effectiveMinGroupsReq} مجموعات مكلف بها`);
    }

    const eligibilityStatusText = blockers.length === 0 ? 'مستحق بالكامل ✅' : `محجوبة: ${blockers.join(' | ')}`;

    return {
      ...rep,
      id: rep.id,
      name: rep.name,
      department: rep.department || 'عام',
      branch: rep.branch || 'عام',
      isActive: isRepActive,
      genTarget,
      genSales,
      genPct,
      remainingGenSales,
      passGate_GenTarget,
      isGeneralTargetQualified: isEligibleForGenTargetComm,
      generalTargetCommEarned,
      isGroupsGateQualified: isEligibleForGroupCommissions,
      assignedGroupsCount,
      qualifiedGroupsCount,
      minGroupsReq: effectiveMinGroupsReq,
      // نرسل فقط المجموعات التي تخص المندوب ومبيعاته
      detailedGroups: activeGroupsForRep.map(grp => ({
        ...grp,
        commEarned: isEligibleForGroupCommissions ? grp.potentialComm : 0
      })),
      allGroupsRaw: processedGroups,
      totalGroupCommissionEarned,
      grandTotalCommission,
      eligibilityStatusText
    };
  },

  calculateCompanyTotals(processedReps) {
    let genTarget = 0, genSales = 0, groupCommSum = 0, genTargetCommSum = 0, grandComm = 0;
    let qualifiedCount = 0, activeCount = 0;

    (processedReps || []).forEach(r => {
      if (r.isActive !== false) {
        activeCount++;
        genTarget += r.genTarget || 0;
        genSales += r.genSales || 0;
        groupCommSum += r.totalGroupCommissionEarned || 0;
        genTargetCommSum += r.generalTargetCommEarned || 0;
        grandComm += r.grandTotalCommission || 0;
        if (r.isGroupsGateQualified) qualifiedCount++;
      }
    });

    const overallGenPct = genTarget > 0 ? (genSales / genTarget) * 100 : 0;
    const remainingGenSalesTotal = Math.max(0, genTarget - genSales);

    return {
      genTarget,
      genSales,
      overallGenPct,
      remainingGenSalesTotal,
      groupCommSum,
      genTargetCommSum,
      grandComm,
      qualifiedCount,
      totalReps: activeCount
    };
  }
};
