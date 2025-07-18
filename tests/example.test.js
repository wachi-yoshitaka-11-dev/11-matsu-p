// tests/example.test.js

// This is an example test file.
// You would typically use a testing framework like Jest or Mocha.

function sum(a, b) {
    return a + b;
}

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(error);
    }
}

test('sum function should add two numbers', () => {
    const result = sum(1, 2);
    if (result !== 3) {
        throw new Error(`Expected 3, but got ${result}`);
    }
});

test('sum function should handle negative numbers', () => {
    const result = sum(-1, 1);
    if (result !== 0) {
        throw new Error(`Expected 0, but got ${result}`);
    }
});
