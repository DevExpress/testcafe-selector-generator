/* global getSelector */
const hammerhead     = window.getTestCafeModule('hammerhead');
const INTERNAL_ATTRS = hammerhead.PROCESSING_INSTRUCTIONS.dom.internal_attributes;
const INTERNAL_PROPS = hammerhead.PROCESSING_INSTRUCTIONS.dom.internal_props;

const SelectorGenerator = window.getTestCafeModule('SelectorGenerator');

const { RULE_TYPE, DEFAULT_SELECTOR_RULES, CustomSelectorRule, SelectorRule } = SelectorGenerator.RULES;

const CUSTOM_ATTR_NAME    = 'cust-attr';
const DATA_TEST_ATTR_NAME = 'data-test';
const CUSTOM_ATTRIBUTES   = [CUSTOM_ATTR_NAME, DATA_TEST_ATTR_NAME];

const STORED_ATTRIBUTES_PROPERTY        = '%testcafe-stored-attributes%';
const CUSTOM_STORED_ATTRIBUTES_PROPERTY = '%testcafe-custom-stored-attributes%';

let qunitElements = null;

function startIgnoreQUnitElements () {
    qunitElements = document.getElementById('qunit-tests').querySelectorAll('*');

    for (let i = 0; i < qunitElements.length; i++) {
        const el = qunitElements[i];

        el[INTERNAL_PROPS.shadowUIElement] = true;
    }
}

function stopIgnoreQUnitElements () {
    qunitElements = document.getElementById('qunit-tests').querySelectorAll('*');

    for (let i = 0; i < qunitElements.length; i++) {
        const el = qunitElements[i];

        el[INTERNAL_PROPS.shadowUIElement] = false;
    }
}

function createSelectorGenerator (customAtrNames) {
    if (!customAtrNames)
        return new SelectorGenerator();

    const customRues = customAtrNames.map(function (attrName) {
        return new CustomSelectorRule(attrName);
    });

    return new SelectorGenerator(customRues.concat(DEFAULT_SELECTOR_RULES));
}

const originSelectorGenerator = createSelectorGenerator();
const customSelectorGenerator = createSelectorGenerator(CUSTOM_ATTRIBUTES);

function generateSelectors (element, generator) {
    startIgnoreQUnitElements();

    const selectors = generator ? generator.generate(element) : customSelectorGenerator.generate(element);

    element[STORED_ATTRIBUTES_PROPERTY]        = null;
    element[CUSTOM_STORED_ATTRIBUTES_PROPERTY] = null;

    stopIgnoreQUnitElements();

    return selectors;
}

module('using custom attr generation rule');

test('element with custom attribute', function () {
    const insElement = document.querySelector('ins');
    let selectors    = generateSelectors(insElement, originSelectorGenerator);

    deepEqual(selectors, [
        getSelector("Selector('ins').withText('text')", RULE_TYPE.byText),
        getSelector("Selector('ins')", RULE_TYPE.byTagTree),
    ]);

    selectors = generateSelectors(insElement);

    deepEqual(selectors, [
        getSelector("Selector('[cust-attr=\"cust-attr value\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('ins').withText('text')", RULE_TYPE.byText),
        getSelector("Selector('ins')", RULE_TYPE.byTagTree),
    ]);
});

test('element without custom attribute', function () {
    const legend = document.querySelector('legend');

    deepEqual(generateSelectors(legend), [
        getSelector("Selector('legend').withText('without custom attr')", RULE_TYPE.byText),
        getSelector("Selector('[title=\"title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('legend')", RULE_TYPE.byTagTree),
    ]);
});

test('use common attr as custom', function () {
    const insElement = document.querySelectorAll('ins')[1];
    let selectors    = generateSelectors(insElement, originSelectorGenerator);

    deepEqual(selectors, [
        getSelector("Selector('ins').withText('ins')", RULE_TYPE.byText),
        getSelector("Selector('.class-name')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"ins with title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('ins').nth(1)", RULE_TYPE.byTagTree),
    ]);

    selectors = generateSelectors(insElement, createSelectorGenerator(['title']));

    deepEqual(selectors, [
        getSelector("Selector('[title=\"ins with title\"]')", 'title'),
        getSelector("Selector('ins').withText('ins')", RULE_TYPE.byText),
        getSelector("Selector('.class-name')", RULE_TYPE.byClassAttr),
        getSelector("Selector('ins').nth(1)", RULE_TYPE.byTagTree),
    ]);
});


module('different values');

test('custom attribute value with regexp', function () {
    const button = document.querySelectorAll('button')[0];

    deepEqual(generateSelectors(button), [
        getSelector("Selector('button').withAttribute('cust-attr', /some\\s+value with spaces/)", CUSTOM_ATTR_NAME),
        getSelector("Selector('button').withText('button1')", RULE_TYPE.byText),
        getSelector("Selector('button')", RULE_TYPE.byTagTree),
    ]);
});

test('custom attribute with no value', function () {
    const button = document.querySelectorAll('button')[1];

    deepEqual(generateSelectors(button), [
        getSelector("Selector('[cust-attr]').nth(2)", CUSTOM_ATTR_NAME),
        getSelector("Selector('button').withText('button2')", RULE_TYPE.byText),
        getSelector("Selector('button').nth(1)", RULE_TYPE.byTagTree),
    ]);
});


module('several attributes');

test('element with several common attributes', function () {
    const div = document.querySelector('div');

    deepEqual(generateSelectors(div), [
        getSelector("Selector('[cust-attr]').nth(3)", CUSTOM_ATTR_NAME),
        getSelector("Selector('.some-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"div-some-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('div')", RULE_TYPE.byTagTree),
    ]);
});

test('TestCafe and Google Analytics attributes', function () {
    const div = document.querySelectorAll('div')[1];

    const hammerheadUrlAttr       = 'href' + INTERNAL_ATTRS.storedAttrPostfix;
    const hammerheadDataHoverAttr = 'data-hover' + INTERNAL_ATTRS.storedAttrPostfix;
    const hammerheadDataFocusAttr = 'data-focus' + INTERNAL_ATTRS.storedAttrPostfix;

    div.setAttribute(hammerheadUrlAttr, 'value');
    div.setAttribute(hammerheadDataHoverAttr, '');
    div.setAttribute(hammerheadDataFocusAttr, true);

    const gaAttrName = 'data-ga-click';

    div.setAttribute(gaAttrName, '(Logged out) Header, clicked Sign up, text:sign-up');

    let selectors = generateSelectors(div);

    deepEqual(selectors, [
        getSelector("Selector('[cust-attr]').nth(4)", CUSTOM_ATTR_NAME),
        getSelector("Selector('.tc-hh-some-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"tc-hh-some-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('div').nth(1)", RULE_TYPE.byTagTree),
    ]);

    selectors = generateSelectors(div, createSelectorGenerator(CUSTOM_ATTRIBUTES.concat([hammerheadDataHoverAttr, gaAttrName])));

    deepEqual(selectors, [
        getSelector("Selector('[cust-attr]').nth(4)", CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-hover-hammerhead-stored-value]')", 'data-hover-hammerhead-stored-value'),
        getSelector("Selector('[data-ga-click=\"(Logged out) Header, clicked Sign up, text:sign-up\"]')", 'data-ga-click'),
        getSelector("Selector('.tc-hh-some-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"tc-hh-some-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('div').nth(1)", RULE_TYPE.byTagTree),
    ]);
});

test('elements with several common and custom attributes', function () {
    const labels = document.querySelectorAll('label');

    deepEqual(generateSelectors(labels[0]), [
        getSelector("Selector('label').withAttribute('cust-attr', /value\\s+with spaces/)", CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-test=\"123\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.some-class').nth(1)", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"some-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('label')", RULE_TYPE.byTagTree),
    ]);

    deepEqual(generateSelectors(labels[1]), [
        getSelector("Selector('[cust-attr=\"label cust-attr value\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-test]').nth(1)", DATA_TEST_ATTR_NAME),
        getSelector("Selector('#id123')", RULE_TYPE.byId),
        getSelector("Selector('.some.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('label').nth(1)", RULE_TYPE.byTagTree),
    ]);
});


module('combined selectors');

test('elements with parents', function () {
    let span = document.querySelector('#parent-with-id > span');

    deepEqual(generateSelectors(span), [
        getSelector("Selector('[cust-attr=\"some attr\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('#parent-with-id [cust-attr=\"some attr\"]')", CUSTOM_ATTR_NAME, RULE_TYPE.byId),
        getSelector("Selector('#parent-with-id span')", RULE_TYPE.byTagTree, RULE_TYPE.byId),
        getSelector("Selector('div').nth(2).find('span')", RULE_TYPE.byTagTree),
    ]);

    span = document.querySelector('.parent-with-class > span');

    deepEqual(generateSelectors(span), [
        getSelector("Selector('[data-test=\"some data attr\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.child-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-with-class [data-test=\"some data attr\"]')", DATA_TEST_ATTR_NAME, RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-with-class .child-class')", RULE_TYPE.byClassAttr, RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-with-class span')", RULE_TYPE.byTagTree, RULE_TYPE.byClassAttr),
        getSelector("Selector('div').nth(3).find('span')", RULE_TYPE.byTagTree),
    ]);
});

test('parent with custom attributes', function () {
    const span = document.querySelector('.parent-class > span');

    deepEqual(generateSelectors(span), [
        getSelector("Selector('[cust-attr=\"parent with cust attr\"] [data-test=\"child data test\"]')", DATA_TEST_ATTR_NAME, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"parent with cust attr\"] .span.class')", RULE_TYPE.byClassAttr, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"parent with cust attr\"] span')", RULE_TYPE.byTagTree, CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-test=\"child data test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.span.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-class [data-test=\"child data test\"]')", DATA_TEST_ATTR_NAME, RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-class .span.class')", RULE_TYPE.byClassAttr, RULE_TYPE.byClassAttr),
        getSelector("Selector('.parent-class span')", RULE_TYPE.byTagTree, RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"parent-with-title\"] [data-test=\"child data test\"]')", DATA_TEST_ATTR_NAME, RULE_TYPE.byAttr),
        getSelector("Selector('[title=\"parent-with-title\"] .span.class')", RULE_TYPE.byClassAttr, RULE_TYPE.byAttr),
        getSelector("Selector('[title=\"parent-with-title\"] span')", RULE_TYPE.byTagTree, RULE_TYPE.byAttr),
        getSelector("Selector('div').nth(4).find('span')", RULE_TYPE.byTagTree),
    ]);
});

module('storing attributes');

test('element without custom attributes', function () {
    const strongElement = document.querySelector('.strong-class');

    customSelectorGenerator.storeElementAttributes(strongElement);

    strongElement.setAttribute('cust-attr', 'legend-cust-attr');
    strongElement.setAttribute('data-test', 'legend-data-test');

    deepEqual(generateSelectors(strongElement), [
        getSelector("Selector('strong').withText('strong text')", RULE_TYPE.byText),
        getSelector("Selector('.strong-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('strong')", RULE_TYPE.byTagTree),
    ]);

    customSelectorGenerator.storeElementAttributes(strongElement);

    deepEqual(generateSelectors(strongElement), [
        getSelector("Selector('[cust-attr=\"legend-cust-attr\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-test=\"legend-data-test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('strong').withText('strong text')", RULE_TYPE.byText),
        getSelector("Selector('.strong-class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('strong')", RULE_TYPE.byTagTree),
    ]);
});

test('element with custom attributes', function () {
    const qElement = document.querySelector('q');

    customSelectorGenerator.storeElementAttributes(qElement);

    qElement.removeAttribute('cust-attr');

    deepEqual(generateSelectors(qElement), [
        getSelector("Selector('[cust-attr]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('[data-test=\"q-data-test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.q.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"q-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('q')", RULE_TYPE.byTagTree),
    ]);

    customSelectorGenerator.storeElementAttributes(qElement);

    qElement.removeAttribute('data-test');

    deepEqual(generateSelectors(qElement), [
        getSelector("Selector('[data-test=\"q-data-test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.q.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[title=\"q-title\"]')", RULE_TYPE.byAttr),
        getSelector("Selector('q')", RULE_TYPE.byTagTree),
    ]);
});

test('use common attribute as custom', function () {
    const img               = document.querySelector('img');
    const selectorGenerator = createSelectorGenerator(['alt', 'data-test']);

    selectorGenerator.storeElementAttributes(img);

    img.removeAttribute('alt');

    deepEqual(generateSelectors(img, selectorGenerator), [
        getSelector("Selector('[alt=\"some alt\"]')", 'alt'),
        getSelector("Selector('[data-test=\"img-data-test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.imgclass')", RULE_TYPE.byClassAttr),
        getSelector("Selector('img')", RULE_TYPE.byTagTree),
    ]);

    selectorGenerator.storeElementAttributes(img);

    deepEqual(generateSelectors(img, selectorGenerator), [
        getSelector("Selector('[data-test=\"img-data-test\"]')", DATA_TEST_ATTR_NAME),
        getSelector("Selector('.imgclass')", RULE_TYPE.byClassAttr),
        getSelector("Selector('img')", RULE_TYPE.byTagTree),
    ]);
});


module('custom rule priority');

test('default rule priority', function () {
    const element   = document.querySelector('#id123');
    const generator = createSelectorGenerator();

    deepEqual(generateSelectors(element, generator), [
        getSelector("Selector('#id123')", RULE_TYPE.byId),
        getSelector("Selector('.some.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('label').nth(1)", RULE_TYPE.byTagTree),
    ]);
});

test('custom rule priority', function () {
    const element   = document.querySelector('#id123');
    const generator = new SelectorGenerator([
        new SelectorRule(RULE_TYPE.byClassAttr),
        new SelectorRule(RULE_TYPE.byTagTree),
        new SelectorRule(RULE_TYPE.byId),
    ]);

    const selectors = generateSelectors(element, generator);

    deepEqual(selectors, [
        getSelector("Selector('.some.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('label').nth(1)", RULE_TYPE.byTagTree),
        getSelector("Selector('#id123')", RULE_TYPE.byId),
    ]);
});

test('differ custom attributes priority', function () {
    const element   = document.querySelector('#id123');
    const generator = new SelectorGenerator([
        new CustomSelectorRule(CUSTOM_ATTRIBUTES[0]),
        new SelectorRule(RULE_TYPE.byClassAttr),
        new CustomSelectorRule(CUSTOM_ATTRIBUTES[1]),
        new SelectorRule(RULE_TYPE.byId),
        new SelectorRule(RULE_TYPE.byTagTree),
    ]);

    const selectors = generateSelectors(element, generator);

    deepEqual(selectors, [
        getSelector("Selector('[cust-attr=\"label cust-attr value\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('.some.class')", RULE_TYPE.byClassAttr),
        getSelector("Selector('[data-test]').nth(2)", DATA_TEST_ATTR_NAME),
        getSelector("Selector('#id123')", RULE_TYPE.byId),
        getSelector("Selector('label').nth(1)", RULE_TYPE.byTagTree),
    ]);
});


module('selector count');

test('custom selector should not be limited, only 10 default selectors can be generated', function () {
    const element   = document.querySelector('#divWithId');
    const generator = createSelectorGenerator(['cust-attr']);

    const selectors = generateSelectors(element, generator);

    deepEqual(selectors, [
        getSelector("Selector('[cust-attr=\"test1\"]')", CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"grand-parent\"] [cust-attr=\"test1\"]')", CUSTOM_ATTR_NAME, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"grand-parent\"] div').withText('bla bla text').nth(1)", RULE_TYPE.byText, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"grand-parent\"] .divWithClass')", RULE_TYPE.byClassAttr, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"grand-parent\"] [title=\"divWithAttr\"]')", RULE_TYPE.byAttr, CUSTOM_ATTR_NAME),
        getSelector("Selector('[cust-attr=\"grand-parent\"] div div')", RULE_TYPE.byTagTree, CUSTOM_ATTR_NAME),

        getSelector("Selector('#divWithId')", RULE_TYPE.byId),
        getSelector("Selector('#ancestorDivWithId [cust-attr=\"test1\"]')", CUSTOM_ATTR_NAME, RULE_TYPE.byId),
        getSelector("Selector('#ancestorDivWithId div').withText('bla bla text').nth(1)", RULE_TYPE.byText, RULE_TYPE.byId),
        getSelector("Selector('#ancestorDivWithId .divWithClass')", RULE_TYPE.byClassAttr, RULE_TYPE.byId),
        getSelector("Selector('#ancestorDivWithId [title=\"divWithAttr\"]')", RULE_TYPE.byAttr, RULE_TYPE.byId),

        getSelector("Selector('div').withText('bla bla text').nth(3)", RULE_TYPE.byText),

        getSelector("Selector('.divWithClass')", RULE_TYPE.byClassAttr),
        getSelector("Selector('.ancestorDivWithClass [cust-attr=\"test1\"]')", CUSTOM_ATTR_NAME, RULE_TYPE.byClassAttr),
        getSelector("Selector('.ancestorDivWithClass div').withText('bla bla text')", RULE_TYPE.byText, RULE_TYPE.byClassAttr),

        getSelector("Selector('[title=\"divWithAttr\"]')", RULE_TYPE.byAttr),

        getSelector("Selector('[title=\"ancestorDivWithAttr\"] [cust-attr=\"test1\"]')", CUSTOM_ATTR_NAME, RULE_TYPE.byAttr),
        getSelector("Selector('[title=\"ancestorDivWithAttr\"] div').withText('bla bla text').nth(2)", RULE_TYPE.byText, RULE_TYPE.byAttr),

        getSelector("Selector('div').nth(5).find('div div div')", RULE_TYPE.byTagTree),
    ]);
});
