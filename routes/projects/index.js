const express = require('express')
const router = express.Router()
// const { Deta } = require('deta')
const axios = require('axios')

async function getProject (id) {
  const projectResponse = await axios({
    method: 'GET',
    url: 'https://c.gethopscotch.com/api/v1/projects/' + id
  })
  return projectResponse.data
}
const ProjectStatistics = {
  builderStats: async function (project) {
    const blockLabels = {
      19: ['old', 'Wait til Timestamp', 'milliseconds'],
      20: ['old', '\u2063'], // Wait til Input Done
      22: ['old', '\u2063'],
      23: ['move', 'Move Forward', ' '],
      24: ['move', 'Turn', 'degrees'],
      26: ['draw', 'Draw a Trail', 'color', 'width'],
      27: ['move', 'Change X', 'by'],
      28: ['move', 'Change Y', 'by'],
      29: ['old', 'Scale', 'by'],
      30: ['draw', 'Clear'],
      31: ['draw', 'Set Trail Width', 'to'],
      32: ['draw', 'Set Trail Color', 'to'],
      33: ['looks', 'Change Pose'],
      34: ['move', 'Set Speed', 'to'],
      35: ['ctrl', 'Wait', 'milliseconds'],
      36: ['old', 'Set Opacity', 'to'],
      37: ['old', 'Pen Down'],
      38: ['old', 'Pen Up'],
      39: ['move', 'Set Angle', ' '],
      40: ['looks', 'Set Text', 'to', 'color'],
      41: ['move', 'Set Position', 'to x', 'y'],
      42: ['looks', 'Send To Back'],
      43: ['looks', 'Bring To Front'],
      44: ['var', 'Increase', ' ', 'by'],
      45: ['var', 'Set', ' ', 'to'],
      46: ['old', 'Move With Trail', 'distance'],
      47: ['looks', 'Set Invisibility', 'percent'],
      48: ['looks', 'Grow', 'by percent'],
      49: ['looks', 'Shrink', 'by percent'],
      50: ['move', 'Flip'],
      51: ['looks', 'Set Size', 'percent'],
      52: ['looks', 'Start Sound', ' ', 'wait'],
      53: ['ctrl', 'Create a Clone of This Object', 'times'],
      54: ['looks', 'Set Color', ' '],
      55: ['ctrl', 'Destroy'],
      56: ['looks', 'Set Image', ' '],
      57: ['looks', 'Set', 'width', 'height'],
      58: ['looks', 'Set Z Index', ' '],
      59: ['move', 'Set Origin', 'to x', 'y'],
      60: ['move', 'Set Center', 'to x', 'y'],
      61: ['ctrl', 'Wait', 'seconds'],
      62: ['looks', 'Start Sound', ' ', 'wait'], // Start Sound Seconds
      63: ['var', 'Save Input', ' ', 'prompt'],
      64: ['looks', 'Set Text to Input', 'color'],
      65: ['looks', 'Play Note', ' ', 'rhythm'],
      66: ['looks', 'Set Tempo', ' '],
      67: ['looks', 'Set Instrument', ' '],
      68: ['ctrl', 'Open Project', ' '],
      120: ['ctrl', 'Repeat', 'times'],
      121: ['ctrl', 'Repeat Forever'],
      122: ['ctrl', 'Check Once If', ' '],
      123: ['abl', 'Ability'],
      124: ['ctrl', 'Check If Else', ' '],
      125: ['ctrl', 'Change Scene', 'to'],
      126: ['ctrl', 'Broadcast Message', 'named'],
      127: ['ctrl', 'Request Seeds', ' ', 'for'],
      233: ['Random'],
      234: ['XPos'],
      235: ['YPos'],
      236: ['Random110'],
      237: ['Random1100'],
      238: ['Random11000'],
      239: ['Variable'],
      1e3: ['conditional', ' ', ' ', '='],
      1001: ['conditional', ' ', ' ', '\u2260'],
      1002: ['conditional', ' ', ' ', '<'],
      1003: ['conditional', ' ', ' ', '>'],
      1004: ['conditional', ' ', ' ', 'and'],
      1005: ['conditional', ' ', ' ', 'or'],
      1006: ['conditional', ' ', ' ', '\u2265'],
      1007: ['conditional', ' ', ' ', '\u2264'],
      1008: ['conditional', ' ', ' ', 'matches'],
      1009: ['HS_END_OF_CONDITIONAL_OPERATORS'],
      2e3: ['Rotation'],
      2001: ['X Position'],
      2002: ['Y Position'],
      2003: ['Invisibility as a %'],
      2004: ['Size as a %'],
      2005: ['Speed'],
      2006: ['Clone Index'],
      2007: ['Total Clones'],
      2008: ['Width'],
      2009: ['Height'],
      2010: ['Z Index'],
      2011: ['Origin X'],
      2012: ['Origin Y'],
      2013: ['Center X'],
      2014: ['Center Y'],
      2015: ['Text'],
      2016: ['Tempo'],
      2017: ['Instrument'],
      2018: ['HS_END_OF_OBJECT_TRAITS'],
      2500: ['\uD83D\uDCF1 Username'],
      2501: ['\uD83D\uDCF1 Time'],
      2502: ['\uD83D\uDCF1 Year'],
      2503: ['\uD83D\uDCF1 Month'],
      2504: ['\uD83D\uDCF1 Day'],
      2505: ['\uD83D\uDCF1 Hour'],
      2506: ['\uD83D\uDCF1 Minute'],
      2507: ['\uD83D\uDCF1 Second'],
      2508: ['HS_END_OF_USER_TRAITS'],
      3e3: ['\u25B6\uFE0F Width'],
      3001: ['\u25B6\uFE0F Height'],
      3002: ['\u25B6\uFE0F Tilt Up %'],
      3003: ['\u25B6\uFE0F Tilt Down %'],
      3004: ['\u25B6\uFE0F Tilt Left %'],
      3005: ['\u25B6\uFE0F Tilt Right %'],
      3006: ['\u25B6\uFE0F Last Touch X'],
      3007: ['\u25B6\uFE0F Last Touch Y'],
      3008: ['\u25B6\uFE0F Total Objects'],
      3009: ['HS_END_OF_STAGE_TRAITS'],
      4e3: ['math', ' ', ' ', '+'],
      4001: ['math', ' ', ' ', '\u2212'],
      4002: ['math', ' ', ' ', '\u00D7'],
      4003: ['math', ' ', ' ', '\u00F7'],
      4004: ['math', '\u2063 random', ' ', 'to'],
      4005: ['math', ' ', ' ', '^'],
      4006: ['math', '\u2063 \u221A', ' '],
      4007: ['math', '\u2063 sin', ' '],
      4008: ['math', '\u2063 cos', ' '],
      4009: ['math', '\u2063 round', ' '],
      4010: ['math', '\u2063 absolute value', ' '],
      4011: ['math', ' ', ' ', '%'],
      4012: ['math', '\u2063 tan', ' '],
      4013: ['math', '\u2063 arcsin', ' '],
      4014: ['math', '\u2063 arccos', ' '],
      4015: ['math', '\u2063 arctan', ' '],
      4016: ['math', '\u2063 max', ' ', ' '],
      4017: ['math', '\u2063 min', ' ', ' '],
      4018: ['math', '\u2063 floor', ' ', ' '],
      4019: ['math', '\u2063 ceil', ' ', ' '],
      4020: ['HS_END_OF_MATH_OPERATORS'],
      5e3: ['ColorOperatorRandom'],
      5001: ['color', '\u2063 ', 'R', 'G', 'B'],
      5002: ['color', '\u2063 ', 'H', 'S', 'B'],
      5003: ['HS_END_OF_COLOR_OPERATORS'],
      6e3: ['rule', 'When'], // Rule
      6001: ['RulePreview'], // Rule Preview
      7e3: ['event', '\u2063 game starts \u2063'], // Event operator start
      7001: ['event', 'is tapped \u2063', ' '],
      7002: ['event', ' ', ' ', 'is touching'],
      7003: ['event', 'is pressed \u2063', ' '],
      7004: ['event', 'Tilted Right'], // EventOperatorTiltRight
      7005: ['event', 'Tilted Left'], // EventOperatorTiltLeft
      7006: ['event', 'Tilted Up'], // EventOperatorTiltUp
      7007: ['event', 'Tilted Down'], // EventOperatorTiltDown
      7008: ['event', '\u2063 \uD83D\uDCF1 hears a loud noise \u2063'],
      7009: ['event', '\u2063 \uD83D\uDCF1 is shaken \u2063'],
      7010: ['event', ' ', ' ', 'bumps'],
      7011: ['event', 'is swiped right \u2063', ' '],
      7012: ['event', 'is swiped left \u2063', ' '],
      7013: ['event', 'is swiped up \u2063', ' '],
      7014: ['event', 'is swiped down \u2063', ' '],
      7015: ['event', '\u2063 object is cloned \u2063'], // Enter the World
      7016: ['event', 'Editor Tilt Right \u2063'], // EventOperatorTiltRightEditor
      7017: ['event', 'Editor Tilt Left \u2063'], // EventOperatorTiltLeftEditor
      7018: ['event', 'Editor Tilt Up \u2063'], // EventOperatorTiltUpEditor
      7019: ['event', 'Editor Tilt Down \u2063'], // EventOperatorTiltDownEditor
      7020: ['event', 'is not pressed \u2063', ' '],
      7021: ['event', '\u2063 game is playing \u2063'],
      7022: ['event', '\u2063 touch ends \u2063'],
      7023: ['event', ' ', '\u2063 I get a message \u2063'],
      7024: ['event', ' ', '\u2063 Message matches \u2063'],
      7025: ['event', ' ', ' ', 'is not touching'],
      7026: ['HS_END_OF_EVENT_OPERATORS'],
      8e3: ['<ps><span><i class="fa fa-fw fa-cubes"></i> Object</span></ps>'],
      8001: ['<i class="fa fa-fw fa-question-circle"></i> Anything'],
      8002: ['<i class="fa fa-mobile"></i> Edge'],
      8003: ['\u2063 \u25B6\uFE0F'], // Game
      8004: ['<ps><span>Self</span></ps>'],
      8005: ['<ps><span>\u2063 Original Object \u2063</span></ps>'],
      8006: ['\u2063 \uD83D\uDCF1'], // Local
      8007: ['\u2063 \uD83D\uDCF1'], // User
      8008: ['HS_END_OF_EVENT_PARAMETER_BLOCKS'],
      9000: ['looks', '\u2063 character', 'in', 'at'],
      9001: ['looks', '\u2063 characters', 'in', 'between', 'and'],
      9002: ['looks', '\u2063 length'],
      9003: ['HS_END_OF_TEXT_OPERATOR_BLOCKS']
    }
    const charLabels = {
      0: 'monkey',
      1: 'text',
      2: 'octopus',
      3: 'gorilla',
      4: 'cupcake',
      5: 'bear',
      6: 'dino',
      7: 'frog',
      8: 'greenman',
      9: 'mustache',
      10: 'spacepod',
      11: 'zombieBear',
      12: 'ghoulopus',
      13: 'bats',
      14: 'frankenrilla',
      15: 'jodyWitch',
      16: 'cauldron',
      17: 'pumpkin',
      18: 'broom',
      19: 'lantern',
      20: 'parrotFlying',
      21: 'mandrill',
      22: 'mosquito',
      23: 'missChief',
      24: 'venus',
      25: 'jeepers',
      26: 'banyan',
      27: 'stargirl',
      28: 'astro',
      29: 'chillanna',
      30: 'robo',
      31: 'raccoon',
      32: 'bird',
      33: 'HS_END_OF_CHARACTERS',
      34: 'square',
      35: 'circle',
      36: 'hexagon',
      37: 'triangle',
      38: 'rightTriangle',
      39: 'rectangle',
      40: 'heart',
      41: 'star',
      42: 'arch',
      43: 'parallelogram',
      44: 'squiggle',
      45: 'donut',
      46: 'tetrisZ',
      47: 'tetrisT',
      48: 'tetrisL',
      49: 'corner',
      50: 'flower',
      51: 'threeProngedBoomerang',
      52: 'squishedBox',
      53: 'bead',
      54: 'chevron',
      55: 'xShape',
      56: 'tetrisLine',
      57: 'HS_END_OF_SHAPES',
      58: 'toucan',
      59: 'anteater',
      60: 'crocodile',
      61: 'sloth',
      62: 'iguana',
      63: 'hut',
      64: 'penguin',
      65: 'winterQueen',
      66: 'shyYeti',
      67: 'deer',
      68: 'elf',
      69: 'snowGlobe',
      70: 'polarbear',
      71: 'sleigh',
      72: 'mistletoe',
      73: 'snowMan',
      74: 'snowflake',
      100: 'roundedSquareFullSize',
      101: 'squareFullSize',
      102: 'circleFullSize',
      103: 'hexagonFullSize',
      104: 'triangleFullSize',
      105: 'rightTriangleFullSize',
      106: 'rectangleFullSize',
      107: 'heartFullSize',
      108: 'starFullSize',
      109: 'archFullSize',
      110: 'parallelogramTallFullSize',
      111: 'squiggleFullSize',
      112: 'donutFullSize',
      113: 'tetrisZFullSize',
      114: 'tetrisTFullSize',
      115: 'tetrisLFullSize',
      116: 'cornerFullSize',
      117: 'flowerFullSize',
      118: 'fanbladeFullSize',
      119: 'squishedBoxFullSize',
      120: 'roundedRightTriangleFullSize',
      121: 'arrowRoundedFullSize',
      122: 'beadFullSize',
      123: 'parallelogramWideFullSize',
      124: 'chevronFullSize',
      125: 'xFullSize',
      126: 'tetrisLineFullSize',
      150: 'hexagonV3',
      151: 'triangleV3',
      152: 'rectangleV3',
      153: 'heartV3',
      154: 'starV3',
      155: 'archV3',
      156: 'squiggleV3',
      157: 'tetrisZV3',
      158: 'tetrisTV3',
      159: 'tetrisLV3',
      160: 'fanbladeV3',
      161: 'arrowRoundedV3',
      162: 'beadV3',
      163: 'parallelogramWideV3',
      164: 'chevronV3',
      165: 'HS_END_OF_FULL_SIZE_SHAPES',
      166: 'HS_NUMBER_OF_OBJECTS',
      2e3: 'image',
      3e3: 'HS_START_OF_CHARACTERS2',
      3001: 'crocodileJaws',
      3002: 'lanternFullSize',
      3003: 'HS_END_OF_CHARACTERS2',
      1e4: 'nil',
      3e4: 'edgeOfScreen'
    }
    const distributionCounts = {
      blockCatgCounts: {},
      blockDescCounts: {},
      blockTypeCounts: {},
      totalBlockCount: 0,
      objectCharCounts: {},
      objectTypeCounts: {},
      operatorCatgCounts: {},
      operatorDescCounts: {},
      operatorTypeCounts: {},
      operatorBlockCount: 0,
      ruleDescCounts: {},
      ruleTypeCounts: {},
      abilitiesUseCount: {},
      cstmRulesUseCount: {},
      variablesUseCount: {},
      variablesTotalUse: 0,
      traitsTypeCounts: {},
      traitsTotalUsage: 0
      // Add traits some time
    }
    function unformatProject (p) {
      // Remove Null
      if (p.abilities) p.abilities = p.abilities.filter(x => x != null)
      if (p.eventParameters) p.eventParameters = p.eventParameters.filter(x => x != null)
      if (p.objects) p.objects = p.objects.filter(x => x != null)
      if (p.rules) p.rules = p.rules.filter(x => x != null)
      if (p.customRules) p.customRules = p.customRules.filter(x => x != null)
      if (p.variables) p.variables = p.variables.filter(x => x != null)
      if (p.scenes) p.scenes = p.scenes.filter(x => x != null)
      if (p.traits) p.traits = p.traits.filter(x => x != null)
      // Remove IDs of Individual Blocks and Scenes
      p = JSON.stringify(p).replace(/,"web_id":"[0-9A-F_-]*?",/gi, ',').replace(/,?"web_id":"[0-9A-F_-]*?",?/gi, '')
      try { return JSON.parse(p) } catch (E) { console.log(E, p) }
    }
    // Get the Ability Usage and Block Distribution within the project
    (project.abilities || []).forEach(a => {
      if (a.name && !distributionCounts.abilitiesUseCount[a.name]) distributionCounts.abilitiesUseCount[a.name] = 0;
      (JSON.stringify(a.blocks || []).match(/"HSTraitTypeKey":[23]\d\d\d\D/g) || []).forEach(tr => {
        distributionCounts.traitsTotalUsage++
        distributionCounts.traitsTypeCounts[blockLabels[tr.match(/[23]\d\d\d/)[0]]] ? distributionCounts.traitsTypeCounts[blockLabels[tr.match(/[23]\d\d\d/)[0]]]++ : distributionCounts.traitsTypeCounts[blockLabels[tr.match(/[23]\d\d\d/)[0]]] = 1
      })
      for (let i = 0; i < (a.blocks || []).length; i++) {
        const b = a.blocks[i]
        // Get Ability Usage
        if (b.type === 123 && b.controlScript && b.controlScript.abilityID) project.abilities.forEach(ability => { if (ability.name && ability.abilityID === b.controlScript.abilityID)distributionCounts.abilitiesUseCount[ability.name] ? distributionCounts.abilitiesUseCount[ability.name]++ : distributionCounts.abilitiesUseCount[ability.name] = 1 })
        // Get Block Type Distribution
        distributionCounts.totalBlockCount++
        const category = (blockLabels[b.type] || [])[0]; const name = (blockLabels[b.type] || [])[1];
        (distributionCounts.blockCatgCounts[category]) ? distributionCounts.blockCatgCounts[category]++ : distributionCounts.blockCatgCounts[category] = 1; // Category
        (distributionCounts.blockDescCounts[name]) ? distributionCounts.blockDescCounts[name]++ : distributionCounts.blockDescCounts[name] = 1; // Name
        (distributionCounts.blockTypeCounts[b.type]) ? distributionCounts.blockTypeCounts[b.type]++ : distributionCounts.blockTypeCounts[b.type] = 1 // Type
        // Get Operator Count and Types
        distributionCounts.operatorBlockCount += (JSON.stringify(b).match(/"block_class":"(?:conditional)?[oO]perator"/g) || []).length
        JSON.stringify(b).replace(/.*?"block_class":"(?:conditional)?[oO]perator","type":(\d+)(?:[^{}[\]]*)(?:.(?!"block_class":"(?:conditional)?[oO]perator"))*|.*$/g, '$1\n')
          .replace(/\n$/, '').split('\n').forEach(oType => {
            if (!oType) return
            const item = blockLabels[oType] || []; const opCatg = (blockLabels[oType] || [])[0]
            const opName = (
              (oType < 5e3)
                ? (item[0 + 3 * (oType >= 1e3) - 3 * (oType >= 2e3) + (oType >= 4e3)].replace(/^\s$/, '') || item[3]).replace(/(Random)1/, '$1<br/>1-')
                : (oType < 6e3) ? ['Random', 'RGB', 'HSB'][oType - 5e3] : ((item[1] || '').replace(/\u2063\s|\s\u2063|^\s$/g, '') || (item[2] || '').replace(/\u2063\s|\s\u2063|^\s$/g, '') || item[3] || (item[0] || '').replace(/\u2063\s|\s\u2063|^\s$/g, ''))
            ).replace(/\u2063\s|\s\u2063/g, ''); // Taken from Full Reference
            (distributionCounts.operatorCatgCounts[opCatg]) ? distributionCounts.operatorCatgCounts[opCatg]++ : distributionCounts.operatorCatgCounts[opCatg] = 1;
            (distributionCounts.operatorDescCounts[opName]) ? distributionCounts.operatorDescCounts[opName]++ : distributionCounts.operatorDescCounts[opName] = 1;
            (distributionCounts.operatorTypeCounts[oType]) ? distributionCounts.operatorTypeCounts[oType]++ : distributionCounts.operatorTypeCounts[oType] = 1
          })
      }
    });
    // Get the Object Type Distribution
    (project.objects || []).forEach(o => {
      const name = charLabels[o.type] || '';
      (distributionCounts.objectCharCounts[name]) ? distributionCounts.objectCharCounts[name]++ : distributionCounts.objectCharCounts[name] = 1; // Name
      (distributionCounts.objectTypeCounts[o.type]) ? distributionCounts.objectTypeCounts[o.type]++ : distributionCounts.objectTypeCounts[o.type] = 1 // Type
    });
    (project.customRules || []).forEach(cr => {
      // distributionCounts.variablesUseCount[cr.name] = 0;
      distributionCounts.cstmRulesUseCount[cr.name] = (project.objects || []).map(o => { return (o.rules && o.rules.indexOf(cr.id) !== -1) || null }).filter(x => x != null).length + (project.customRules || []).map(r => { return (r.rules && r.rules.indexOf(cr.id) !== -1) || null }).filter(x => x != null).length
      // (JSON.stringify(project).match(RegExp('"rules":\[[^\{\}\[\]]*?"'+v.objectIdString+'"\]',"g"))||[]).length;
    });
    // Get the Rule Type Distribution
    (project.rules || []).forEach(r => {
      r = (r.parameters[0] || {}).datum || {}
      const item = blockLabels[r.type] || []; const name = ((item[1] || '').replace(/\u2063\s|\s\u2063|^\s$/g, '') || (item[2] || '').replace(/\u2063\s|\s\u2063|^\s$/g, '') || item[3] || (item[0] || '').replace(/\u2063\s|\s\u2063|^\s$/g, '')); // From Full Reference
      (distributionCounts.ruleDescCounts[name]) ? distributionCounts.ruleDescCounts[name]++ : distributionCounts.ruleDescCounts[name] = 1; // Name
      (distributionCounts.ruleTypeCounts[r.type]) ? distributionCounts.ruleTypeCounts[r.type]++ : distributionCounts.ruleTypeCounts[r.type] = 1 // Type
    });
    // Get the Variable Usage per Variable
    (project.variables || []).forEach(v => {
      distributionCounts.variablesTotalUse += distributionCounts.variablesUseCount[(v.type === 8003 || (project.version === 24 && !v.HSObjectIDString ? '\uD83D\uDCF1 ' : '')) + v.name] = (JSON.stringify(project).match(RegExp('"variable":"' + v.objectIdString + '"', 'g')) || []).length
    });
    // Get the Trait Usage per trait for old projects
    (project.traits || []).forEach(t => {
      distributionCounts.traitsTypeCounts[(t.type >= 3e3 ? '\uD83D\uDCF1 ' : '') + blockLabels[t.HSTraitTypeKey]] ? distributionCounts.traitsTypeCounts[(t.type >= 3e3 ? '\uD83D\uDCF1 ' : '') + blockLabels[t.HSTraitTypeKey]] += (JSON.stringify(project).match(RegExp('"variable":"' + t.HSTraitIDKey + '"', 'g')) || []).length : distributionCounts.traitsTypeCounts[(t.type >= 3e3 ? '\uD83D\uDCF1 ' : '') + blockLabels[t.HSTraitTypeKey]] = (JSON.stringify(project).match(RegExp('"variable":"' + t.HSTraitIDKey + '"', 'g')) || []).length
      distributionCounts.traitsTotalUsage = Object.keys(distributionCounts.traitsTypeCounts).map(key => { return distributionCounts.traitsTypeCounts[key] }).reduce((a, b) => { return a + b })
    })
    const filesize = Math.round(JSON.stringify(unformatProject(project)).length / 10) / 100
    const projectQuickStats = {
      uuid: project.uuid || '',
      filesize: ((filesize < 1000) ? filesize + ' KB' : Math.round(filesize / 10) / 100 + ' MB'),
      abilities: (project.abilities || []).length,
      customRules: (project.customRules || []).length,
      eventParameters: (project.eventParameters || []).length,
      objects: (project.objects || []).length,
      rules: (project.rules || []).length,
      scenes: (project.scenes || []).length,
      traits: (project.traits || []).length,
      variables: (project.variables || []).length
    }

    return { distributionCounts, projectQuickStats }
  }
}

router.get('/:id/stats', async (req, res) => {
  const project = await getProject(req.params.id)
  const shortTitle = project.title.replace(/['’]/gi, '').replace(/\s+/gi, ' ').replace(/[:|(]/gi, ' - ').split(' - ')[0]
  const matchesTitleRegex = (
    !/([a-z].*){4,}/i.test(shortTitle) || /([a-z0-9])\1{5,}|([?!].*){3,}|([a-z]{0,8},)?[a-z]{0,8}&[a-z]{0,8}|[a-z0-9]{16,}|.{41,}|fan\s?art|\bI think\b|\bremix(ing|ed)?\b|\bimpossible\b|\bomg\b|\boh my\b|Cros[bs]y|\bDont\sdrop\s(your)?\s(phone|📱)|Kaleidoscope|\bannouncement|\bshout\s*?outs?\b|\brequests?\b|\bpl[zs]\b|\bplease\b|\bif.{0,10}(get).{0,10}likes?\b|\bfor a follow\b|\b(so|super)\s(easy|hard)\b|\blike\sbutton\b|\btry(\snot)\s(to)?\b|\bfidget\b|\bspinner\b|(\s|^)[bcdefghjklmnpqrtuwxyz](\s|$)|(read|see) (in |the )? code|\bYT\b|\bsubscribe to\b|^something$|^nothing$|\bu[hm]+\b|\brepost\b|\bpl(s+|ease)\b|\blike for\b|\b(just)? a notice\b|\bOC\b|\btoo many\b|\bi ship\b|\bships\b|\bignore\b|\bemoji draw\b|\b(art|my|our|your|the) club\b|\sRemix\b|\bccool thing\b|^[aeh]+$|^[uhm.]+$|\bmy motto is\b|\bcome back for part\b|\bI guess\b|\bt?hat face\b|\bbruh\b|^rip$|(\s?#[a-z0-9]+){3,}$/i.test(shortTitle)
  )
  res.send({
    plays: project.play_count,
    hearts: project.number_of_stars,
    title: {
      original: project.title,
      short: shortTitle,
      matchesTitleRegex
    },
    builderStats: await ProjectStatistics.builderStats(project)
  })
})

module.exports = router
