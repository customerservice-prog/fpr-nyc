const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

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

test('actual checkout drafts, email quote and final order retain imported Navy and White as server-approved names', () => {
  assert.equal(drafts.length, 2, 'Checkout draft and email quote each serialize rental names')
  assert.equal(payment.length, 2, 'Payment-page draft and final order each serialize rental names')
  const items = ['Navy', 'White'].map((selectedColor, index) => ({ id: 'linen', name: 'Round Linen', selectedColor, quantity: index + 2, price: 30 }))
  for (const serialize of [...drafts, ...payment]) {
    const submitted = serialize(items)
    assert.deepEqual(submitted.map(line => [line.name, line.quantity, line.unitPrice ?? line.price]), [['Round Linen (Navy)', 2, 30], ['Round Linen (White)', 3, 30]])
    assert.deepEqual(submitted.map(line => checkoutLineName('Round Linen', ['Navy', 'White'], line.name)), ['Round Linen (Navy)', 'Round Linen (White)'])
  }
})

test('actual checkout rental summary renders distinct approved linen colors, quantities and amounts', () => {
  const file = 'app/(public)/checkout/page.tsx'
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let summary
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(source) === 'items' && node.expression.name.text === 'map') {
      const callback = node.arguments[0]
      let body = ts.isArrowFunction(callback) ? callback.body : null
      if (body && ts.isParenthesizedExpression(body)) body = body.expression
      if (body && ts.isJsxElement(body)) summary = node.getText(source)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(summary, 'Execute the actual checkout summary JSX')
  const flow = ts.createSourceFile('flow.ts', fs.readFileSync('lib/rentsketchBookingFlow.ts', 'utf8'), ts.ScriptTarget.Latest, true)
  const keyFunction = flow.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'cartVariantKey')
  assert.ok(keyFunction)
  const code = ts.transpileModule(keyFunction.getText(flow) + '\nexport const renderSummary = items => (' + summary + ');', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const context = { exports: {}, cartCheckoutLineName, formatCurrency: value => '$' + value.toFixed(2), require }
  vm.runInNewContext(code, context)
  const items = ['Hunter Emerald Green', 'Navy Blue'].map((selectedColor, index) => ({
    id: 'cmunkulfu0031nvjhcw17lcr5', name: '120 inch Round Polyester Tablecloth', selectedColor, quantity: index + 2, price: 34,
  }))
  const rows = context.exports.renderSummary(items)
  assert.equal(new Set(rows.map(row => row.key)).size, 2)
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, ...rows))
  assert.match(html, /120 inch Round Polyester Tablecloth \(Hunter Emerald Green\) x2/)
  assert.match(html, /120 inch Round Polyester Tablecloth \(Navy Blue\) x3/)
  assert.match(html, /\$68\.00/)
  assert.match(html, /\$102\.00/)
  for (const row of rows) {
    assert.match(row.props.className, /gap-3/)
    assert.match(row.props.children[0].props.className, /min-w-0 break-words/)
    assert.match(row.props.children[1].props.className, /shrink-0 whitespace-nowrap/)
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
