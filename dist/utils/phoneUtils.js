"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCameroonianPhoneNumber = normalizeCameroonianPhoneNumber;
exports.isValidCameroonianPhoneNumber = isValidCameroonianPhoneNumber;
exports.formatPhoneNumber = formatPhoneNumber;
function normalizeCameroonianPhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber.startsWith('237')) {
        return cleanNumber;
    }
    const numberWithoutCountryCode = cleanNumber.substring(3);
    if (numberWithoutCountryCode.length === 8) {
        return `237${6}${numberWithoutCountryCode}`;
    }
    return cleanNumber;
}
function isValidCameroonianPhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return cleanNumber.startsWith('237') &&
        (cleanNumber.length === 12 || cleanNumber.length === 13);
}
function formatPhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.startsWith('237') && cleanNumber.length >= 12) {
        const countryCode = cleanNumber.substring(0, 3);
        const firstDigit = cleanNumber.substring(3, 4);
        const remaining = cleanNumber.substring(4);
        const formattedRemaining = remaining.match(/.{1,2}/g)?.join(' ') || remaining;
        return `+${countryCode} ${firstDigit} ${formattedRemaining}`;
    }
    return phoneNumber;
}
//# sourceMappingURL=phoneUtils.js.map