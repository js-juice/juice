/**
 * Runnable examples for data/validate.
 * @module data/validate/examples
 */

import Validator from "./Validator.mjs";

/**
 * Print a titled result block.
 * @param {string} title - Section name.
 * @param {*} value - Output value.
 */
function print(title, value) {
    console.log(`${title}:`, value);
}

async function run() {
    const fieldValidator = Validator.make({
        email: "required|email"
    });

    const emailValid = await fieldValidator.test("email", "bad-email");
    print("email valid", emailValid);
    print("email messages", fieldValidator.messages("email"));

    const objectValidator = Validator.make({
        email: "required|email",
        age: "required|number|min:18"
    });

    const payloadValid = await objectValidator.validate({
        email: "hello@example.com",
        age: 21
    });
    print("payload valid", payloadValid);
    print("all messages", objectValidator.messages());

    const user = Validator.watchObject(
        { username: "jo" },
        { username: "required|min:3" }
    );
    await user.validator.test("username", user.username);
    print("watchObject username messages", user.validator.messages("username"));
}

run().catch((error) => {
    console.error("validate examples failed:", error);
    process.exitCode = 1;
});
