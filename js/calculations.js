/**
 * محرك احتساب الأداء، العمولات، وشريط التحقق المالي الرقابي v20.0
 */

const CalcEngine = {
  processRepData(rep, generalRules, groupRules) {
    if (!rep) return null;

    const isRepActive = rep.isActive !== false;
    const gRules = generalRules || CONFIG.DEFAULT_GENERAL_RULES;
    const grpRulesList = (groupRules && Array.isArray(groupRules)) ? groupRules : [];

    // 1. تقييم الهدف العام
    const genTarget = Number(rep.generalTarget || rep.genTarget || 0);
    const genSales = Number(rep.generalSales || rep.genSales || 0);
    const genPct = genTarget > 0 ? (genSales / genTarget) * 100 : 0;
    
    const isGenTargetMandatory = gRules.isGenTargetMandatory !== false;
    const genThresholdPct = Number(gRules.generalThresholdPct !== undefined ? gRules.generalThresholdPct : 80);
    const passGate_GenTarget = genTarget > 0 ? (genPct >= genThresholdPct) : false;
    const remainingGenSales = genTarget > 0 ? Math.max(0, (genTarget * (genThresholdPct / 100)) - genSales) : 0;

    // 2. تقييم المجموعات
    let assignedGroupsCount = 0;
    let qualifiedGroupsCount = 0;
    let failedMandatoryGroups = [];
    let rawGroupCommSum = 0;
    let repGroupsSalesTotal = 0;
    const repGroups = Array.isArray(rep.groups) ? rep.groups : [];

    const detailedGroups = grpRulesList.map((rule, gIdx) => {
      const repGrp = repGroups.find(rg => rg.name === rule.name || rg.id === rule.id) || repGroups[gIdx] || { target: 0, sales: 0, customComm: null };
      const isGroupActive = rule.isActive !== false;
      const isGroupMandatory = rule.isMandatory === true;

      const grpTarget = Number(repGrp.target || 0);
      const grpSales = Number(repGrp.sales || 0);
      repGroupsSalesTotal += grpSales;

      const isAssigned = grpTarget > 0;
      const grpPct = isAssigned ? (grpSales / grpTarget) * 100 : 0;
      
      const thresholdPct = Number(rule.thresholdPct !== undefined ? rule.thresholdPct : 70);
      const thresholdTargetSales = grpTarget * (thresholdPct / 100);
      const remainingToThreshold = isAssigned ? Math.max(0, thresholdTargetSales - grpSales) : 0;
      
      const isQualified = isGroupActive && isAssigned && (grpPct >= thresholdPct);

      if (isAssigned) assignedGroupsCount++;
      if (isQualified) qualifiedGroupsCount++;
      if (isGroupMandatory && isAssigned && !isQualified) {
        failedMandatoryGroups.push(rule.name);
      }

      const effectiveCommVal = (repGrp.customComm !== undefined && repGrp.customComm !== null && repGrp.customComm !== '')
        ? Number(repGrp.customComm)
        : Number(rule.commValue || 0);

      let potentialComm = 0;
      if (isQualified) {
        potentialComm = rule.commType === 'percent' ? (grpSales * (effectiveCommVal / 100)) : effectiveCommVal;
      }

      if (isGroupActive && isAssigned) {
        rawGroupCommSum += potentialComm;
      }

      return {
        id: rule.id !== undefined ? rule.id : gIdx,
        originalIndex: gIdx,
        name: rule.name,
        target: grpTarget,
        sales: grpSales,
        customComm: repGrp.customComm,
        isAssigned,
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

    const minGroupsReq = Number(gRules.minGroupsRequired !== undefined ? gRules.minGroupsRequired : 7);
    const effectiveMinGroupsReq = assignedGroupsCount > 0 ? Math.min(minGroupsReq, assignedGroupsCount) : 0;
    const passGate_MinGroupsCount = assignedGroupsCount === 0 || qualifiedGroupsCount >= effectiveMinGroupsReq;
    const passGate_MandatoryGroups = failedMandatoryGroups.length === 0;

    // 3. احتساب الاستحقاق
    const meetsGenTargetReq = !isGenTargetMandatory || passGate_GenTarget;
    const isEligibleForGroupCommissions = isRepActive && meetsGenTargetReq && passGate_MandatoryGroups && passGate_MinGroupsCount;
    
    const totalGroupCommissionEarned = isEligibleForGroupCommissions ? rawGroupCommSum : 0;
    const isEligibleForGenTargetComm = isRepActive && passGate_GenTarget;
    const generalTargetCommEarned = isEligibleForGenTargetComm ? (Number(gRules.generalTargetCommValue) || 0) : 0;
    const grandTotalCommission = totalGroupCommissionEarned + generalTargetCommEarned;

    const unmappedSales = Math.max(0, genSales - repGroupsSalesTotal);

    let blockers = [];
    if (isGenTargetMandatory && !passGate_GenTarget) {
      blockers.push(`باقي للهدف العام ${Math.round(remainingGenSales).toLocaleString()} ر.س`);
    }
    if (!passGate_MandatoryGroups) {
      blockers.push(`أصناف إلزامية غير محققة: [${failedMandatoryGroups.join('، ')}]`);
    }
    if (assignedGroupsCount > 0 && !passGate_MinGroupsCount) {
      blockers.push(`حقق ${qualifiedGroupsCount} من أصل ${effectiveMinGroupsReq} مجموعات مطلوبة`);
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
      repGroupsSalesTotal,
      unmappedSales,
      remainingGenSales,
      passGate_GenTarget,
      isGeneralTargetQualified: isEligibleForGenTargetComm,
      generalTargetCommEarned,
      isGroupsGateQualified: isEligibleForGroupCommissions,
      assignedGroupsCount,
      qualifiedGroupsCount,
      minGroupsReq: effectiveMinGroupsReq,
      detailedGroups: detailedGroups.map(grp => ({
        ...grp,
        commEarned: isEligibleForGroupCommissions ? grp.potentialComm : 0
      })),
      totalGroupCommissionEarned,
      grandTotalCommission,
      eligibilityStatusText
    };
  },

  calculateCompanyTotals(processedReps) {
    let genTarget = 0, genSales = 0, repGroupsSalesTotal = 0, groupCommSum = 0, genTargetCommSum = 0, grandComm = 0;
    let qualifiedCount = 0, activeCount = 0;

    (processedReps || []).forEach(r => {
      if (r.isActive !== false) {
        activeCount++;
        genTarget += r.genTarget || 0;
        genSales += r.genSales || 0;
        repGroupsSalesTotal += r.repGroupsSalesTotal || 0;
        groupCommSum += r.totalGroupCommissionEarned || 0;
        genTargetCommSum += r.generalTargetCommEarned || 0;
        grandComm += r.grandTotalCommission || 0;
        if (r.isGroupsGateQualified) qualifiedCount++;
      }
    });

    const overallGenPct = genTarget > 0 ? (genSales / genTarget) * 100 : 0;
    const remainingGenSalesTotal = Math.max(0, genTarget - genSales);
    const unmappedSalesTotal = Math.max(0, genSales - repGroupsSalesTotal);
    const coveragePct = genSales > 0 ? (repGroupsSalesTotal / genSales) * 100 : 0;

    return {
      genTarget,
      genSales,
      overallGenPct,
      remainingGenSalesTotal,
      repGroupsSalesTotal,
      unmappedSalesTotal,
      coveragePct,
      groupCommSum,
      genTargetCommSum,
      grandComm,
      qualifiedCount,
      totalReps: activeCount
    };
  }
};
