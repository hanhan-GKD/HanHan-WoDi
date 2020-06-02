// 将net模块 引入进来
const net = require("net");
const IdentityEmun = {
    PM: "平民",
    WD: "卧底",
    BB: "白板"
}
const WORDS = require('../config/words.json')
const IdentityArr = ["PM", "WD", "BB"]
const ClientStatusEmun = {
    DIE: "死亡",
    LIVE: "存活"
}
let rooms = []
let clinet_cons = []
const RAND = require('../share/random')
const config = require('../config/index.json').server
const server = net.createServer(function (client_sock) {
    console.log(client_sock.remoteAddress + ":" + client_sock.remotePort, "连接成功...")
    client_sock.on("close", function () {
        let home_ip = client_sock.remoteAddress + ":" + client_sock.remotePort
        let r = rooms.find(s => s.home_ip == home_ip)
        if (r) {
            for (const item of r.clientArr) {
                let socket = clinet_cons.find(s => s.id == item.id)
                if (socket) {
                    console.log("关闭连接...")
                    socket.client_con.end();
                }
            }
        }
        rooms = rooms.filter(s => s.home_ip != home_ip)
        console.log(home_ip, "断开连接...剩余房间数:", rooms.length)
    });
    client_sock.on("data", function (data) {
        let ipStr = client_sock.remoteAddress + ":" + client_sock.remotePort
        let obj = JSON.parse(data);
        let idStr;
        let room, exists_con;
        switch (obj.com) {
            case "a":
                client_sock.write(JSON.stringify({
                    com: "a_ok",
                    data: rooms.map(s => {
                        return { home_num: s.home_num, total: s.total, p_num: s.players.length }
                    })
                }))
                break;
            case "c":
                let group = {};
                let id = obj.data.name + 1
                group.clientArr = [{
                    id: id,
                    ip: ipStr,
                    name: obj.data.name,
                    is_vote: false,
                    is_speak: false,
                    is_die: false,
                    vote_num: 0
                }]
                group.home_ip = ipStr
                group.home_id = id
                group.home_num = rooms.length + 1
                group.players = obj.data.players
                group.total = ~~obj.data.players[0] + ~~obj.data.players[1] + ~~obj.data.players[2]
                let json = JSON.stringify({ com: "c_ok", data: group })
                client_sock.write(json)
                exists_con = clinet_cons.find(s => s.ip == ipStr)
                if (exists_con) {
                    exists_con.client_con = client_sock
                } else {

                    clinet_cons.push({
                        id: id,
                        ip: ipStr,
                        client_con: client_sock
                    })
                }
                rooms.push(group)
                break;
            case "i":
                let result = rooms.find(s => s.home_num == obj.data.num)
                if (!result) {
                    client_sock.write(JSON.stringify({ com: "err", data: "没有找到该房间!" }))
                    return
                }
                if (result.total == result.clientArr.length) {
                    client_sock.write(JSON.stringify({ com: "err", data: "该房间人数已满!" }))
                    return
                }

                exists_con = clinet_cons.find(s => s.ip == ipStr)
                idStr = obj.data.name + new Date().valueOf().toString();
                if (exists_con) {
                    exists_con.client_con = client_sock
                } else {
                    clinet_cons.push({
                        id: idStr,
                        ip: ipStr,
                        client_con: client_sock
                    })
                }
                result.clientArr.push({
                    id: idStr,
                    name: obj.data.name,
                    ip: ipStr,
                    is_vote: false,
                    is_speak: false,
                    is_die: false,
                    vote_num: 0
                })
                //人数不满
                if (result.clientArr.length < result.total) {
                    for (const item of result.clientArr) {
                        let socket = clinet_cons.find(s => s.id == item.id)
                        socket.client_con.write(JSON.stringify({ com: "i_ok", data: result }))
                    }
                    //满人开启
                } else {
                    let rand = new RAND();
                    rand.init(result.players)
                    let i_num = 1;
                    let r = ~~(Math.random() * WORDS.length)
                    let word = WORDS[r]
                    result.word = word
                    for (let item of result.clientArr) {
                        let index = rand.rand();
                        item.identity = IdentityArr[index]
                        item.status = ClientStatusEmun.LIVE
                        item.speaks = []
                        item.num = i_num
                        i_num++
                    }
                    let player = result.clientArr.find(s => s.identity != "BB")
                    for (const item of result.clientArr) {
                        let socket = clinet_cons.find(s => s.id == item.id)
                        socket.client_con.write(JSON.stringify({ com: "s_ok", data: { speak: player, room: result }, msg: `请玩家【${player.name}】开始发言...` }))
                    }
                }
                break;
            case "s":
                room = rooms.find(s => s.home_num == obj.data.room_num)
                if (room) {
                    let my = room.clientArr.find(s => s.ip == ipStr)
                    my.speaks = [...my.speaks, obj.data.str]
                    my.is_speak = true
                    let speak_player = room.clientArr.find(s => !s.is_speak)
                    let json =
                        speak_player
                            ? JSON.stringify({ com: "s_ok", data: { speak: speak_player, room: room }, msg: `请玩家【${speak_player.name}】开始发言...` })
                            : JSON.stringify({ com: "s_end", data: { speak: speak_player, room: room }, msg: `所有玩家发言结束，开始投票，请输入编号...` })
                    for (const item of room.clientArr) {
                        let socket = clinet_cons.find(s => s.id == item.id)
                        socket.client_con.write(json)
                    }
                }
                break;
            case "t":
                room = rooms.find(s => s.home_num == obj.data.room_num)
                if (room) {
                    let my = room.clientArr.find(s => s.ip == ipStr)
                    let vote_player = room.clientArr.find(s => s.num == obj.data.num)
                    vote_player.vote_num += 1
                    my.is_vote = true
                    my.is_speak = false
                    let names = room.clientArr.filter(s => !s.is_vote).map(c => `【${c.name}】`)
                    let json = JSON.stringify({ com: "t_ok", msg: `请等待${names.join(",")}投票...` })
                    for (const item of room.clientArr) {
                        let socket = clinet_cons.find(s => s.id == item.id)
                        socket.client_con.write(json)
                    }
                    let exists_no_vote = room.clientArr.find(s => !s.is_vote)
                    if (!exists_no_vote) {
                        room.clientArr.sort((x, y) => { return y.vote_num - x.vote_num })
                        let be_vote_player = room.clientArr[0]
                        be_vote_player.is_die = true;
                        be_vote_player.is_vote = true;
                        be_vote_player.is_speak = true;
                        let b_i = IdentityArr.indexOf(be_vote_player.identity)
                        room.players[b_i]--
                        if (room.players[0] <= room.players[1] && room.players[0] <= 1) {//卧底胜利
                            let json = JSON.stringify({
                                com: "game_end",
                                data: { room: room }, msg: `【${be_vote_player.name}】出局，卧底胜利，等待房主开启...`
                            })
                            for (const item of room.clientArr) {
                                let socket = clinet_cons.find(s => s.id == item.id)
                                socket.client_con.write(json)
                            }
                        } else if (room.players[1] <= 0 && room.players[2] <= 0) { //平民胜利
                            let json = JSON.stringify({
                                com: "game_end",
                                data: { room: room }, msg: `【${be_vote_player.name}】出局，平民胜利，等待房主开启...`
                            })
                            for (const item of room.clientArr) {
                                let socket = clinet_cons.find(s => s.id == item.id)
                                socket.client_con.write(json)
                            }
                        } else {//继续
                            let speak_player = room.clientArr.find(s => !s.is_speak)
                            let json = JSON.stringify({
                                com: "s_ok",
                                data: { t_end: true, speak: speak_player, room: room }, msg: `【${be_vote_player.name}】出局，请玩家【${speak_player.name}】开始发言...`
                            })
                            for (const item of room.clientArr) {
                                let socket = clinet_cons.find(s => s.id == item.id)
                                socket.client_con.write(json)
                            }
                        }
                    }
                }
                break;
            case "r":
                room = rooms.find(s => s.home_num == obj.data.room_num)
                let rand = new RAND();
                rand.init(room.players)
                let i_num = 1;
                let r = ~~(Math.random() * WORDS.length)
                let word = WORDS[r]
                room.word = word
                for (let item of room.clientArr) {
                    let index = rand.rand();
                    item.identity = IdentityArr[index]
                    item.status = ClientStatusEmun.LIVE
                    item.speaks = []
                    item.num = i_num
                    i_num++
                }
                let player = room.clientArr.find(s => s.identity != "BB")
                for (const item of room.clientArr) {
                    let socket = clinet_cons.find(s => s.id == item.id)
                    socket.client_con.write(JSON.stringify({ com: "s_ok", data: { speak: player, room: room }, msg: `请玩家【${player.name}】开始发言...` }))
                }
                break;
            case "e":
                room = rooms.find(s => s.home_num == obj.data.room_num)
                for (const item of room.clientArr) {
                    let socket = clinet_cons.find(s => s.id == item.id)
                    socket.client_con.write(JSON.stringify({ com: "e_ok", msg: "房主关闭房间，已退出..." }))
                    clinet_cons.filter(s => s.id != item.id)
                }
                rooms = rooms.filter(s => s.home_num != obj.data.room_num)
                break;
            default:
                break;
        }
    });
    client_sock.on("error", function (err) {
        console.log("error", err);
    });
});

// 当我开始监听的时候就会调用这个回掉函数
server.on("listening", function () {
    console.log("start listening...");
});


// 监听发生错误的时候调用
server.on("error", function () {
    console.log("listen error");
});

server.on("close", function () {
    console.log("server stop listener");
});
// node就会来监听我们的server,等待连接接入
server.listen({
    port: config.port,
    host: config.host,
    exclusive: true,
});

