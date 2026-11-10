const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function loadTs(path, mocks = {}) {
  const source = fs.readFileSync(path, 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name]
      throw Error('unexpected import: ' + name)
    },
    Map, Set, Date, Number, Math, String,
  }, { filename: path })
  return module.exports
}

const physical = loadTs('lib/nycPhysicalStockCapacity.ts')
const confirmed = qty => ({ status: 'confirmed', verifiedQuantity: qty, source: 'nyc_stock', verifiedAt: new Date() })

test('unavailable NYC physical stock always overrides the Syracuse-mirrored quantity', () => {
  assert.equal(physical.effectiveNycStockQuantity(30, { status: 'unavailable', verifiedQuantity: 0 }), 0)
  assert.equal(physical.effectiveNycStockQuantity(30, confirmed(4)), 4)
  assert.equal(physical.effectiveNycStockQuantity(3, confirmed(10)), 3)
  assert.equal(physical.effectiveNycStockQuantity(30, { status: 'unverified', verifiedQuantity: 0 }), 30)
  assert.equal(physical.effectiveNycStockQuantity(30, null), 30)
  assert.equal(physical.effectiveNycStockQuantity(30, { status: 'confirmed', verifiedQuantity: 7, source: 'unknown', verifiedAt: new Date() }), 30)
  assert.equal(physical.effectiveNycStockQuantity(-3, null), 0)
})

test('transactional NYC checkout capacity uses staff verification, not the copied catalog alone', async () => {
  const inventory = loadTs('lib/nycInventory.ts', {
    'date-fns': {startOfDay:date=>date,endOfDay:date=>date},
    './orderDates': {effectiveEventEndDate:date=>date},
    './nycPhysicalStockCapacity': physical,
  })
  const makeTx = (record, booked = 0) => ({
    item: { findMany: async()=>[{
      id:'nyc-tent', slug:'nyc-tent', name:'NYC tent', quantity:18,
      status:'Available', displayToCustomer:true, bookableAfter:null,
    }] },
    closedDate: {findFirst:async()=>null},
    orderItem: {findMany:async()=>booked?[{itemId:'nyc-tent',quantity:booked}]:[]},
    nycPhysicalStockVerification: {findMany:async()=>record?[{itemSlug:'nyc-tent',...record}]:[]},
  })
  const date=new Date('2027-06-15T12:00:00Z')
  const period={start:date,end:date}
  const requested=new Map([['nyc-tent',3]])
  const unavailable=await inventory.findInventoryShortfalls(makeTx({status:'unavailable',verifiedQuantity:0}),requested,period)
  assert.equal(unavailable.length,1)
  assert.equal(unavailable[0].available,0)
  const capped=await inventory.findInventoryShortfalls(makeTx(confirmed(4),2),requested,period)
  assert.equal(capped.length,1)
  assert.equal(capped[0].available,2)
  const valid=await inventory.findInventoryShortfalls(makeTx(confirmed(4),1),requested,period)
  assert.equal(valid.length,0)
})

test('public NYC availability and checkout capacity apply the same physical stock cap', () => {
  const availability = fs.readFileSync('lib/availability.ts','utf8')
  const inventory = fs.readFileSync('lib/nycInventory.ts','utf8')
  assert.match(availability,/effectiveNycStockQuantity/)
  assert.match(availability,/nycPhysicalStockVerification\.findMany/)
  assert.match(availability,/nycPhysicalStockVerification\.findUnique/)
  assert.match(inventory,/effectiveNycStockQuantity/)
  assert.match(inventory,/tx\.nycPhysicalStockVerification\.findMany/)
  assert.doesNotMatch(inventory,/update.*nycPhysicalStockVerification/)
})
