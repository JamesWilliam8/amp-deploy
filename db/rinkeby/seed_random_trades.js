let { addresses } = require('./addresses.json')

const utils = require('ethers').utils
const MongoClient = require('mongodb').MongoClient
const faker = require('faker')
const url = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const { generatePricingData, interpolatePrice } = require('../../utils/prices')

let exchangeAddress = '0x7400d4d4263a3330beeb2a0d2674f0456054f217'
let minAmount = 0.1
let maxAmount = 10000
let ether = 1e18

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const randomHash = () => utils.sha256(utils.randomBytes(100))
const randomElement = (arr) => arr[randInt(0, arr.length-1)]

let randomBigAmount = () => {
  let ether = utils.bigNumberify("1000000000000000000")
  let amount = utils.bigNumberify(randInt(0, 100000))
  let bigAmount = amount.mul(ether).div("100").toString()

  return bigAmount
}

const seed = async () => {
  const client = await MongoClient.connect(url, { useNewUrlParser: true })
  const db = client.db('proofdex')

  const pairDocuments = await db.collection('pairs').find({}, {
    baseTokenSymbol: 1,
    baseTokenAddress: 1,
    quoteTokenSymbol: 1,
    quoteTokenAddress: 1,
    pairMultiplier: 1
  }).toArray()

  let pairs = []
  pairDocuments.forEach(pair => {
    pairs.push({
      baseTokenAddress: pair.baseTokenAddress,
      baseTokenSymbol: pair.baseTokenSymbol,
      quoteTokenAddress: pair.quoteTokenAddress,
      quoteTokenSymbol: pair.quoteTokenSymbol,
      priceMultiplier: pair.priceMultiplier,
    })
  })

  for (let pair of pairs) {
    let trades = []
    let start = new Date(2018, 1, 1)
    let end = new Date(Date.now())
    let pricingData = generatePricingData(start, end)
    let numberOfOrders = 30000

    for (let i = 0; i < numberOfOrders; i++) {
      let taker = randomElement(addresses)
      let maker = randomElement(addresses.filter(address => address !== taker))
      let makerOrderHash = randomHash()
      let hash = randomHash()
      let amount = randomBigAmount()
      let status = 'SUCCESS'
      let txHash = randomHash()
      let takerOrderHash = randomHash()
      let pairName = `${pair.baseTokenSymbol}/${pair.quoteTokenSymbol}`
      let createdAt = new Date(faker.date.between(start.toString(), end.toString()))
      let timestamp = createdAt.getTime()
      let interpolatedPricepoint = interpolatePrice(pricingData, timestamp)
      let pricepoint = Math.floor(interpolatedPricepoint + interpolatedPricepoint * 0.05 * (faker.random.number(100) / 100)).toString()

      let trade = {
        taker,
        maker,
        hash,
        baseToken: pair.baseTokenAddress,
        quoteToken: pair.quoteTokenAddress,
        makerOrderHash,
        status,
        txHash,
        takerOrderHash,
        pairName,
        pricepoint,
        amount,
        createdAt
      }

      trades.push(trade)
    }

    await db.collection('trades').insertMany(trades)
    console.log(`Inserted ${pair.baseTokenSymbol}/${pair.quoteTokenSymbol}`)
  }

  client.close()
}

seed()


