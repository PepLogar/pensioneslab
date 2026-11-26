/** Common hypothetical automation sensitivity for all pension systems.
 * Shares refer to eligible work hours/FTE, not to people dismissed or percentage
 * points of unemployment. AI and robot shares must describe disjoint work;
 * never add a robot estimate to a source's total that already includes robots.
 * Adoption ramps linearly from the opening to the chosen year, then plateaus.
 * The fractions, dates, productivity and wage incidence are visible assumptions,
 * not forecasts identified by an exposure study or a general-equilibrium model.
 */
export const AUTOMATION_DEFAULTS = Object.freeze({
  aiAutomationShare: 0,
  robotAutomationShare: 0,
  automationTargetYear: 2030,
  automationRedeployment: 1,
  automationProductivityGain: 0,
  automationWagePassThrough: 1,
  reemploymentWageLoss: 0,
  displacementSupportRate: .4
});

const SHARE_FIELDS = Object.freeze([
  'aiAutomationShare', 'robotAutomationShare', 'automationRedeployment',
  'automationWagePassThrough', 'reemploymentWageLoss', 'displacementSupportRate'
]);

/** Factors apply to the year's eligible reference work and wage once.
 * Lost hours = automated hours minus redeployed hours. Existing retirement and
 * fertility changes belong upstream; they must not be displaced a second time.
 * The paid wage averages unaffected and redeployed hours, with the wage loss
 * applying only to the latter. Multiplying paidWorkShare by wageFactor yields
 * the payroll factor; do not deduct the wage loss again from that payroll.
 *
 * Caller accounting: paid FTE = eligible FTE * paidWorkShare; production uses
 * paid FTE * baseline output/FTE * productivityFactor. Thus this does not add
 * autonomous robot output independently of human work. It neither creates an
 * investment return nor assumes gains accrue to pension funds. Support uses
 * unredeployedShare, the chosen rate and its documented reference wage; it does
 * not compensate the separate wage reduction of workers who found new work.
 */
export function automationAt(year, config = {}, baseYear = 2026) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Automation configuration must be an object');
  }
  const values = { ...AUTOMATION_DEFAULTS, ...config };
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(baseYear) || baseYear < 1 ||
      !Number.isInteger(values.automationTargetYear) || values.automationTargetYear <= baseYear) {
    throw new RangeError('Automation requires integer years and a target after the opening');
  }
  for (const key of SHARE_FIELDS) {
    if (!Number.isFinite(values[key]) || values[key] < 0 || values[key] > 1) {
      throw new RangeError(`Invalid automation share: ${key}`);
    }
  }
  if (values.aiAutomationShare + values.robotAutomationShare > 1) {
    throw new RangeError('AI and robot shares cannot exceed all eligible work');
  }
  if (!Number.isFinite(values.automationProductivityGain) || values.automationProductivityGain < 0) {
    throw new RangeError('Automation productivity gain must be finite and nonnegative');
  }

  const progress = Math.max(0, Math.min(1,
    (year - baseYear) / (values.automationTargetYear - baseYear)));
  const aiShare = values.aiAutomationShare * progress;
  const robotShare = values.robotAutomationShare * progress;
  const automatedShare = aiShare + robotShare;
  const redeployedShare = automatedShare * values.automationRedeployment;
  const unredeployedShare = automatedShare - redeployedShare;
  const paidWorkShare = 1 - automatedShare + redeployedShare;
  const productivityFactor = 1 + values.automationProductivityGain * progress;
  const wageBeforeReemploymentFactor = 1 +
    values.automationProductivityGain * values.automationWagePassThrough * progress;
  const wageFactor = paidWorkShare === 0 ? 0 : wageBeforeReemploymentFactor *
    (1 - automatedShare + redeployedShare * (1 - values.reemploymentWageLoss)) / paidWorkShare;

  // Zero paid hours have no paid average wage. The facade's tighter scenario
  // bounds currently exclude this case; the pure helper still avoids NaN.
  return {
    progress, aiShare, robotShare, automatedShare, redeployedShare, unredeployedShare,
    paidWorkShare, productivityFactor, wageFactor, wageBeforeReemploymentFactor,
    unemploymentSupportRate: values.displacementSupportRate
  };
}
