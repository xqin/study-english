const http = require('request').defaults({
  timeout: 5000,
})
const express = require('express')
const app = express()
const crypto = require('crypto')
const fs = require('fs')

const md5 = (str) => {
  const hash = crypto.createHash('md5')
  return hash.update(str, 'binary').digest('hex')
}

/**
 * 从指定的数据中， 获取 正则表达式 的所有可匹配到的结果
 * @param {RegExp} reg 正则表达式
 * @param {string} data 数据
 * @returns 当无匹配结果时， 返回 undefined, 有匹配结果时， 返回数组， 数据中每一项保存 正则表达式 每次的匹配结果
 */
const getRegValues = (reg, data) => {
  const values = []

  let t

  while ((t = reg.exec(data)) !== null) {
    values.push(RegExp.$1)
  }

  if (values.length > 0) {
    return values
  }
}

const getRegValue = (reg, data) => {
  if (reg.test(data)) {
    return RegExp.$1
  }
}

const cache_file = './cache.json'
const cache = {}
let t = null

const save2Cache = () => {
  clearTimeout(t)
  t = setTimeout(() => {
    fs.writeFileSync(cache_file, JSON.stringify(cache, 0, 2))
  }, 500)
}

try { Object.assign(cache, require(cache_file)) } catch (e) {}

const get = (url) => new Promise((resolve, reject) => http.get(url, (e, res, body) => e ? reject(e) : resolve(body)))
const dict = (word) => {
  const key = md5(word)

  if (typeof cache[key] !== 'undefined') {
    return Promise.resolve(Object.assign({ cache: true }, cache[key]))
  }

  return get(`http://dict.cn/${encodeURIComponent(word)}`).then((html) => {
    html = html.replace(/<script[\s\S]+?<\/script>/g, '')

    let symbol, exp, audios

    const phonetic = getRegValue(/<div class="phonetic">([\s\S]+?)<\/div>/, html)

    if (phonetic) {
      symbol = getRegValues(/<span>(.\s+<bdo lang="EN-US">.+?<\/bdo>)/g, phonetic) // 英 <bdo>['dɪkt]</bdo>

      if (symbol) {
        symbol = symbol.map((v) => v.replace(/^(.)\s+/, '$1'))
      }

      audios = getRegValues(/naudio="(.+?)" title/g, phonetic)

      if (audios) {
        audios = audios.map((audioId) => `/audio/${audioId}`)
      }
    }

    let dict = getRegValue(/<ul class="dict-basic-ul">([\s\S]+?)<\/ul>/, html)

    if (dict) {
      exp = getRegValues(/<li>\s+((?:<span>.+?<\/span>\s+)?<strong>.+?<\/strong>)\s+<\/li>/g, dict)

      if (exp) {
        exp = exp.map((v) => v.replace(/[\n\t]+/g, ' '))
      }
    } else {
      dict = getRegValue(/<div class="layout cn">([\s\S]+?)<\/div>/, html)

      exp = getRegValues(/<a href=".+?">\s+(\w+)\s+<\/a>/g, dict)
    }

    const result = { symbol, exp, audios, word, english: /^[a-z\-]+$/i.test(word) }

    if (exp) {
      cache[key] = result
      save2Cache()
    }

    return result
  }, (e) => {
    console.error(`query word: [${word}] error`, e)
    return {}
  })
}

app.get('/dict', function (req, res) {
  let { word } = req.query

  if (!word || word.length > 0x2f) { // 最长的单词 pneumonoultramicroscopicsilicovolcanoconiosis 45 个字符
    return res.jsonp({})
  }

  word = word.toLowerCase() // 不管前端传入什么内容， 都统一转换为小写字母

  dict(word).then((json) => res.jsonp(json))
})

app.use(express.static('public'))

app.listen(80, () => {
  console.log('Study Service Start ...')
})
