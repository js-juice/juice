export const layout = {
    gap: "1rem",
    minColumnWidth: "16rem",
    maxColumns: 4,
    collapseAt: "42rem",
    columnChars: 12,
    spanPaddingChars: 2,
    groupGap: "0.85rem"
};

export const presets = {
    zip: {
        match: ["zip", "zipcode", "postal", "postalcode", "postcode"],
        span: 1,
        group: "address"
    },
    state: {
        match: ["state", "province", "region"],
        span: 1,
        group: "address"
    },
    city: {
        match: ["city", "town"],
        span: 2,
        group: "address"
    },
    address_line: {
        match: [/address/i, /street/i, "line1", "line2"],
        span: "full",
        group: "address"
    },
    first_name: {
        match: ["firstname", "first_name", "givenname"],
        span: 1,
        group: "person"
    },
    middle_name: {
        match: ["middlename", "middle_name"],
        span: 1,
        group: "person"
    },
    last_name: {
        match: ["lastname", "last_name", "surname"],
        span: 1,
        group: "person"
    },
    email: {
        match: ["email", "emailaddress"],
        span: 2,
        group: "contact"
    },
    phone: {
        match: ["phone", "mobile", "tel", "telephone"],
        span: 2,
        group: "contact"
    }
};

export const groups = {
    address: {
        gapBefore: "1rem"
    },
    person: {
        gapBefore: "0.75rem"
    },
    contact: {
        gapBefore: "0.75rem"
    }
};

export default {
    layout,
    presets,
    groups
};
