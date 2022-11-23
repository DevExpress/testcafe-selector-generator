import hammerhead from '../../deps/hammerhead';

//NOTE: eslint-plugin-hammerhead throws an error when using destructing
const nativeMethods = hammerhead.nativeMethods;

export function setElementProperty (element, propertyName, propertyValue) {
    if (!(propertyName in element)) {
        let value;


        nativeMethods.objectDefineProperty.call(window, element, propertyName, {
            get: function () {
                return value;
            },

            set: function (val) {
                value = val;
            },
        });
    }

    element[propertyName] = propertyValue;
}
