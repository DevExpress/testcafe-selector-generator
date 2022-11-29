/* eslint-disable no-unused-vars */
function getSelector (value, ruleType, ancestorRuleType) {
    const selector = {
        rawSelector: {
            type:  'js-expr',
            value: value,

        },

        ruleType: ruleType,
    };

    if (ancestorRuleType)
        selector.ancestorRuleType = ancestorRuleType;

    return selector;
}
