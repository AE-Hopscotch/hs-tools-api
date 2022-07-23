const express = require('express')
const router = express.Router()
// const { Deta } = require('deta')
const axios = require('axios')

// const deta = Deta(process.env.PROJECT_KEY)
function jsContentHeader (req, res, next) {
  res.header({ 'Content-Type': 'application/javascript' })
  next()
}

async function getLatestPlayers (req, res, version, channel) {
  const INDEX_RESPONSE = (await axios({
    'method': 'GET',
    'url': `https://d3nbkco6xo1vz0.cloudfront.net/${channel || 'production'}/INDEX`,
    'headers': {
      'Host': 'd3nbkco6xo1vz0.cloudfront.net',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Accept-Language': 'en-us'
    }
  }))?.data
  const EDITOR_INDEX_RESPONSE = (await axios({
    'method': 'GET',
    'url': `https://d3nbkco6xo1vz0.cloudfront.net/${channel || 'production'}/EDITOR_INDEX`,
    'headers': {
      'Host': 'd3nbkco6xo1vz0.cloudfront.net',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Accept-Language': 'en-us'
    }
  }))?.data?.editor_table?.webplayers
  const INDEX = Object.assign(INDEX_RESPONSE, EDITOR_INDEX_RESPONSE)
  if (typeof INDEX_RESPONSE !== 'object' || typeof EDITOR_INDEX_RESPONSE !== 'object') {
    res.status(500).send({ error: 'Internal Server Error' })
    return
  }

  const versions = Object.entries(INDEX).sort((a, b) => {
    const semanticA = a[0].split('.')
    const semanticB = b[0].split('.')
    return semanticA[0] - semanticB[0] ||
      semanticA[1] - semanticB[1] ||
      semanticA[2] - semanticB[2]
  })
  const latest = versions.filter((x, i) => {
    const thisSemVer = x[0].split('.')
    const nextVersionID = versions[i + 1]
    if (!nextVersionID) return true
    const nextSemVer = nextVersionID[0].split('.')
    return nextSemVer[0] > thisSemVer[0] || nextSemVer[1] > thisSemVer[1]
  }).map(pair => {
    pair[1].player = pair[0]
    pair[0] = pair[0].replace(/^(\d+\.\d+)\.\d+$/, '$1')
    return pair
  })
  const latestDict = Object.fromEntries(latest)
  version = version?.replace(/^(\d+\.\d+)\.\d+$/, '$1')
  return version ? latestDict[version] || null : latestDict
}

async function getPlayerFile (req, res) {
  const version = req.params.version
  const channel = req.query.channel || 'production'
  const latest = req.query.newest !== '0'
    ? await getLatestPlayers(req, res, version, channel)
    : { path: `versions/${version}/webplayer.min.js`, date: Date.now(), pixi: '4.8.6', 'player': version }

  if (!latest) {
    res.status(404).header({ 'Content-Type': 'application/json' }).send(String(latest))
    return null
  }
  const playerResponse = (await axios({
    'method': 'GET',
    'url': `https://d3nbkco6xo1vz0.cloudfront.net/${channel}/${latest.path}`,
    'headers': {
      'Host': 'd3nbkco6xo1vz0.cloudfront.net',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Accept-Language': 'en-us'
    }
  }).catch(e => {
    res.status(404).header({ 'Content-Type': 'application/json' }).send('null')
  }))?.data

  if (!playerResponse || res.headersSent) return
  return playerResponse
}

// Strip .js extension from all requests containing version
router.param('version', function (req, res, next) {
  req.params.version = req.params.version.replace(/\.js$/, '')
  next()
})

router.get('/metadata/:version?', async (req, res) => {
  const latest = await getLatestPlayers(req, res, req.params.version, req.query.channel)
  if (!latest) return res.header({ 'Content-Type': 'application/json' }).send(String(latest))
  res.send(latest)
})

router.get('/:version', jsContentHeader, async (req, res) => {
  const playerFile = await getPlayerFile(req, res)
  if (!playerFile) return
  res.send(playerFile)
})

router.get('/:version/project-datatypes', async (req, res) => {
  // Validate callback or variable name if they exist
  if (req.query.callback && req.query.var) return res.status(400).send({ error: 'Please specify either callback OR variable name' })
  const name = req.query.callback || req.query.var
  const keywords = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield']
  if (name && (!name.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) || keywords.includes(name))) return res.status(400).send({ error: 'Invalid callback or variable name' })

  const playerFile = await getPlayerFile(req, res)
  if (!playerFile) return

  const matches = playerFile.match(/\{(?:(\w)\[\1\.([0-9a-zA-Z_]+)=[\de]+]="\2"(?:,[\n\s]?(?=\1)|[\n\s]?(?=\})))+\}/g)
    .map(cluster => {
      const matchRegex = '(\\w)\\[\\1\\.([0-9a-zA-Z_]+)=([\\de]+)]="\\2"'
      const entries = cluster.match(new RegExp(matchRegex, 'g'))
        .map(item => {
          const match = item.match(new RegExp(matchRegex))
          return [match[3], match[2]]
        })
      return Object.fromEntries(entries)
    })
  const typeEntries = matches.filter(entry => {
    // An 'events' type seem to also exist, but they don't seem to be useful (type[1239] === 'HSEventOnStart')
    return Object.values(entry).some(value => ['WaitTilTimestamp', 'monkey', 'LineWidth'].includes(value))
  }).map(type => {
    switch (true) {
      case type[19] === 'WaitTilTimestamp':
        return ['blocks', type]
      case type[0] === 'monkey':
        return ['objects', type]
      case type[43] === 'LineWidth':
        return ['parameters', type]
      default:
        return []
    }
  })
  const types = Object.assign(Object.fromEntries(typeEntries), { length: typeEntries.length })
  if (!name) return res.send(types)
  res.header('Content-Type', 'application/javascript')
  if (req.query.callback) res.send(`${name}(${JSON.stringify(types)})`)
  else res.send(`${name} = ${JSON.stringify(types)}`)
})

router.get('/:version/modded', jsContentHeader, async (req, res) => {
  let playerFile = await getPlayerFile(req, res)
  if (!playerFile) return

  const customInclude = req.query.include?.split(' ') || []
  const customExclude = req.query.exclude?.split(' ') || []

  function includeMod (mod, defaultOpt) {
    if (customInclude.includes(mod)) return true
    if (customExclude.includes(mod)) return false
    if (customInclude.includes('ALL')) return true
    if (customExclude.includes('ALL')) return false
    return defaultOpt
  }

  const config = {
    containerfix: includeMod('CF', true),
    customs: includeMod('CC', true),
    emojiSrc: includeMod('ES', true),
    dataRetriever: includeMod('DR', true),
    soundSrc: includeMod('SS', true),
    aewebact: includeMod('AE', true),
    includeWebactScript: includeMod('IW', false),
    projectLinkPatch: includeMod('PL', true),
    promptDefaults: includeMod('PD', true),
    screensizefix: includeMod('SF', true),
    screenshots: includeMod('SC', true),
    customsounds: includeMod('CS', true),
    errorLogs: includeMod('EL', true)
  }
  let fails = 0
  let totalSubs = 0
  function replacement (regex, replacer, skipfails) {
    const newFile = playerFile.replace(regex, replacer)
    const success = newFile !== playerFile
    if (!success && !skipfails) {
      fails++
      console.log('Failed:', regex)
    }
    totalSubs++
    playerFile = newFile
    return { success }
  }
  const semVer = req.params.version.split('.')
  if (config.emojiSrc) replacement(/(emoji.basePath=)"\/assets"/g, '$1"https://d2j12ek52gvmx9.cloudfront.net/emojis/"', true)
  if (config.dataRetriever) replacement(/(\w=document\.getElementById\("project_data"\),)(\w)=\w.dataset[^;]+"data"\);/, '$1$2=JSON.stringify(AE_MOD.projectData) /*AE_MOD*/;')
  if (config.soundSrc) {
    replacement(
      /"https:\/\/d2jeqdlsh5ay24\.cloudfront\.net\/"\+this\.name\+"\.(?:mp3"|"\+this\.extension)/,
      '"https://ae-hopscotch.github.io/hs-tools/play-project/hopscotch-sounds/"+this.name+"."+(this.extension||"mp3") /*AE_MOD*/;'
    )
  }
  if (config.aewebact) {
    replacement(
      /((\w\.)?HSBlockType\.SetWidthAndHeight:(?:.(?!break)){0,24}\.setWidth\((\w).+?)\}\},/,
      "$1;break;case $2HSBlockType.None: /*AE_MOD*/ if (/^_ae_webplayer_action:/g.test($3[0].value)){AE_MOD.webplayer_action($3[0].value.split('_ae_webplayer_action:')[1], (($3[1])?$3[1].computedValue(this):undefined),this);}break;" +
        // Also support the official comment block
        "case $2HSBlockType.Comment: /*AE_MOD*/ if (/^_ae_webplayer_action:/g.test($3[0].value)){AE_MOD.webplayer_action($3[0].value.split('_ae_webplayer_action:')[1], (($3[1])?$3[1].computedValue(this):undefined),this);}break;}},"
    )
    // For 1.5.x and earlier
    const details = replacement(
      /case (\w\.)?HSBlockType.MathOperatorAdd:\w+\s?.{0,24}(Param(?:eter)?Value)\((\w)\)/,
      "case $1HSBlockType.None: /*AE_MOD*/ if(/^_ae_webplayer_action:/g.test(this.parameters[0].value)){return AE_MOD.webplayer_action(this.parameters[0].value.split('_ae_webplayer_action:')[1],((this.parameters[1])?this.second$2($3):undefined),this);}return 0;$&",
      true
    )
    if (!details.success) {
      // Ignore the previous fail because we're on a newer player version
      replacement(
        /case (\w\.)?HSBlockType.MathOperatorAdd:\w+\s?.{0,24}parseValue\((\w).{0,36}parseValue\((\w)/,
        "case $1HSBlockType.None: /*AE_MOD*/ if(/^_ae_webplayer_action:/g.test($2)){return AE_MOD.webplayer_action($2.split('_ae_webplayer_action:')[1],$3,this);}return 0;$&"
      )
      // Force BlockType None to perform a math calculation
      replacement(
        /case (\w\.)?HSBlockType\.Random110:case \1HSBlockType\.Random1100:case \1HSBlockType\.Random11000:case \1HSBlockType\.Random:/,
        '$&case $1HSBlockType.None:'
      )
    }
  }
  if (config.includeWebactScript) {
    const BUNDLED_AEWEBACTIONS = [
      'function getPref (){}',
      // eslint-disable-next-line
      'AE_MOD={approvedHostList:["*.gethopscotch.com"],webplayer_action:function(a,b,c){try{function onList(a){return!!a.match(new RegExp("^("+AE_MOD.approvedHostList.join("|").replace(/\\*/g,".*?")+")$"))};"object"!=!typeof c&&/^.{1,3}$/.test(Object.getPrototypeOf(c||{}).constructor.name)||(isTrusted=!1,console.warn("Untrusted Event"));try{a=JSON.parse(a.replace(/"_data"/g,b).replace(/"_data_escaped"/g,JSON.stringify(b))),a.args=a.args||[]}catch(b){return void console.error("Invalid webplayer action:"+a)}switch(a.name){case"restart":document.getElementById("restart-button").click();break;case"js-console-log":console.log("%cAwesome_E\\u2019s Project Player%c "+a.args,"display:inline-block; padding: 4px 6px; background-color: salmon; color: white; font-weight: bold;","");break;case"js-alert":alert(a.args);break;case"js-prompt":return prompt(a.args[0],a.args[1]||"");case"checkKey":return+a.args.map(function(a){return AE_MOD.keyboardKeys.includes(a)}).includes(!0);case"checkKeyData":return+AE_MOD.keyboardKeys.includes(b);case"checkKeyAll":return+!a.args.map(function(a){return AE_MOD.keyboardKeys.includes(a)}).includes(!1);case"getGamepadCount":return[...navigator.getGamepads()].filter(a=>!!a).length;case"checkControllerButton":{const b=navigator.getGamepads()[a.args[0]];if(!b)return 0;if(!+a.args[1])return b.buttons[a.args[2]]?.value||0;const c=Array.isArray(a.args[2])?a.args[2]:[a.args[2]],d=1==a.args[1]?"some":"every";return+c[d](a=>b.buttons[a]?.pressed||0)}case"checkControllerAxis":{const b=navigator.getGamepads()[a.args[0]];return b?b.axes[a.args[1]]||0:0}case"scrollData":return AE_MOD.mouseWheelData[a.args[0]];case"isWebExp":return 1;case"isComputer":return+(!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)&&!("MacIntel"===navigator.platform&&1<navigator.maxTouchPoints));case"user-tz":return Math.round(new Date().getTimezoneOffset()/-60);case"user-darkmode":return+window.matchMedia("(prefers-color-scheme: dark)").matches;case"savedata-write":return LS_ACCESS?(localStorage.setItem("pData_"+AE_PROJECT_UUID,a.args.join("")),1):(alert("Unable to save data. Make sure third-party cookies are allowed for ae-hopscotch.github.io so that the project has access to local storage"),0);case"savedata-read":if(!LS_ACCESS)return alert("Save data cannot be accessed within this frame."),0;function maskedEval(a){var b={data:localStorage.getItem("pData_"+AE_PROJECT_UUID)};for(p in this)b[p]=void 0;return new Function("with(this) { return eval("+JSON.stringify(a)+") }").call(b)}try{return maskedEval(a.args.join(""))}catch(a){return 0}break;case"newsave-read":case"newsave-write":case"newsave-delete":{if(!LS_ACCESS)return alert("Save data cannot be created within this frame."),0;let b=localStorage.getItem("new_pData_"+AE_PROJECT_UUID)||{};try{b=JSON.parse(b)}catch(a){b={}}if("newsave-read"===a.name)return b[a.args[0]]||a.args[1];"newsave-delete"===a.name?delete b[a.args[0]]:b[a.args[0]]=a.args[1],localStorage.setItem("new_pData_"+AE_PROJECT_UUID,JSON.stringify(b));break}case"globalvar-connect":if(AE_MOD.globalvarsConnected)return;firebase.database().ref("global-variables/"+(AE_USER_ID||-1)+"/").once("value").then(function(a){AE_MOD.globalvars=a.val()||{},AE_MOD.globalvarsConnected=!0}),firebase.database().ref("global-variables/"+(AE_USER_ID||-1)+"/").on("value",function(a){AE_MOD.globalvarsConnected&&(AE_MOD.globalvars=a.val()||{})});break;case"globalvar-read":return AE_MOD.globalvars[a.args[0]];break;case"globalvar-write":if(!isTrusted&&!a.args[0].match(/^@UNLOCKED_/g))return alert("Cannot write global data: untrusted code execution");firebase.database().ref("global-variables/"+(AE_USER_ID||-1)+"/"+a.args[0].replace(/[\\.#\\$\\[\\]]/g,"")).set(a.args[1]);break;case"url-iframe":if(a.args[0]){try{if(host=new URL(a.args[0]).host,origin=new URL(a.args[0]).origin,host&&!onList(host))return-1==AE_MOD.pendingHostList.indexOf(origin)&&AE_MOD.pendingHostList.push(origin),alert("This URL has not been approved")}catch(a){return alert("Invalid URL")}let b=document.getElementById("projectIframeDiv");b.style.display="block";let c=b.querySelector("iframe")||document.createElement("iframe");c.src=a.args[0].match(/^https?:\\/\\/.*?\\.github\\.io|data:/)?a.args[0]:"https://api.allorigins.win/raw?url="+encodeURIComponent(a.args[0]),b.appendChild(c),setTimeout(function(){b.style.bottom=0},0),b.querySelector("button").onclick||(b.querySelector("button").onclick=function(){b=document.getElementById("projectIframeDiv"),b.style.bottom="-100vh",setTimeout(()=>{b.querySelector("iframe").remove(),b.style.display="none"},1e3)})}break;case"url-goto":if(a.args[0]){try{if(host=new URL(a.args[0]).host,origin=new URL(a.args[0]).origin,console.log(host,origin),host&&!onList(host))return-1==AE_MOD.pendingHostList.indexOf(origin)&&AE_MOD.pendingHostList.push(origin),alert("This URL has not been approved")}catch(a){return alert("Invalid URL")}location.href=a.args[0]}break;case"achievement":var target=document.getElementById("achievement-banner");target.innerHTML="",target.innerHTML=a.args[1]?`<img src="${a.args[2]||"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="}" width="48"/> <div><span class="achievement-name">${a.args[0]}</span> <span class="achievement-description">${a.args[1]}</span></div><i class="fa fa-close" onclick="banner(false)"></i>`:a.args[0],banner(!0);break;case"userdata-load":XHR.requestExt("GET","https://c.gethopscotch.com/api/v2/users/"+encodeURIComponent(a.args[0]),function(b){try{JSON.parse(b),AE_MOD.hs_user_data[a.args[0]]=JSON.parse(b)}catch(a){}},1);break;case"userdata-read":if(!AE_MOD.hs_user_data[a.args[0]])return"";let dataPiece=a.args[1]?AE_MOD.hs_user_data[a.args[0]][a.args[1]]:JSON.stringify(AE_MOD.hs_user_data[a.args[0]]);return null==dataPiece?"undefined":dataPiece;case"session-new":if(!isTrusted)return alert("Cannot start session: untrusted code execution");if(session.gameId&&session.isHost){if(!confirm("Your current session ("+session.gameId+") is still active! Would you like to create a new session anyways?"))break;session.leave()}else if(session.gameId){if(!confirm("You are currently in a session ("+session.gameId+")! Are you sure you want to leave?"))break;session.leave()}session.isHost=!0,session.maxSize=+a.args[0]||256,session.gameId=Math.round(2176782336*Math.random()).toString(36);var now=Math.round(Date.now()/1e3).toString(36);return session.userJoined=now+session.userId,firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId).set({createdAt:new Date().toISOString(),canJoin:!0,maxSize:session.maxSize}),firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId+"/users/"+session.userJoined).set(!0),copyText(session.gameId),setTimeout(function(){alert("Session ID copied to clipboard: "+session.gameId)},10),firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId).on("value",function(a){session.userJoined&&(session.data=a.val())}),session.gameId;break;case"session-join":if(!isTrusted)return alert("Cannot join session: untrusted code execution");if(session.gameId&&session.isHost){if(!confirm("Your current session ("+session.gameId+") is still active! Would you like to join a new session anyways?"))break;session.leave()}else if(session.gameId){if(!confirm("You are currently in a session ("+session.gameId+")! Are you sure you want to leave?"))break;session.leave()}if(session.gameId=(prompt("Enter Session ID:")||"").toLowerCase().replace(/[\\s\\-\\.#\\$\\[\\]]/g,""),session.gameId){var now=Math.round(Date.now()/1e3).toString(36);session.userJoined=now+session.userId,firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId).once("value").then(a=>{a.val()&&Object.keys(a.val().users||{}).length<a.val().maxSize?(firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId+"/users/"+session.userJoined).set(!1),firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId).on("value",function(a){session.userJoined&&(session.data=a.val()),a.val()&&a.val().users||(!a.val()&&session.userJoined&&alert("The host has ended the session"),session.leave())})):(alert(a.val()?"The session is full":"No such session exists"),session.leave())})}break;case"session-read":if(!session.data)break;if(!isTrusted&&(!session.data||!session.data.users[session.getUser(-1)]))return alert("Cannot simulate read: untrusted non-host code execution");try{return eval(a.args.join(""))}catch(a){return 0}case"session-write":if(!session.data||!session.gameId||!session.data.users)break;if(!isTrusted&&session.getUser(-1)!==session.getUser(0))return alert("Cannot write code: untrusted code execution");try{firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId+"/game/"+session.getUser(a.args[0])+"/"+a.args[1]).set(a.args[2])}catch(a){return 0}break;case"session-myindex":if(!session.data)return 0;try{return session.getUser(-1,!0)}catch(a){return 0}case"session-open":if(!isTrusted&&(!session.data||session.getUser(-1)!==session.getUser(0)))return alert("Could not open session");firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId+"/canJoin").set(!0);break;case"session-close":if(!isTrusted&&(!session.data||session.getUser(-1)!==session.getUser(0)))return alert("Could not close session");firebase.database().ref("live-projects/"+AE_PROJECT_UUID+"-"+session.gameId+"/canJoin").set(!0);break;case"session-leave":session.leave();break;default:console.error("Unknown webplayer action:",a);}}catch(e){return e}}};',
      'AE_MOD.keyboardKeys=[],AE_MOD.mouseWheelData={x:0,y:0,dir:0},window.addEventListener("keydown",function(a){-1==AE_MOD.keyboardKeys.indexOf(a.keyCode)&&AE_MOD.keyboardKeys.push(a.keyCode)}),window.addEventListener("keyup",function(a){AE_MOD.keyboardKeys.splice(AE_MOD.keyboardKeys.indexOf(a.keyCode),1)}),window.addEventListener("blur",function(){AE_MOD.keyboardKeys=[]});\n'
    ].join('\n')
    replacement(/^/, BUNDLED_AEWEBACTIONS)
  }
  if (config.screensizefix) replacement(/(\w\.)prototype\.toggleFullscreen=function/, '$1prototype.resizeScreen=function(){/*AE_MOD*/ main.resizeRoot(window.innerWidth,window.innerHeight);},$&')
  if (config.customsounds) {
    replacement(
      /(?:\w\.type===(?:\w\.)?HSParameterType.Sound&&)?-1===(\w)\.indexOf\((\w)\.value\)&&\1\.push\(\2.value\)/,
      `/*AE_MOD Load multiple sounds*/ if($2.type===HSParameterType.Sound&&-1===$1.indexOf($2.value)){${''
        }var isCustom = (!/^((low-|high)?[a-zA-Z](sharp|flat)?|clickPlayable|alert|car|chaChing|check|clang|crash|dash|doorbell|drip|fail|footsteps|laser|pop|schoolBell|spring|vibrate|trophy|aliens|bubbles|crickets|meow|rain|roar|tweet|wind|woof|ahhh|cheer|eating|heartbeat|laugh|news|talking|bass|chord|clap|gong|snare)$/.test($2.value));${''
        }$1.push(((isCustom)?"custom/":"")+$2.value);if(!isCustom &&!!getPref&&!getPref("old_sounds")&&/^(low-|high)?[a-gA-G](sharp|flat)?$/.test($2.value)){$1.push("new/"+$2.value,"guitar/"+$2.value,"8-bit/"+$2.value);}${''
      }}`
    )
    replacement(
      /(HSBlockType\.PlaySound(?:Seconds)?:(?:var\s)?(\w)=(\w\.)?HSSoundManager.sharedInstance),(\w)=(\w)\[0\]\.computedStringValue\((\w)\)[,;]/,
      `$1;function notePath(val){${''
        }/*AE_MOD find path of note*/${''
        }var isCustom=(!/^((low-|high)?[a-zA-Z](sharp|flat)?|clickPlayable|alert|car|chaChing|check|clang|crash|dash|doorbell|drip|fail|footsteps|laser|pop|schoolBell|spring|vibrate|trophy|aliens|bubbles|crickets|meow|rain|roar|tweet|wind|woof|ahhh|cheer|eating|heartbeat|laugh|news|talking|bass|chord|clap|gong|snare)$/.test(val));${''
        }var ins=(/^(low-|high)?[a-zA-Z](sharp|flat)?$/.test(val))?({"-1":"","0":"new/","1":"guitar/","2":"8-bit/"})[($5[2])?$5[2].computedStringValue($6):'0']:((isCustom)?"custom/":"");${''
        }return(!isCustom && !!getPref && getPref("old_sounds"))?"":ins;${''
      }}$4=notePath($5[0].computedStringValue($6))+$5[0].computedStringValue($6);`
    )
  }
  if (config.containerfix) replacement(/((\w)\((\w),"touchmove",\w.pointerDrag\),\2\()window/, '$1$3 /*AE_MOD*/')
  if (config.screenshots) {
    replacement(/this.root=\w,this.context=new (?:\w.)?HSProjectContext,this\.isMaximized=!1,this\.hasDrawn=!1,/, 'AE_MOD.context=this;/*AE_MOD track context for screenshot*/$&')
    replacement(/prototype\.takeScreenshot=function\(\)\{([^}]+)}/, (m0, m1) => {
      return m0.replace(m1,
        `let THIS=AE_MOD.context;${
          m1.replace(/this/g, 'THIS')
        };document.querySelector('img[name="background"]').src = THIS.background.toDataURL();document.querySelector('img[name="foreground"]').src = THIS.screenshot.toDataURL();downloadProjectScreenshot();`
      )
    })
    replacement(/\.HSMain=(\w),window\.HSMain=\1,window\.Vec2=\w\.Vec2|,this\.canvas\.style\.opacity="1",this\.screenshot\.style\.opacity="0"\},\w\}\(\)/, '$&;document.getElementById(\'screenshot-button\').src="assets/screenshot-icon.png";')
  }
  if (config.errorLogs) {
    replacement(/default:(\w)\.executeBlock\((\w)\)/, `default:try{$1.executeBlock($2);}catch(E){${''
      }/*AE_MOD block errors. Errors do not catch these blocks: Play Sound, CLone, Destroy, Change X, Change Y, Move, Rotate, Change Scene, Broadcast Message*/${''
      }console.groupCollapsed("%cBlock Execution Error","color:white;font-weight:900;display:block;background-color:red;border:2px solid salmon;padding:2px 4px;");${''
      }console.log("Block Code:",$2);console.log("Active Object UUID:"+$1.objectID);${''
      }console.error(E, $1, $2);$1.stageRules.forEach(r=>{if(r.isActive)console.log("Active Rule Type: "+r.eventBlock.parameterBlock.type);});console.groupEnd();throw E;}`)
  }
  if (config.customs) {
    replacement(/this\.getImageUrlFromBaseUrl(\((\w)\))?(:this.getImageUrlFromApp(?:\1)?(?:\)\((\w))?)/, (m0 = '', m1 = '', m2 = '', m3 = '', m4 = '') => {
      return `(!/^\\w{0,8}(?::\\/)?\\//.test(${m2 || m4})?this.getImageUrlFromBaseUrl${m1}:${
        m1 ? 'Promise.resolve' + m1 : '(t)=>Promise.resolve(t)'
      })${m3}`
    })
  }
  if (((semVer[0] >= 1 && semVer[1] >= 5) || semVer[0] > 1) && config.promptDefaults) {
    replacement(/(\w)=document\.createElement\("input"\)/, '$&;$1.value=tu')
    replacement(
      /(this\.promptText=\(null===\(\w=(\w).parameters[^}]+?"Type here",)(this\.view=new \w\(this\.promptText)/,
      '$1this.placeholderText=($2.parameters[2]&&$2.parameters[2].computedStringValue())||"";$3,this.placeholderText'
    )
    replacement(
      /(HSStagePrompt=s;.{0,20}\w=function\(\)\{function \w\()(\w)(\)\{[^}]+createHTMLView\()\2(\)\}return \w.prototype.createHTMLView=function\()\2\)/,
      '$1$2,tu/* AE_MOD CUSTOM PLACEHOLDER */$3$2,tu$4$2,tu)'
    )
    replacement(/this.input.value="",this.input.focus/, 'this.input.focus')
    replacement(/document.body.appendChild\(this.div\)/, 'document.getElementById("ae-hs-player").appendChild(this.div)')
    replacement(/n\.autofocus=!0,this\.input=(\w),this\.div\.appendChild\(\1\);/, '$&if(tu==="_ae_webplayer_hide_prompt_input")$1.value="",$1.style.display="none";')
  }
  if (((semVer[0] >= 1 && semVer[1] >= 5) || semVer[0] > 1) && config.projectLinkPatch) {
    replacement(/\("\/api\/v2\/links"\),(\w)(.{0,120})"PUT"(.{0,150})(\w)=JSON\.parse\((\w)\.response[^;}]+(;.{0,96})\5\.send\(JSON\.stringify\(\w\)\)/,
      `(\`https://api.allorigins.win/raw?url=https://c.gethopscotch.com/api/v2/projects/\${this.projectIdentifier
        .replace(/https?:\\/\\/(c|community|explore)\\.gethopscotch\\.com\\/(p|projects)\\//,'')}/metadata\`)${''
        },$1$2"GET"$3$4=JSON.parse($5.responseText).uuid,$1="?play=1&id="+$4$6$5.send()`)
  }

  // May handle fails sometime later
  console.log(fails, 'substitution(s) failed out of ' + totalSubs)

  res.send(playerFile)
})

module.exports = router
