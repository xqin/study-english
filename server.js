const http = require('request')
const express = require('express')
const app = express()

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

const get = (url) => new Promise((resolve, reject) => http.get(url, (e, res, body) => e ? reject(e) : resolve(body)))
const dict = (word) => get(`http://dict.cn/${encodeURIComponent(word)}`).then((html) => {
  html = html.replace(/<script[\s\S]+?<\/script>/g, '')

  let symbol, exp, audios

  const phonetic = getRegValue(/<div class="phonetic">([\s\S]+?)<\/div>/, html)

  if (phonetic) {
    // 英 <bdo>['dɪkt]</bdo>
    symbol = getRegValues(/<span>(.\s+<bdo lang="EN-US">.+?<\/bdo>)/g, phonetic)

    if (symbol) {
      symbol = symbol.map((v) => v.replace(/^(.)\s+/, '$1'))
    }

    audios = getRegValues(/naudio="(.+?)" title/g, phonetic)

    if (audios) {
      audios = audios.map((audioId) => `http://audio.dict.cn/${audioId}`)
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

  return { audios, exp, symbol, word, english: /^[a-z\-]+$/i.test(word) }
}, (e) => {
  console.error(e)
  return {}
})

app.get('/dict', function (req, res) {
  const { word } = req.query

  if (!word) {
    return res.jsonp({})
  }

  dict(word).then((json) => res.jsonp(json))
})

app.use(express.static('public'))

app.listen(80, () => {
  console.log('Study Service Start ...')
})
