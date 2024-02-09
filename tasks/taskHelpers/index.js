const { cli } = require("cli-ux");

async function promptToProceed(msg) {
    const proceed = await cli.prompt(`${msg} y/N`);
    return ["y", "yes"].includes(proceed.toLowerCase());
}

module.exports = {
    promptToProceed,
};
