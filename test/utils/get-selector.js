/* eslint-disable no-unused-vars */
function getSelector (value, ruleType, ancestorRuleType) {
    const selector = {
        value,

        rules: [ruleType],
    };

    if (ancestorRuleType)
        selector.rules.push(ancestorRuleType);

    return selector;
}
