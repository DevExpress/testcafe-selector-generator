import { RULE_TYPE as RULES } from '../selectors/rule-type';

export class SelectorRule {
    constructor (type, editable = false) {
        this.type     = type;
        this.editable = editable;

        this.disabled = void 0;
    }
}

export class CustomSelectorRule extends SelectorRule {
    constructor (type) {
        super(type.toLowerCase(), true);
    }
}

export const UNSWITCHABLE_RULE_TYPE = RULES.byTagTree;

export const DEFAULT_SELECTOR_RULES = [
    new SelectorRule(RULES.byTagName),
    new SelectorRule(RULES.byId),
    new SelectorRule(RULES.byText),
    new SelectorRule(RULES.byClassAttr),
    new SelectorRule(RULES.byAttr),
    new SelectorRule(RULES.byTagTree),
];

//NOTE: for testing purposes
export const RULE_TYPE = RULES;
