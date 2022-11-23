import TESTCAFE_CORE from './deps/testcafe-core';

import { findIndex } from './utils/find-index';
import { RULE_TYPE } from './selectors/rule-type';
import { getParentsUntil } from './selector-creators/utils/tag-tree-utils';
import { SelectorDescriptor } from './selector-descriptor';
import { storeElementAttributes } from './selector-creators/utils/attributes-watcher';
import * as DEFAULT_RULES from './utils/default-rules';
import { SELECTOR_CREATORS } from './selector-creators';
import { AttrSelectorCreator } from './selector-creators/attr-creator';
import { CustomAttrSelectorCreator } from './selector-creators/custom-attr-creator';
import { TagNameSelectorCreator } from './selector-creators/tag-name-creator';
import { calculateRulesPriority } from './utils/calculate-priority';
import { getSelectorType } from './selectors/get-selector-type';
import { isSelectorDescriptorCompoundable, isAncestorRuleCompoundable } from './utils/compound-utils';

const { domUtils, arrayUtils } = TESTCAFE_CORE;

const MAX_DEFAULT_SELECTOR_COUNT = 10;

export class SelectorGenerator {
    static RULE_TYPE     = RULE_TYPE;
    static DEFAULT_RULES = DEFAULT_RULES;

    constructor (rules = DEFAULT_RULES.DEFAULT_SELECTOR_RULES) {
        this.rules = arrayUtils.filter(rules, rule => !rule.disabled);

        const { customRules, defaultRules } = SelectorGenerator._processRules(this.rules);

        this.customRules  = customRules;
        this.defaultRules = defaultRules;

        this.customAttrNames        = [];
        this.customSelectorCreators = [];

        this.elementSelectorCreators  = [];
        this.ancestorSelectorCreators = [];

        this._createCustomSelectorCreators();
        this._createElementSelectorCreators();
        this._createAncestorSelectorCreators();

        this.rulePriority = calculateRulesPriority(this.rules);
    }

    static _priorityComparator (first, second) {
        return first.priority - second.priority;
    }

    static _getSelectorType (selectorDescriptor) {
        const { ancestorSelectorDescriptor } = selectorDescriptor;
        const ancestorSelectorType           = ancestorSelectorDescriptor ? ancestorSelectorDescriptor.ruleType : '';

        return getSelectorType(selectorDescriptor.ruleType, ancestorSelectorType);
    }

    static _processRules (rules) {
        const defaultRules = [];
        const customRules  = [];

        arrayUtils.filter(rules, rule => {
            if (rule.editable)
                customRules.push(rule);
            else
                defaultRules.push(rule);

        });

        return { customRules, defaultRules };
    }

    _createCustomSelectorCreators () {
        arrayUtils.forEach(this.customRules, rule => {
            this.customAttrNames.push(rule.type);
            this.customSelectorCreators.push(new CustomAttrSelectorCreator(rule.type));
        });
    }

    _createElementSelectorCreators () {
        const defaultCreators = [];

        arrayUtils.forEach(this.defaultRules, rule => {
            const creator = rule.type === RULE_TYPE.byAttr ?
                new AttrSelectorCreator(this.customAttrNames) :
                SELECTOR_CREATORS[rule.type];

            defaultCreators.push(creator);
        });

        this.elementSelectorCreators = arrayUtils.concat(defaultCreators, this.customSelectorCreators);
    }

    _createAncestorSelectorCreators () {
        for (const rule of this.customRules)
            this.ancestorSelectorCreators.push(new CustomAttrSelectorCreator(rule.type));

        for (const rule of this.defaultRules) {
            if (isAncestorRuleCompoundable(rule)) {
                if (rule.type === RULE_TYPE.byTagName)
                    this.ancestorSelectorCreators.push(new TagNameSelectorCreator(false));
                else
                    this.ancestorSelectorCreators.push(SELECTOR_CREATORS[rule.type]);
            }
        }
    }

    _generateSelectorDescriptorsByCreators (el, selectorCreators, ancestorSelectorDescriptor) {
        const selectorDescriptors = [];

        for (const creator of selectorCreators) {
            const selectorDescriptor = creator.create(el, ancestorSelectorDescriptor);

            if (selectorDescriptor)
                selectorDescriptors.push(selectorDescriptor);
        }

        return selectorDescriptors;
    }

    _getAncestorSelectorDescriptor (ancestors, ancestorSelectorCreator) {
        for (const ancestor of ancestors) {
            const ancestorSelectorDescriptor = ancestorSelectorCreator.create(ancestor);

            if (ancestorSelectorDescriptor)
                return ancestorSelectorDescriptor;
        }

        return null;
    }

    _generateAncestorSelectorDescriptorsByCreators (ancestors, selectorCreators) {
        const selectorDescriptors = [];

        for (const creator of selectorCreators) {
            const selectorDescriptor = this._getAncestorSelectorDescriptor(ancestors, creator);

            if (selectorDescriptor)
                selectorDescriptors.push(selectorDescriptor);
        }

        return selectorDescriptors;
    }

    _generateCompoundSelectorDescriptor (el, ancestors, elementSelectorDescriptors) {
        const compoundSelectorDescriptors = arrayUtils.filter(elementSelectorDescriptors, isSelectorDescriptorCompoundable);
        const ancestorSelectorDescriptors = this._generateAncestorSelectorDescriptorsByCreators(ancestors, this.ancestorSelectorCreators);

        let selectorDescriptors = [];
        let descriptor          = null;
        let ancestorDescriptor  = null;

        for (const ancestorSelectorDescriptor of ancestorSelectorDescriptors) {
            for (const elementSelectorDescriptor of compoundSelectorDescriptors) {
                ancestorDescriptor = SelectorDescriptor.createFromInstance(ancestorSelectorDescriptor);
                descriptor         = SelectorDescriptor.createFromInstance(elementSelectorDescriptor, ancestorDescriptor);

                selectorDescriptors.push(descriptor);
            }

            //TODO: check ancestorDescriptor and ancestorSelectorDescriptor
            ancestorDescriptor  = SelectorDescriptor.createFromInstance(ancestorSelectorDescriptor);
            descriptor          = this._generateSelectorDescriptorsByCreators(el, [SELECTOR_CREATORS[RULE_TYPE.byTagTree]], ancestorSelectorDescriptor);
            selectorDescriptors = arrayUtils.concat(selectorDescriptors, descriptor);
        }

        return selectorDescriptors;
    }

    _removeRepetitiveSelectorDescriptors (selectorDescriptors) {
        const resultSelectorDescriptors = [];

        const repetitiveStringIndex = descriptor => findIndex(resultSelectorDescriptors, desc => {
            return arrayUtils.join(desc.stringArray, '') === arrayUtils.join(descriptor.stringArray, '');
        });

        for (const descriptor of selectorDescriptors) {
            const index = repetitiveStringIndex(descriptor);

            if (index === -1)
                resultSelectorDescriptors.push(descriptor);
            else if (resultSelectorDescriptors[index].priority > descriptor.priority)
                arrayUtils.splice(resultSelectorDescriptors, index, 1, descriptor);
        }

        return resultSelectorDescriptors;
    }

    _removeRedundantCompoundSelectorDescriptors (selectorDescriptors) {
        const defaultRuleSelectors         = arrayUtils.filter(selectorDescriptors, descriptor => !descriptor.isCustom);
        const defaultCompoundRuleSelectors = arrayUtils.filter(defaultRuleSelectors, descriptor => descriptor.ancestorSelectorDescriptor);

        let compoundSelectorCount       = defaultCompoundRuleSelectors.length;
        const elementSelectorCount      = defaultRuleSelectors.length - compoundSelectorCount;
        const expectedCompoundRuleCount = MAX_DEFAULT_SELECTOR_COUNT - elementSelectorCount;

        const getAncestorType = descriptor => {
            return descriptor && descriptor.ancestorSelectorDescriptor ?
                descriptor.ancestorSelectorDescriptor.ruleType : null;
        };

        let currentIndex = compoundSelectorCount - 1;

        while (compoundSelectorCount > expectedCompoundRuleCount) {
            const descriptor       = defaultCompoundRuleSelectors[currentIndex];
            const ancestorRuleType = getAncestorType(descriptor);

            while (getAncestorType(defaultCompoundRuleSelectors[currentIndex - 1]) === ancestorRuleType) {
                arrayUtils.remove(selectorDescriptors, defaultCompoundRuleSelectors[currentIndex]);
                compoundSelectorCount--;

                if (compoundSelectorCount <= expectedCompoundRuleCount)
                    break;

                currentIndex--;
            }

            currentIndex--;
        }
    }

    _cleanAndSortDescriptors (selectorDescriptors) {
        let result = [];

        for (const descriptor of selectorDescriptors) {
            descriptor.makeUnique();

            const selectorType = SelectorGenerator._getSelectorType(descriptor);
            const priority     = this.rulePriority[selectorType];

            if (priority === null)
                continue;

            descriptor.priority = priority;
            result.push(descriptor);
        }

        result = this._removeRepetitiveSelectorDescriptors(result);
        result = result.sort(SelectorGenerator._priorityComparator);

        this._removeRedundantCompoundSelectorDescriptors(result);

        return result;
    }

    storeElementAttributes (el, isOutEvent = false) {
        const body  = domUtils.findDocument(el).body;
        let element = el;

        //NOTE: mouseover event is not fired for parent element if
        // children fill all parent's space
        while (element && element !== body) {
            storeElementAttributes(element, this.customAttrNames, isOutEvent);

            element = element.parentElement;
        }
    }

    generateDescriptors (el) {
        const elementSelectorDescriptors  = this._generateSelectorDescriptorsByCreators(el, this.elementSelectorCreators);
        const ancestors                   = getParentsUntil(el, domUtils.findDocument(el).body);
        const compoundSelectorDescriptors = this._generateCompoundSelectorDescriptor(el, ancestors, elementSelectorDescriptors);

        const selectorDescriptors = arrayUtils.concat(elementSelectorDescriptors, compoundSelectorDescriptors);

        return this._cleanAndSortDescriptors(selectorDescriptors);
    }

    generate (source) {
        const isDomElement = domUtils.isDomElement(source);

        if (isDomElement || arrayUtils.isArray(source)) {
            const selectorDescriptors = isDomElement ? this.generateDescriptors(source) : source;

            return arrayUtils.map(selectorDescriptors, selectorDescriptor => {
                const { stringArray, ruleType, ancestorSelectorDescriptor } = selectorDescriptor;

                const selector = {
                    rawSelector: {
                        type:  'js-expr',
                        value: arrayUtils.join(stringArray, ''),
                    },

                    ruleType,
                };

                if (ancestorSelectorDescriptor)
                    selector.ancestorRuleType = ancestorSelectorDescriptor.ruleType;

                return selector;
            });
        }

        return [];
    }
}
