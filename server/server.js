// 将net模块 引入进来
const net = require("net");
const IdentityEmun = {
    PM: "平民",
    WD: "卧底",
    BB: "白板"
}
const IdentityArr = ["PM", "WD", "BB"]
const ClientStatusEmun = {
    DIE: "死亡",
    LIVE: "存活"
}
const rooms = []
const clinet_cons = []
const RAND = require('../share/random')

const server = net.createServer(function (client_sock) {
    console.log("client comming", client_sock.remoteAddress, client_sock.remotePort);
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
    });
    client_sock.on("data", function (data) {
        let ipStr = client_sock.remoteAddress + ":" + client_sock.remotePort
        let obj = JSON.parse(data);
        switch (obj.com) {
            case "c":
                let group = {};
                let id = obj.data.name + 1
                group.clientArr = [{
                    id: id,
                    ip: ipStr,
                    name: obj.data.name,
                    is_speak: false
                }]
                group.home_ip = ipStr
                group.home_id = id
                group.home_num = rooms.length + 1
                group.players = obj.data.players
                group.total = ~~obj.data.players[0] + ~~obj.data.players[1] + ~~obj.data.players[2]
                let json = JSON.stringify({ com: "c_ok", data: group })
                client_sock.write(json)
                let exists_con = clinet_cons.find(s => s.ip == ipStr)
                if (exists_con) {
                    exists_con.id = idStr
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
                    client_sock.write(JSON.stringify({ com: "i_err", data: "没有找到该房间!" }))
                    return
                }
                if (result.total == result.clientArr.length) {
                    client_sock.write(JSON.stringify({ com: "i_err", data: "该房间人数已满!" }))
                    return
                }
                let idStr = obj.data.name + new Date().valueOf().toString();
                let exists_con2 = clinet_cons.find(s => s.ip == ipStr)
                if (exists_con2) {
                    exists_con2.id = idStr
                    exists_con2.client_con = client_sock
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
                    is_speak: false
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
                        socket.client_con.write(JSON.stringify({ com: "s_ok", data: { speak: player, players: result }, msg: `请玩家【${player.name}】开始发言...` }))
                    }
                }
                break;

            case "s":
                let room = rooms.find(s => s.home_num == obj.data.room_num)
                if (room) {
                    let my = room.clientArr.find(s => s.ip == ipStr)
                    my.speaks = [...my.speaks, obj.data.stringify]
                    my.is_speak = true
                    let speak_player = room.clientArr.find(s => !s.is_speak)
                    if (speak_player) {
                        for (const item of room.clientArr) {
                            let socket = clinet_cons.find(s => s.id == item.id)
                            if (speak_player) {
                                socket.client_con.write(JSON.stringify({ com: "s_ok", data: { speak: speak_player, players: rooms }, msg: `请玩家【${speak_player.name}】开始发言...` }))
                            }
                        }
                    } else {
                        for (const item of room.clientArr) {
                            let socket = clinet_cons.find(s => s.id == item.id)
                            if (speak_player) {
                                socket.client_con.write(JSON.stringify({ com: "s_end", data: { speak: speak_player, players: rooms }, msg: `所有玩家发言结束，开始投票，请输入编号...` }))
                            }
                        }
                    }

                }
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
    port: 3888,
    host: "127.0.0.1",
    exclusive: true,
});

