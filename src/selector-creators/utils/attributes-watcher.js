import hammerhead from '../../deps/hammerhead';
import TESTCAFE_CORE from '../../deps/testcafe-core';

import { setElementProperty } from './set-element-property';
import { CLASS_ATTRIBUTE_NAME } from './attr-utils';

const { domUtils, arrayUtils } = TESTCAFE_CORE;
const { nativeMethods, json }  = hammerhead;

const STORED_ATTRIBUTES_PROPERTY              = '%testcafe-stored-attributes%';
const CUSTOM_STORED_ATTRIBUTES_PROPERTY       = '%testcafe-custom-stored-attributes%';
const ATTRIBUTES_STORED_ON_OUT_EVENT_PROPERTY = '%testcafe-attributes-stored-on-out-event%';

const ALLOWED_ATTRIBUTE_NAMES_RE    = /(^alt$|^name$|^class$|^title$|^data-\S+)/;
const GOOGLE_ANALYTICS_ATTRIBUTE_RE = /^data-ga\S+/;

function isAttributeAcceptableForSelector (attribute, customAttrNames = []) {
    const name  = attribute.nodeName;
    const value = attribute.nodeValue;

    if (!value)
        return false;

    // NOTE: we don't take into account attributes added by TestCafe
    return ALLOWED_ATTRIBUTE_NAMES_RE.test(name) &&
           arrayUtils.indexOf(customAttrNames, name) === -1 &&
           !GOOGLE_ANALYTICS_ATTRIBUTE_RE.test(name) &&
           !domUtils.isHammerheadAttr(name);
}

function getElementAttributes (el, customAtrrNames) {
    const attributes        = nativeMethods.elementAttributesGetter.call(el) || [];
    const defaultAttributes = [];
    const customAttributes  = [];
    let attribute           = null;

    for (let i = 0; i < attributes.length; i++) {
        attribute = attributes[i];

        if (arrayUtils.indexOf(customAtrrNames, attribute.name) !== -1)
            customAttributes.push({ name: attribute.nodeName, value: attribute.nodeValue });
        else if (isAttributeAcceptableForSelector(attribute))
            defaultAttributes.push({ name: attribute.nodeName, value: attribute.nodeValue });
    }

    return { defaultAttributes, customAttributes };
}

export function getAttributesForSelector (element, customAttrNames = []) {
    const storedAttributes = element[STORED_ATTRIBUTES_PROPERTY];

    // NOTE: we don't take class into account because we have a separate rule for it
    if (storedAttributes)
        return arrayUtils.filter(storedAttributes, attr => attr.name !== CLASS_ATTRIBUTE_NAME);

    const attributes            = nativeMethods.elementAttributesGetter.call(element);
    const attributesForSelector = [];
    let attribute               = null;

    for (let i = 0; i < attributes.length; i++) {
        attribute = attributes[i];

        if (attribute.nodeName !== CLASS_ATTRIBUTE_NAME && isAttributeAcceptableForSelector(attribute, customAttrNames))
            attributesForSelector.push({ name: attribute.nodeName, value: attribute.nodeValue });
    }

    return attributesForSelector;
}

export function getAttributeValue (element, attrName) {
    const attributes = element[STORED_ATTRIBUTES_PROPERTY] || nativeMethods.elementAttributesGetter.call(element);
    let attribute    = null;

    for (let i = 0; i < attributes.length; i++) {
        attribute = attributes[i];

        /*eslint-disable no-restricted-properties*/
        if (attribute.name === attrName && attribute.value)
            return attribute.value;
        /*eslint-enable*/
    }

    return null;
}

export function getCustomAttributeForSelector (el, customAttrName) {
    const customStoredAttributes = el[CUSTOM_STORED_ATTRIBUTES_PROPERTY];

    if (customStoredAttributes) {
        const storedAttr = arrayUtils.find(customStoredAttributes, attr => attr.name === customAttrName);

        return storedAttr ? storedAttr : null;
    }

    return el.hasAttribute(customAttrName) ?
        { name: customAttrName, value: el.getAttribute(customAttrName) } : null;
}

export function storeElementAttributes (el, customAtrrNames, isOutEvent = false) {
    // NOTE: in Chrome 'mouseover' event can be raised for
    // document, and document doesn't contain attributes
    /*eslint-disable-next-line no-restricted-properties*/
    if (!el.attributes)
        return;

    const attributes = getElementAttributes(el, customAtrrNames);

    if (isOutEvent)
        setElementProperty(el, ATTRIBUTES_STORED_ON_OUT_EVENT_PROPERTY, attributes);

    else {
        const attributesStoreOnOutEvent = el[ATTRIBUTES_STORED_ON_OUT_EVENT_PROPERTY];
        const shouldStoreAttributes     = !attributesStoreOnOutEvent || json.stringify(attributes) !== json.stringify(attributesStoreOnOutEvent);

        if (shouldStoreAttributes) {
            setElementProperty(el, STORED_ATTRIBUTES_PROPERTY, attributes.defaultAttributes);
            setElementProperty(el, CUSTOM_STORED_ATTRIBUTES_PROPERTY, attributes.customAttributes);
        }
    }
}
