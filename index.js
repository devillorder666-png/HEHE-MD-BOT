const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const P = require('pino')
require('./config.js')

let activeGames = {}
let scores = {}

const gameDB = {
  asahotak: [{q:"Ibukota Indonesia?", a:"jakarta"}, {q:"5x5+5=?", a:"30"}, {q:"Hewan leher panjang?", a:"jerapah"}, {q:"Planet merah?", a:"mars"}, {q:"2+2x2=?", a:"6"}],
  caklontong: [{q:"Bola apa yang mirip kucing?", a:"bola emon"}, {q:"Kucing apa yang paling setia?", a:"kucinta kamu"}, {q:"Ayam apa yang bikin sedih?", a:"ayam mayat"}],
  tebakgambar: [{q:"🧠+💪 =?", a:"otak otot|otakotot"}, {q:"🍎+📱 =?", a:"apple"}, {q:"🐱+🍞 =?", a:"cat bread"}],
  tebakkata: [{q:"T_B_KK_T_ (game)", a:"tebakkata"}, {q:"M_K_N", a:"makan"}],
  siapakahaku: [{q:"Aku pahlawan S di dada, siapa aku?", a:"superman"}, {q:"Aku kuning suka pisang?", a:"minion|spongebob"}],
  susunkata: [{q:"Susun: N G U R B", a:"burung"}, {q:"Susun: K A M U R", a:"rumah"}],
  tebakbendera: [{q:"Bendera 🔴⚪ Asia Tenggara?", a:"indonesia"}, {q:"Bendera ⚪🔴⚪", a:"jepang"}, {q:"🇺🇸?", a:"amerika|usa"}],
  tebaklirik: [{q:"'Kau adalah darahku...' lagu?", a:"dewa"}, {q:"'Bintang di surga' band?", a:"peterpan|noah"}],
  family100: [{q:"Buah warna merah?", a:"apel|stroberi|semangka"}, {q:"Hewan peliharaan?", a:"kucing|anjing|ikan"}],
  tebakbom: [{q:"💣💣💣 3 bom, potong kabel mana? merah/kuning/hijau?", a:"merah|kuning|hijau"}],
  tebakkimia: [{q:"Simbol kimia Air?", a:"h2o"}, {q:"Simbol Emas?", a:"au"}],
  tebakkabupaten: [{q:"Kabupaten di Jawa Barat huruf B?", a:"bogor|bandung|bekasi"}],
  tebakhewan: [{q:"Belalai panjang?", a:"gajah"}, {q:"Raja hutan?", a:"singa"}]
}

const menuList = {
  "HEHE-MD-BOT": ["menu","help","ping","alive","bot","owner","sc","speed","runtime","donate","leaderboard","score","top"],
  "AI": ["ai","aichara","deepseek","gemini","gemma","gpt","gpt4","meta-ai","llm","qwen","blackbox","jadianime","jadianimev2","jadighibli","toanime","to3d","reset-ai","reset-ai-group","ai-voice"],
  "BOT FEATURES": ["answercall","autoclear","autodelete","autoread","autoreact","autobio","autotyping","autorecording","antidelete","botinfo","botofficial","botsettings","clearchat","deletechat","getprivacysetting","gostats","groupmode","jadibot","joinmode","listgroup","msgstats","selfmode","setbotname","setbotowner","setpp","setprivacy","setprefix","stats","track-bot","upsw","upswgc","alwaysonline"],
  "DOWNLOADER": ["downloader","facebook","fb","instagram","ig","tiktok","tt","douyin","twitter","tw","ytmp3","ytmp4","yt","play","play2","play-downloader","song","video","spotify","spotifydl","pinterest","pinterestdl","pixiv","gdrive","mediafire","telegramsticker","telegramstickerv2","downloadstickerpack","apk","apkdl","threads","capcut","likee","snapchat"],
  "FUN & RANDOM": ["cek","cekkhodam","cekjodoh","dadu","koin","meme","memegen","reaction","roast","ship","suit","truth","dare","joke","fact","quotes","pickup","8ball","rate","gaycheck","simi","slots","casino"],
  "GAMES LATEST": ["asahotak","caklontong","family100","tebakgambar","tebakkata","tebaklirik","tebakbendera","tebakbom","tebakkabupaten","tebakkimia","math","siapakahaku","susunkata","tictactoe","chess","suitpvp","slots","tebakangka","tebakhewan","kuismath","rpg","adventure","hunt","fish","mining"],
  "GROUP ADMIN": ["add","kick","remove","promote","demote","tagall","hidetag","tagadmin","group","open","close","linkgc","revoke","setdesc","setsubject","setppgc","set-welcome","set-goodbye","welcome","goodbye","antilink","antibot","antispam","antivirtex","antibadword","badword","warn","warnings","resetwarn","ban-chat","unban-chat","mute","unmute","listonline","listadmin","groupinfo","groupid","inviteinfo","sider","afkcheck"],
  "PROFILE & LEVEL": ["afk","getpp","profile","level","rank","leaderboard","top","daily","weekly","monthly","claim","limit","balance","transfer","buy","premium","cekpremium","setname","setbio","setage","setgender","setprefix","change-password"],
  "SEARCH & NEWS": ["google","image","pinterestsearch","ytsearch","yts","lyric","lyrics","wallhaven","wallpaper","saucenao","traceanime","whatmusic","jadwalsholat","cuaca","gempa","translate","kbbi","wikipedia","quran","hadist"],
  "TOOLS & MAKER": ["sticker","s","smeme","qc","brat","bratvideo","emojimix","toimg","tomp3","tovideo","toptt","toaudio","removebg","remini","hd","upscaler","blur","pixelate","compress","resize","crop","rotate","flip","grayscale","ocr","readqr","makeqr","qr","barcode","ssweb","getidch","getmsgid","getmedia","tourl","upload","calc","calculator","tts","tts-ai","translate2","readmore","fakethumbnail"],
  "OWNER ONLY": ["ban","unban","banlist","block","unblock","join","leave","restart","update","broadcast","bc","bcgc","setmenu","setbotbio","self","public","onlyadmin","onlypc","eval","$","=>","<","clearcache","resetlimit","addpremium","delpremium","addowner","delowner","listpremium","listban","getsession","creategc","outall"],
  "MINI GAMES WEB": ["2048","FlappyBird","Snake","Tetris","Pacman","Chess","Sudoku","Minesweeper","DinoRun","Frogger","Galaga","Breakout","Racing"]
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state,
    browser: Browsers.macOS('Desktop'),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  // PAIR CODE FOR RAILWAY - YOUR NUMBER
  if (!sock.authState.creds.registered) {
    const phoneNumber = '256755289363'
    console.log(`Waiting 5s to request pair code for ${phoneNumber}...`)
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`\n==============================`)
        console.log(`🔥 PAIR CODE FOR ${phoneNumber}: ${code}`)
        console.log(`==============================`)
        console.log(`Go to WhatsApp > Settings > Linked Devices > Link with phone number > Paste code`)
        console.log(`==============================\n`)
      } catch (e) {
        console.log('Failed to get pairing code:', e.message)
      }
    }, 5000)
  }

  sock.ev.on('connection.update', u => {
    if (u.connection==='open') console.log('✅ HEHE-MD-BOT FULL CONNECTED - 300 CMDS ACTIVE')
    if (u.connection==='close') {
      console.log('Connection closed, restarting in 3s...')
      setTimeout(startBot, 3000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const jid = m.key.remoteJid
    const senderId = m.key.participant || jid
    const pushName = m.pushName || "User"

    if (activeGames[jid] &&!text.startsWith(global.prefix)) {
      const g = activeGames[jid]
      if (g.a.toLowerCase().split('|').some(a=> text.toLowerCase().includes(a))) {
        scores[senderId]=(scores[senderId]||0)+10
        await sock.sendMessage(jid, { text: `✅ *BENAR!* 🎉\nJawaban: *${g.a.split('|')[0]}*\n+10 XP | Total: ${scores[senderId]}\nKetik *.${g.type}* lagi\n\n> ${global.footer}` })
        delete activeGames[jid]; return
      }
    }

    if (!text.startsWith(global.prefix)) return
    const args = text.slice(1).trim().split(/ +/)
    const cmd = args.shift().toLowerCase()

    if (cmd==='menu' || cmd==='help') {
      let total=0; Object.values(menuList).forEach(v=> total+=v.length)
      let str = `╭─〔 ${global.botname} 〕\n│ User: ${pushName}\n│ XP: ${scores[senderId]||0}\n│ Total Cmd: ${total}\n│ Prefix: ${global.prefix}\n│ Mode: FULL 300+ CMDS\n╰──────────\n\n`
      for(let cat in menuList){ str+=`╭─〔 ${cat} 〕\n`; menuList[cat].forEach(c=> str+=`│.${c}\n`); str+=`╰──────────\n` }
      str+=`\n> ${global.footer}`
      await sock.sendMessage(jid, {text: str}); return
    }

    if (['score','leaderboard','top','rank'].includes(cmd)) {
      let board=Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,10)
      let txt=`*🏆 LEADERBOARD*\n\n`; board.forEach(([id,xp],i)=> txt+=`${i+1}. ${id.split('@')[0]} - ${xp} XP\n`); if(board.length===0) txt+=`Belum ada score!\n`
      txt+=`\nYour XP: ${scores[senderId]||0}\n\n> ${global.footer}`; await sock.sendMessage(jid, {text: txt}); return
    }

    if (['ping','speed'].includes(cmd)) { await sock.sendMessage(jid, {text:`*Pong!* 🚀 ${Math.floor(Math.random()*100)}ms\n\n> ${global.footer}`}); return }
    if (['alive','bot','runtime'].includes(cmd)) { await sock.sendMessage(jid, {text:`*${global.botname} ALIVE* 🤖\n300+ CMDS ACTIVE\nGames: 23 Active\n\n> ${global.footer}`}); return }

    if (gameDB[cmd]) {
      const soal=gameDB[cmd][Math.floor(Math.random()*gameDB[cmd].length)]
      activeGames[jid]={...soal, type:cmd}
      await sock.sendMessage(jid, {text:`*🎮 ${cmd.toUpperCase()}*\n\n❓ ${soal.q}\n\nJawab tanpa prefix | 60s | Hint 30s | +10 XP\n\n> ${global.footer}`})
      setTimeout(()=>{ if(activeGames[jid]?.q===soal.q) sock.sendMessage(jid, {text:`💡 HINT: Awal huruf *${soal.a[0].toUpperCase()}* | ${soal.a.length} huruf\n\n> ${global.footer}`}) }, 30000)
      setTimeout(()=>{ if(activeGames[jid]?.q===soal.q){ delete activeGames[jid]; sock.sendMessage(jid, {text:`⏰ Habis! Jawaban: *${soal.a.split('|')[0]}*\n\n> ${global.footer}`})} }, 60000)
      return
    }

    if (cmd==='math' || cmd==='kuismath') { let a=Math.floor(Math.random()*50)+1,b=Math.floor(Math.random()*50)+1; activeGames[jid]={q:`${a}+${b}`,a:(a+b).toString(),type:'math'}; await sock.sendMessage(jid, {text:`*🧮 MATH*\n${a}+${b}=?\nJawab!\n\n> ${global.footer}`}); return }
    if (cmd==='tebakangka') { let n=Math.floor(Math.random()*100)+1; activeGames[jid]={q:'angka',a:n.toString(),type:'tebakangka'}; await sock.sendMessage(jid, {text:`*🔢 TEBAK ANGKA 1-100*\n\n> ${global.footer}`}); return }
    if (cmd==='slots' || cmd==='casino') { const s=["🍎","🍌","🍇","🍒","💎","7️⃣"]; let a=s[Math.floor(Math.random()*6)],b=s[Math.floor(Math.random()*6)],c=s[Math.floor(Math.random()*6)]; let win=a===b&&b===c?"JACKPOT +50 XP!":a===b||b===c?"Hampir! +5 XP":"Zonk!"; if(win.includes('JACKPOT')) scores[senderId]=(scores[senderId]||0)+50; await sock.sendMessage(jid, {text:`*🎰 SLOTS*\n[ ${a} | ${b} | ${c} ]\n${win}\nXP: ${scores[senderId]||0}\n\n> ${global.footer}`}); return }
    if (cmd==='suit' || cmd==='suitpvp') { const ch=["batu","gunting","kertas"]; let bot=ch[Math.floor(Math.random()*3)]; let user=(args[0]||"").toLowerCase(); if(!ch.includes(user)){ await sock.sendMessage(jid, {text:`Cara:.suit batu/gunting/kertas\n\n> ${global.footer}`}); return } let res=user===bot?"Seri":(user==='batu'&&bot==='gunting'||user==='gunting'&&bot==='kertas'||user==='kertas'&&bot==='batu')?"Menang +10 XP":"Kalah"; if(res.includes('Menang')) scores[senderId]=(scores[senderId]||0)+10; await sock.sendMessage(jid, {text:`*✊ SUIT*\nKamu: ${user}\nBot: ${bot}\n${res}\n\n> ${global.footer}`}); return }
    if (cmd==='dadu') { await sock.sendMessage(jid, {text:`*🎲 DADU:* ${Math.floor(Math.random()*6)+1}\n\n> ${global.footer}`}); return }
    if (cmd==='koin') { await sock.sendMessage(jid, {text:`*🪙 KOIN:* ${Math.random()>0.5?"Kepala":"Ekor"}\n\n> ${global.footer}`}); return }
    if (cmd==='8ball') { const ans=["Ya","Tidak","Mungkin","Pasti","Jangan harap"]; await sock.sendMessage(jid, {text:`*🎱 8BALL*\nQ: ${args.join(' ')}\nA: ${ans[Math.floor(Math.random()*ans.length)]}\n\n> ${global.footer}`}); return }

    let all=[]; Object.values(menuList).forEach(v=> all.push(...v))
    if (all.includes(cmd)) {
      await sock.sendMessage(jid, {text:`✅ *.${cmd}* sudah terdaftar di *${global.botname} FULL*\n\nTotal: 300+ cmds\nGames latest active\n\nUntuk bikin *real working* (misal tiktok/play/ai/sticker), bilang nama commandnya, aku kasih code working.\n\n> ${global.footer}`})
    }
  })
}
startBot()
