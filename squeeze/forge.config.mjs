module.exports = {
    packagerConfig: {
        asar: true
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "juice_extractor"
            }
        }
    ]
};
