const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file) {
  const module = { exports: {} }
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(compiled, { module, exports: module.exports })
  return module.exports
}
const { cartCheckoutLineName } = load('lib/nycCartLineName.ts')
const { checkoutLineName } = load('lib/nycCheckoutPricing.ts')

// Execute the actual name-bearing item arrays from the checkout/draft/order
// request bodies, without mounting payment controls or sending any requests.
function payloadMaps(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const maps = []
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'items'
      && ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)
      && node.initializer.expression.expression.getText(source) === 'items'
      && node.initializer.expression.name.text === 'map') {
      const callback = node.initializer.arguments[0]
      let body = ts.isArrowFunction(callback) ? callback.body : null
      if (body && ts.isParenthesizedExpression(body)) body = body.expression
      if (body && ts.isObjectLiteralExpression(body) && body.properties.some(property => property.name?.getText(source) === 'name')) {
        const code = node.initializer.getText(source)
        maps.push(items => {
          const result = vm.runInNewContext(code, { items, cartCheckoutLineName })
          return JSON.parse(JSON.stringify(result))
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return maps
}
const drafts = payloadMaps('app/(public)/checkout/page.tsx')
const payment = payloadMaps('app/(public)/checkout/payment/page.tsx')

test('actual checkout drafts and final order payload retain imported Navy and White as server-approved names', () => {
  assert.equal(drafts.length, 1)
  assert.equal(payment.length, 2, 'Payment-page draft and final order each serialize rental names')
  const items = ['Navy', 'White'].map((selectedColor, index) => ({ id: 'linen', name: 'Round Linen', selectedColor, quantity: index + 2, price: 30 }))
  for (const serialize of [...drafts, ...payment]) {
    const submitted = serialize(items)
    assert.deepEqual(submitted.map(line => [line.name, line.quantity, line.unitPrice]), [['Round Linen (Navy)', 2, 30], ['Round Linen (White)', 3, 30]])
    assert.deepEqual(submitted.map(line => checkoutLineName('Round Linen', ['Navy', 'White'], line.name)), ['Round Linen (Navy)', 'Round Linen (White)'])
  }
})

test('already labeled storefront colors stay canonical once and unknown colors cannot enter the order name', () => {
  for (const serialize of [...drafts, ...payment]) {
    const submitted = serialize([
      { id: 'linen', name: 'Round Linen (White)', selectedColor: 'White', quantity: 1, price: 30 },
      { id: 'linen', name: 'Round Linen', selectedColor: 'FREE', quantity: 1, price: 30 },
      { id: 'tent', name: 'Pole Tent', quantity: 1, price: 425 },
    ])
    assert.equal(submitted[0].name, 'Round Linen (White)')
    assert.equal(checkoutLineName('Round Linen', ['Navy', 'White'], submitted[0].name), 'Round Linen (White)')
    assert.equal(checkoutLineName('Round Linen', ['Navy', 'White'], submitted[1].name), 'Round Linen')
    assert.equal(checkoutLineName('Pole Tent', [], submitted[2].name), 'Pole Tent')
  }
})
