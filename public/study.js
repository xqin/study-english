var AudioContext = window.AudioContext || window.webkitAudioContext

function getAudioContext () {
  return new AudioContext()
}

function play(data) {
  // create audio context
  var context = getAudioContext()

  context.decodeAudioData(data, function (audioBuffer) {
    // create audio source
    var source = context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(context.destination)

    // play audio
    source.start()
  })
}

function fetchAudio (url) {
  return fetch(url).then(function (response) { return response.arrayBuffer() })
}

/**
 * 这里不使用 new Audio 直接进行播放是因为使用该方式 chrome 向服务器发送请求时会带有 Range: 0- 请求头, 导致该请求的内容不能被 nginx 缓存起来
 */
function playAudio (url) {
  return fetchAudio(url).then(play)
}

new Vue({
  el: '#app',
  data: function () {
    var history = JSON.parse(localStorage.getItem('history') || '[]')

    return {
      history: history,
      dict: null,
      loading: false,
      word: ''
    }
  },
  watch: {
    word () {
      document.documentElement.scrollTop = 0
    }
  },
  methods: {
    saveHistory () {
      localStorage.setItem('history', JSON.stringify(this.history))
    },
    toDate (now) {
      var date = new Date(now)

      var y = date.getFullYear()
      var m = '00' + (date.getMonth() + 1)
      var d = '00' + date.getDate()
      var h = '00' + date.getHours()
      var mm = '00' + date.getMinutes()
      var s = '00' + date.getSeconds()


      return [y, '-', m.substr(-2), '-', d.substr(-2), ' ', h.substr(-2), ':', mm.substr(-2), ':', s.substr(-2)].join('')
    },
    genPronHtml (pron, idx) {
      var audios = this.dict && this.dict.audios || []

      var html = pron

      if (audios[idx]) {
        html += '<i class="audio girl" title="女生版发音" url="'+ audios[idx * 2] +'" onclick="playAudio(this.getAttribute(\'url\'))">&nbsp;</i>'
        html += '<i class="audio boy" title="男生版发音" url="'+ audios[idx * 2 + 1] +'" onclick="playAudio(this.getAttribute(\'url\'))">&nbsp;</i>'
      }

      return html
    },

    query (word) {
      this.word = word

      var historyIndex = this.history.findIndex((history) => history.dict.word === word)

      if (historyIndex !== -1) {
        this.dict = this.history[historyIndex].dict

        this.history.unshift(this.history.splice(historyIndex, 1)[0])
      } else {
        this.search()
      }
    },

    search () {
      var vm = this
      var word = vm.word

      if (!word) {
        return vm.$message.error('请输入内容！')
      }

      vm.loading = true

      fetch('dict?word=' + encodeURIComponent(word))
      .then(function (response) { return response.json() })
      .then(function (dict) {
        vm.dict = dict

        if (!dict || !dict.exp) {
          vm.$message.error('查询无结果！')
          return
        }

        vm.history = vm.history.filter((h) => h.dict.word !== word) // 从历史记录中过滤掉与当前单词相同的内容

        // 保存至历史记录中
        vm.history.unshift({date: Date.now(), dict})
        vm.saveHistory()
      }, function (e) {
        vm.$message.error('查询出错，请重试！')
      }).then(function () {
        vm.loading = false
      })
    }
  }
})
